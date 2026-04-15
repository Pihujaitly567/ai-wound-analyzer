import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Camera, Image as ImageIcon, Send, Clock, ShieldCheck, AlertCircle, Bot, Download, CheckCircle, RotateCcw } from 'lucide-react';
import ChatWidget from '../components/ChatWidget';
import TelehealthCard from '../components/TelehealthCard';
import ImageComparisonSlider from '../components/ImageComparisonSlider';
import html2pdf from 'html2pdf.js';

export default function WoundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [wound, setWound] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState('static'); // 'static' or 'dynamic'
  const [heatmapToggles, setHeatmapToggles] = useState({});
  const [feedbackState, setFeedbackState] = useState({});
  const [feedbackSelection, setFeedbackSelection] = useState({});
  const CLASSES = ["Abrasions", "Bruises", "Burns", "Cut", "Diabetic Wounds", "Laseration", "Normal", "Pressure Wounds", "Surgical Wounds", "Venous Wounds"];

  useEffect(() => {
    const fetchWound = async () => {
      try {
        const res = await axios.get(`/api/wounds/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setWound(res.data);
      } catch (err) {
        if (err.response?.status === 401) navigate('/auth');
      }
    };
    fetchWound();
  }, [id, navigate]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('mode', analysisMode);

    try {
      const res = await axios.post(`/api/wounds/${id}/checkin`, formData, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      // Update wound timeline
      setWound(res.data.wound);
      setFile(null);
      setPreview(null);
      setIsCapturing(false);
    } catch (err) {
      console.error(err);
      alert('Error analyzing image');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    const opt = {
      margin:       0.5,
      filename:     `${wound.title.replace(/\s+/g, '_')}_HealthReport.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const toggleStatus = async () => {
    try {
      const newStatus = wound.status === 'Active' ? 'Healed' : 'Active';
      const res = await axios.put(`/api/wounds/${id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setWound(res.data);
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    }
  };

  const submitFeedback = async (checkinId) => {
    try {
      setFeedbackState(prev => ({ ...prev, [checkinId]: 'submitting' }));
      const correction = feedbackSelection[checkinId] || wound.checkins.find(c => c._id === checkinId)?.predictedClass;
      const res = await axios.put(`/api/wounds/${id}/checkin/${checkinId}/feedback`, { correction }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setWound(prev => ({
        ...prev,
        checkins: prev.checkins.map(c => c._id === checkinId ? res.data : c)
      }));
      setFeedbackState(prev => ({ ...prev, [checkinId]: 'done' }));
    } catch (err) {
      console.error(err);
      setFeedbackState(prev => ({ ...prev, [checkinId]: 'open' }));
      alert('Error saving feedback');
    }
  };

  if (!wound) return <div className="text-center py-20 animate-pulse text-health-500 font-bold text-xl">Loading patient record...</div>;

  const latestCheckin = wound.checkins && wound.checkins.length > 0 ? wound.checkins[wound.checkins.length - 1] : null;
  const isRisky = latestCheckin?.category === 'Risky';
  const hasMultipleCheckins = wound.checkins && wound.checkins.length >= 2;

  // Assuming backend is on port 3000 and serves uploads
  const backendUrl = 'http://localhost:3000/';

  const toggleHeatmap = (checkinId) => {
    setHeatmapToggles(prev => ({ ...prev, [checkinId]: !prev[checkinId] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            {wound.status === 'Healed' && <CheckCircle className="text-health-500" size={32} />}
            {wound.title}
          </h1>
          <p className="text-health-600 font-medium text-lg mt-1 flex items-center gap-2">
            Current Status: <span className={`px-3 py-1 text-sm rounded-full ${wound.status === 'Active' ? 'bg-indigo-100 text-indigo-700' : 'bg-health-100 text-health-700'}`}>{wound.status}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button onClick={toggleStatus} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md text-sm ${wound.status === 'Active' ? 'bg-health-100 text-health-700 hover:bg-health-200 hover:shadow-lg transform hover:-translate-y-0.5 border border-health-200' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'}`}>
            {wound.status === 'Active' ? <><CheckCircle size={18} /> Mark as Healed</> : <><RotateCcw size={18} /> Reopen Case</>}
          </button>
          <button onClick={handleExportPDF} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md text-sm">
            <Download size={18} /> Export PDF Report
          </button>
        </div>
      </div>

      {isRisky && <TelehealthCard />}

      {hasMultipleCheckins && (
        <ImageComparisonSlider 
          beforeImage={`${backendUrl}${wound.checkins[0].imagePath}`}
          afterImage={`${backendUrl}${latestCheckin.imagePath}`}
          beforeDate={new Date(wound.checkins[0].date).toLocaleDateString([], { month: 'short', day: 'numeric'})}
          afterDate={new Date(latestCheckin.date).toLocaleDateString([], { month: 'short', day: 'numeric'})}
        />
      )}

      {/* New Analysis Panel */}
      <div className="glass-card p-6 md:p-8 bg-white/70 shadow-xl border-t-4 border-t-health-500 relative overflow-hidden">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 relative z-10 flex items-center gap-2">
          <Camera className="text-health-500" /> New Evaluation
        </h2>

        {!isCapturing ? (
          <div className="flex flex-col sm:flex-row gap-4 relative z-10">
            <button onClick={() => setIsCapturing(true)} className="flex-1 bg-gradient-to-br from-health-50 to-health-100 hover:from-health-100 hover:to-health-200 border-2 border-dashed border-health-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all group">
              <div className="bg-white p-4 rounded-full shadow-sm text-health-500 group-hover:scale-110 transition-transform">
                <Camera size={32} />
              </div>
              <span className="font-bold text-health-700">Add New Photo</span>
            </button>
          </div>
        ) : (
          <div className="relative z-10 space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
            {!preview ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex-1 cursor-pointer bg-white border border-health-200 hover:border-health-400 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all shadow-sm hover:shadow-md">
                  <Camera size={32} className="text-health-500" />
                  <span className="font-bold text-slate-700">Take Photo</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                </label>
                <label className="flex-1 cursor-pointer bg-white border border-health-200 hover:border-health-400 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all shadow-sm hover:shadow-md">
                  <ImageIcon size={32} className="text-indigo-400" />
                  <span className="font-bold text-slate-700">Gallery</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            ) : (
              <div className="space-y-6">
                <img src={preview} alt="Preview" className="w-full max-h-80 object-cover rounded-2xl shadow-md border-4 border-white" />
                
                {/* AI Choice */}
                <div className="bg-white p-5 rounded-xl border border-health-100 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Bot className="text-indigo-500"/> Select AI Engine</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className={`flex-1 cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${analysisMode === 'static' ? 'border-health-500 bg-health-50' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" name="mode" value="static" className="mt-1" checked={analysisMode === 'static'} onChange={() => setAnalysisMode('static')} />
                      <div>
                        <div className="font-bold text-slate-800">Static Medical Rules</div>
                        <div className="text-xs text-slate-500 font-medium">Pre-written reliable healthcare guidance.</div>
                      </div>
                    </label>
                    <label className={`flex-1 cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${analysisMode === 'dynamic' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" name="mode" value="dynamic" className="mt-1" checked={analysisMode === 'dynamic'} onChange={() => setAnalysisMode('dynamic')} />
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">Dynamic Generative AI <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full">New</span></div>
                        <div className="text-xs text-slate-500 font-medium">Personalized deep analysis using LLM logic.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={handleUpload} disabled={loading} className="flex-1 bg-gradient-to-r from-health-500 to-indigo-500 hover:from-health-600 hover:to-indigo-600 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                    {loading ? <span className="animate-spin border-2 border-white/30 border-t-white w-5 h-5 rounded-full" /> : <Send size={20} />} 
                    {loading ? 'Analyzing...' : 'Analyze Image'}
                  </button>
                  <button onClick={() => { setPreview(null); setFile(null); setIsCapturing(false); }} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Timeline for PDF */}
      <div id="report-content" className="bg-slate-50 p-6 rounded-2xl">
        <h3 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-2">
          <Clock className="text-indigo-400" /> Progress Timeline
        </h3>
        
        <div className="relative border-l-2 border-health-200 ml-4 space-y-10 pb-10">
          {wound.checkins && wound.checkins.length > 0 ? (
            wound.checkins.slice().reverse().map((chk, i) => (
              <div key={chk._id || i} className="relative pl-8">
                {/* Timeline Dot */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-health-400 border-4 border-white shadow-sm"></div>
                
                <div className="glass-card bg-white/80 p-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  
                  {/* Photo & X-Ray Viewer */}
                  {chk.imagePath && (
                    <div className="relative group w-full bg-slate-200">
                      {chk.heatmapBase64 && heatmapToggles[chk._id] ? (
                        <img 
                          src={chk.heatmapBase64} 
                          alt="Grad-CAM X-Ray Heatmap" 
                          className="w-full h-64 object-cover object-center transition-opacity duration-300"
                        />
                      ) : (
                        <img 
                          src={`${backendUrl}${chk.imagePath}`} 
                          alt="Wound Analysis" 
                          className="w-full h-64 object-cover object-center transition-opacity duration-300" 
                        />
                      )}
                      
                      {chk.heatmapBase64 && (
                        <button 
                          onClick={() => toggleHeatmap(chk._id)}
                          className={`absolute bottom-4 right-4 text-xs font-bold px-4 py-2 rounded-xl backdrop-blur-md transition-all shadow-lg border z-10 ${heatmapToggles[chk._id] ? 'bg-indigo-600/90 text-white border-indigo-400 drop-shadow-[0_0_10px_rgba(79,70,229,0.8)]' : 'bg-slate-900/70 text-white border-slate-600 hover:bg-slate-800'}`}
                        >
                          {heatmapToggles[chk._id] ? '👀 View Original' : '🔥 AI X-Ray'}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between mb-4">
                    <span className="text-sm font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full w-max">
                      {new Date(chk.date).toLocaleDateString()} at {new Date(chk.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span className={`text-sm font-bold mt-2 md:mt-0 ${chk.category === 'Risky' ? 'text-rose-500 flex items-center gap-1' : 'text-health-600 flex items-center gap-1'}`}>
                      {chk.category === 'Risky' ? <AlertCircle size={16}/> : <ShieldCheck size={16}/>}
                      {chk.category} ({chk.confidence?.toFixed(1) || 0}%)
                    </span>
                  </div>
                  
                  <h4 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center justify-between">
                    <span>{chk.predictedClass}</span>
                  </h4>
                  
                  {/* Human-in-the-loop Active Learning Widget */}
                  {!chk.userCorrection && feedbackState[chk._id] !== 'done' && (
                    <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Bot size={18} className="text-slate-400" /> Did the AI identify this correctly?
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <select 
                          className="text-sm p-1.5 rounded-lg border border-slate-300 bg-white shadow-sm flex-1 md:w-48 outline-none focus:ring-2 focus:ring-indigo-500"
                          value={feedbackSelection[chk._id] || chk.predictedClass}
                          onChange={(e) => setFeedbackSelection(prev => ({...prev, [chk._id]: e.target.value}))}
                        >
                          <option value={chk.predictedClass}>Yes, {chk.predictedClass}</option>
                          <optgroup label="No, correct it to:">
                            {CLASSES.filter(c => c !== chk.predictedClass).map(c => <option key={c} value={c}>{c}</option>)}
                          </optgroup>
                        </select>
                        <button 
                          onClick={() => submitFeedback(chk._id)}
                          disabled={feedbackState[chk._id] === 'submitting'}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                        >
                          {feedbackState[chk._id] === 'submitting' ? '...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}

                  {chk.userCorrection && (
                    <div className="mb-6 bg-health-50 border border-health-200 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-health-700">
                      <CheckCircle size={14} className="shrink-0" /> Doctor manually approved/corrected AI to: {chk.userCorrection}. Data logged for future training!
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {chk.dynamicAnalysis ? (
                      <div className="col-span-full bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                        <p className="text-slate-700 italic flex items-start gap-3 leading-relaxed">
                          <Bot className="shrink-0 text-indigo-500" size={20} />
                          {chk.dynamicAnalysis}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-health-50/50 p-4 rounded-xl border border-health-100">
                          <strong className="block text-health-800 mb-2 truncate text-sm">Recommended Action</strong>
                          <ul className="list-disc pl-5 text-sm space-y-1 text-slate-700 font-medium">
                            {chk.remedies?.map((r,idx) => <li key={idx}>{r}</li>)}
                          </ul>
                        </div>
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                          <strong className="block text-indigo-800 mb-2 text-sm">Cleaning Protocol</strong>
                          <p className="text-sm text-slate-700 font-medium">{chk.cleaning}</p>
                        </div>
                        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                          <strong className="block text-rose-800 mb-2 text-sm">Medical Specialist</strong>
                          <p className="text-sm text-slate-700 font-medium">{chk.doctor}</p>
                        </div>
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                          <strong className="block text-amber-800 mb-2 text-sm">Est. Healing Time</strong>
                          <p className="text-sm text-slate-700 font-medium">{chk.estimatedHealing}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
            <div className="pl-8 text-slate-400 font-medium">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-200 border-4 border-white"></div>
              Upload the first image to start tracking the wound.
            </div>
          )}
        </div>
      </div>

      {/* AI Chat Widget */}
      {wound.checkins && wound.checkins.length > 0 && (
        <ChatWidget 
          key={wound.checkins.length}
          woundId={wound._id} 
          initialMessage={wound.checkins[wound.checkins.length - 1].dynamicAnalysis || "Hello! I'm your AI care assistant. How are you feeling today?"} 
        />
      )}
    </div>
  );
}
