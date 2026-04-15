const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jwt-simple');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// OpenRouter Free LLM API (no billing required, totally free meta/google models)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Groq API (fallback)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Gemini API (fallback)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Helper: call whichever LLM is available
async function callLLM(systemPrompt, userMessages) {
  // Try Gemini First (Fastest & Most reliable API)
  if (GEMINI_API_KEY) {
    const contents = userMessages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text || m.content || '' }] }));
    // Ensure first message is user
    if (contents.length > 0 && contents[0].role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: systemPrompt }] });
    }
    try {
      const res = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents
      }, { headers: { 'Content-Type': 'application/json' } });
      return res.data.candidates[0].content.parts[0].text;
    } catch (err) {
      console.error('Gemini call failed, falling back:', err?.response?.data || err.message);
    }
  }

  // Fallback to OpenRouter Free
  if (OPENROUTER_API_KEY) {
    const msgs = [{ role: 'system', content: systemPrompt }];
    userMessages.forEach(m => msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text || m.content || '' }));
    try {
      const res = await axios.post(OPENROUTER_URL, {
        model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
        messages: msgs,
      }, { headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } });
      return res.data.choices[0].message.content;
    } catch (err) {
      console.error('OpenRouter call failed:', err?.response?.data || err.message);
    }
  }
  
  return null; // No key available
}

// Helper: Analyze Image with Gemini Vision
async function analyzeImageWithGemini(imagePath) {
  if (!GEMINI_API_KEY) return null;
  try {
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = mimeMap[ext] || 'image/jpeg';
    const base64Image = fs.readFileSync(imagePath).toString('base64');
    
    const validClasses = ['Burns', 'Diabetic Wounds', 'Venous Wounds', 'Pressure Wounds', 'Normal Healing', 'Abrasions', 'Surgical Wounds'];
    const prompt = `You are an expert AI dermatologist. Analyze this wound image. First, identify the wound type. It MUST be EXACTLY one of these strings: [${validClasses.join(', ')}]. If unsure, pick the closest. Second, identify the risk category exactly as either "Risky" or "Mild". Third, provide a confidence score between 0.0 and 1.0. Respond ONLY with a valid JSON strictly following this schema: {"class": "WoundType", "category": "RiskyOrMild", "confidence": 0.95}`;

    const res = await axios.post(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Image } }
        ]
      }]
    }, { headers: { 'Content-Type': 'application/json' } });
    
    const text = res.data.candidates[0].content.parts[0].text;
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Gemini Vision Error:', err?.response?.data || err.message);
    return null;
  }
}
const User = require('./models/User');
const WoundHistory = require('./models/WoundHistory');
const knowledgeBase = require('./knowledgeBase');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const JWT_SECRET = 'woundiq-super-secret-key-2026';
const AI_SERVICE_URL = 'http://127.0.0.1:5000/predict';

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/woundiq')
  .then(() => console.log('MongoDB Connected to WoundIQ'))
  .catch(err => console.log('MongoDB connection error (start mongodb if you havent):', err));

const upload = multer({ dest: 'uploads/' });

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes - Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    
    const token = jwt.encode({ id: user._id }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.encode({ id: user._id }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } });
});

// Routes - Wounds
app.get('/api/wounds', authMiddleware, async (req, res) => {
  try {
    const wounds = await WoundHistory.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json(wounds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wounds/:id', authMiddleware, async (req, res) => {
  try {
    const wound = await WoundHistory.findOne({ _id: req.params.id, userId: req.user._id });
    if (!wound) return res.status(404).json({ error: 'Not found' });
    res.json(wound);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wounds', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const wound = new WoundHistory({ userId: req.user._id, title });
    await wound.save();
    res.json(wound);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/wounds/:id/status', authMiddleware, async (req, res) => {
  try {
    const wound = await WoundHistory.findOne({ _id: req.params.id, userId: req.user._id });
    if (!wound) return res.status(404).json({ error: 'Not found' });
    if (req.body.status) {
      wound.status = req.body.status;
      wound.updatedAt = Date.now();
      await wound.save();
    }
    res.json(wound);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new Checkin (Image Upload + AI Request)
app.post('/api/wounds/:id/checkin', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const wound = await WoundHistory.findOne({ _id: req.params.id, userId: req.user._id });
    if (!wound) return res.status(404).json({ error: 'Not found' });
    
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    // Send image to Python AI Service
    const form = new FormData();
    form.append('image', fs.createReadStream(req.file.path));
    
    let aiResult;
    try {
      const response = await axios.post(AI_SERVICE_URL, form, {
        headers: { ...form.getHeaders() }
      });
      aiResult = response.data;
    } catch (aiErr) {
      console.error('AI Service Error:', aiErr.message);
      return res.status(500).json({ error: 'AI classification service is currently unavailable.' });
    }

    // OVERRIDE Python classification with native Gemini Multimodal Vision
    const geminiResult = await analyzeImageWithGemini(req.file.path);
    if (geminiResult && geminiResult.class) {
      console.log('Gemini Analysis Override Success:', geminiResult);
      aiResult.class = geminiResult.class;
      aiResult.category = geminiResult.category;
      aiResult.confidence = geminiResult.confidence;
    }

    // Prepare enriched data from Knowledge Base (Case Insensitive)
    const matchedKey = aiResult.class ? Object.keys(knowledgeBase).find(k => k.toLowerCase() === aiResult.class.toLowerCase()) || aiResult.class : null;
    const kbData = matchedKey ? knowledgeBase[matchedKey] || {} : {};
    const mode = req.body.mode || 'static';
    
    let dynamicText = null;
    if (mode === 'dynamic') {
      const sysPrompt = 'You are Dr. Robot, an empathetic AI wound care assistant in the WoundIQ app.';
      const prompt = `The deep learning vision model just classified the user's uploaded wound image as "${aiResult.class}" (Category: ${aiResult.category}). Write a short, empathetic 2-3 sentence introduction to the user. Reassure them, explain the classification simply, and ask them how they are feeling today so we can start our medical chat. Keep it friendly but professional.`;
      try {
        dynamicText = await callLLM(sysPrompt, [{ role: 'user', text: prompt }]);
      } catch (e) {
        console.error('LLM Error:', e.response?.data || e.message);
      }
      if (!dynamicText) {
        dynamicText = `Hello! Based on our analysis, your wound appears to be ${aiResult.class?.toLowerCase()}. I understand this might concern you — please rest assured that this is a ${aiResult.category?.toLowerCase() === 'risky' ? 'condition we can manage carefully' : 'normal part of the healing process'}. How are you feeling today?`;
      }
    }

    const newCheckin = {
      imagePath: req.file.path, // In a real app we'd upload to S3, here we just keep the local path
      heatmapBase64: aiResult.heatmapBase64 || '',
      predictedClass: aiResult.class,
      woundAreaPixels: aiResult.estimatedArea || 0,
      woundAreaCm2: aiResult.estimatedCm2 || null,
      confidence: aiResult.confidence,
      category: aiResult.category,
      notes: req.body.notes || '',
      dynamicAnalysis: dynamicText,
      remedies: kbData.remedies || [],
      cleaning: kbData.cleaning || '',
      doctor: kbData.doctor || '',
      estimatedHealing: kbData.estimatedHealing || ''
    };

    // If this is the first checkin, establish primary wound type
    if (wound.checkins.length === 0) {
      wound.woundType = aiResult.class;
    }

    wound.checkins.push(newCheckin);
    wound.updatedAt = Date.now();
    await wound.save();

    res.json({ wound, newCheckin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Active Learning Feedback endpoint
app.put('/api/wounds/:id/checkin/:checkinId/feedback', authMiddleware, async (req, res) => {
  try {
    const wound = await WoundHistory.findOne({ _id: req.params.id, userId: req.user._id });
    if (!wound) return res.status(404).json({ error: 'Wound case not found' });
    
    // Find specific checkin
    const checkin = wound.checkins.id(req.params.checkinId);
    if (!checkin) return res.status(404).json({ error: 'Checkin not found' });
    
    // Save the user's correction to train the ML model later
    checkin.userCorrection = req.body.correction;
    wound.updatedAt = Date.now();
    await wound.save();
    
    res.json(checkin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conversational AI Real/Mock Endpoint
app.post('/api/wounds/:id/chat', authMiddleware, async (req, res) => {
  try {
    const { messages } = req.body;
    
    // Fetch user and wound details for dynamic context
    const wound = await WoundHistory.findOne({ _id: req.params.id, userId: req.user._id });
    if (!wound) return res.status(404).json({ error: 'Wound not found' });
    
    const userName = req.user.name || 'User';
    const woundType = wound.woundType || 'Unknown Wound';
    const numCheckins = wound.checkins.length;
    
    let latestCheckinText = "No check-ins yet.";
    if (numCheckins > 0) {
      const latest = wound.checkins[numCheckins - 1];
      latestCheckinText = `Latest Check-in: Classified as "${latest.predictedClass}" (Category: ${latest.category}) with ${latest.confidence?.toFixed(1) || 'unknown'}% confidence.`;
    }

    // Stringify KnowledgeBase for RAG
    const ragContext = JSON.stringify(knowledgeBase);
    
    // System prompt for the chat (RAG enforced + Dynamic Context injected)
    const sysPrompt = `You are Dr. Robot, an empathetic and highly knowledgeable AI wound care assistant in an app called WoundIQ.
You are currently talking to a patient named ${userName}.
Patient Context: They are tracking a wound classified generally as "${woundType}". They have made ${numCheckins} check-ins.
${latestCheckinText}

Your job is to answer their follow up questions in a wildly empathetic, detailed, but easily understandable manner. Address them by name occasionally. Keep replies concise (under 150 words). 
IMPORTANT: You must base any specific medical, cleaning, or doctor recommendations STRICTLY on the following clinical guidelines context. Do not hallucinate treatments outside this context. If confidence is uncertain in their scan, reassure them.

<CONTEXT>
${ragContext}
</CONTEXT>`;

    // Try dynamic LLM first (OpenRouter, Gemini, or Groq)
    try {
      const dynamicReply = await callLLM(sysPrompt, messages);
      if (dynamicReply) {
        return res.json({ reply: dynamicReply });
      }
    } catch (llmErr) {
      console.error('Dynamic LLM Error:', llmErr.response?.data || llmErr.message);
      // Fall through to offline fallback if the API fails
    }

    // Intelligent Offline Fallback
    const lastMessage = messages[messages.length - 1].text.toLowerCase();
    let reply;
    
    if (lastMessage.includes('pain') || lastMessage.includes('hurt') || lastMessage.includes('ache') || lastMessage.includes('sore')) {
      reply = "I'm really sorry to hear you're in pain. Pain is your body's way of telling you it's working hard to heal. Here are some things you can do right now:\n\n• Apply a cold compress for 10-15 minutes to reduce swelling\n• Take an over-the-counter pain reliever like Ibuprofen (if you're not allergic)\n• Keep the wound elevated above heart level if possible\n• Avoid touching or pressing on the wound area\n\nIf the pain is severe, throbbing, or getting worse over time, please see a doctor as soon as possible. Is there anything else I can help with?";
    } else if (lastMessage.includes('clean') || lastMessage.includes('wash') || lastMessage.includes('disinfect')) {
      reply = "Great question! Proper cleaning is crucial for healthy healing. Here's a step-by-step guide:\n\n1. Wash your hands thoroughly with soap before touching the wound\n2. Gently rinse the wound under clean, lukewarm running water for 1-2 minutes\n3. Use a mild soap around (not directly in) the wound\n4. Pat dry with a clean, soft cloth — never rub!\n5. Apply a thin layer of antibiotic ointment like Neosporin\n6. Cover with a sterile bandage\n\n⚠️ Avoid using hydrogen peroxide or rubbing alcohol directly on the wound — they can damage new healing tissue. How often should you clean it? At least once daily, or whenever the bandage gets wet or dirty.";
    } else if (lastMessage.includes('doctor') || lastMessage.includes('hospital') || lastMessage.includes('emergency') || lastMessage.includes('specialist')) {
      reply = "That's a very responsible question. Here are the signs that mean you should see a doctor:\n\n🚨 Go to the ER immediately if:\n• The wound won't stop bleeding after 10 minutes of pressure\n• You can see bone, muscle, or deep tissue\n• The wound was caused by an animal bite or rusty object\n\n⚠️ See your doctor soon if:\n• Red streaks spreading from the wound\n• Pus or foul-smelling discharge\n• Fever above 100.4°F (38°C)\n• Increasing pain, swelling, or redness after 48 hours\n\nFor wound-specific care, a Dermatologist or Wound Care Specialist would be ideal. Would you like advice on anything else?";
    } else if (lastMessage.includes('heal') || lastMessage.includes('recover') || lastMessage.includes('how long') || lastMessage.includes('time')) {
      reply = "Healing time depends on the type and severity of the wound, but here's a general guide:\n\n• Minor cuts/scrapes: 3-7 days\n• Deeper cuts: 1-3 weeks\n• Burns (1st degree): 1-2 weeks\n• Burns (2nd/3rd degree): weeks to months\n• Surgical wounds: 2-6 weeks\n\nTo speed up healing:\n✅ Eat protein-rich foods (eggs, chicken, fish)\n✅ Stay well hydrated\n✅ Get plenty of sleep\n✅ Keep the wound moist with ointment\n✅ Don't pick at scabs!\n\nWould you like more specific advice based on your wound type?";
    } else if (lastMessage.includes('infect') || lastMessage.includes('pus') || lastMessage.includes('red') || lastMessage.includes('swollen') || lastMessage.includes('fever')) {
      reply = "I understand your concern about infection — it's important to catch it early! Here are the key signs to watch for:\n\n🔴 Signs of infection:\n• Increased redness or warmth around the wound\n• Swelling that's getting worse\n• Yellow/green pus or discharge\n• Foul smell from the wound\n• Fever or chills\n• Red streaks radiating from the wound\n\nIf you're noticing ANY of these symptoms, please see a healthcare provider as soon as possible. In the meantime, keep the wound clean and covered. Do NOT try to squeeze out pus — let a professional handle it.";
    } else if (lastMessage.includes('bandage') || lastMessage.includes('cover') || lastMessage.includes('wrap') || lastMessage.includes('dressing')) {
      reply = "Keeping your wound properly covered is really important for healing! Here's my advice:\n\n• Use a sterile, non-stick bandage pad directly over the wound\n• Secure it with medical tape or a self-adhesive wrap\n• Change the bandage at least once daily, or when it gets wet/dirty\n• Apply a thin layer of antibiotic ointment before re-covering\n• Make sure the bandage isn't too tight — you need good blood flow!\n\nPro tip: Let the wound breathe for a few minutes during bandage changes before applying a new one. Is there anything else you'd like to know?";
    } else if (lastMessage.includes('scar') || lastMessage.includes('mark')) {
      reply = "I completely understand the concern about scarring. Here are some tips to minimize it:\n\n• Keep the wound moist with petroleum jelly or silicone-based scar sheets\n• Protect it from sun exposure (UV light darkens scars)\n• Gently massage the area once healed to break up scar tissue\n• Consider vitamin E oil or aloe vera gel\n• For deeper wounds, ask your doctor about silicone scar strips\n\nRemember, most scars fade significantly over 6-12 months. Be patient with your body! Would you like any other advice?";
    } else if (lastMessage.includes('thank') || lastMessage.includes('thanks') || lastMessage.includes('helpful')) {
      reply = "You're so welcome! 💚 I'm always here whenever you need guidance on your healing journey. Remember:\n\n• Keep your wound clean and covered\n• Watch for any signs of infection\n• Don't hesitate to see a doctor if something feels off\n• Upload a new photo tomorrow so we can track your progress!\n\nTake care of yourself, and rest well tonight! 🌙";
    } else if (lastMessage.includes('hello') || lastMessage.includes('hi') || lastMessage.includes('hey') || lastMessage.includes('hii')) {
      reply = "Hello there! 👋 I'm Dr. Robot, your personal wound care assistant here at WoundIQ. I'm here to help you understand your wound and guide you through the healing process.\n\nYou can ask me about:\n• 🩹 How to clean your wound properly\n• 💊 Pain management tips\n• 🏥 When to see a doctor\n• ⏱️ How long healing might take\n• 🔍 Signs of infection to watch for\n• 🩹 Bandaging and wound care\n\nWhat would you like to know?";
    } else {
      reply = "That's a great question! Based on general wound care best practices, here's what I'd recommend:\n\n1. Keep the wound area clean and dry\n2. Change your bandage daily\n3. Monitor for any changes in color, swelling, or discharge\n4. Stay hydrated and eat nutritious foods to support healing\n5. Get adequate rest — your body heals fastest during sleep\n\nIf you have specific concerns about pain, cleaning, infection signs, or when to see a doctor, feel free to ask me directly! I'm here to help. 💚";
    }
    
    setTimeout(() => {
      res.json({ reply });
    }, 800);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`WoundIQ Node server running on port ${PORT}`);
});
