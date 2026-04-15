import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Bot } from 'lucide-react';
import axios from 'axios';

export default function ChatWidget({ woundId, initialMessage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: initialMessage || "Hello! I've analyzed your evaluation. How are you feeling today or what questions do you have about your recovery?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const newMessages = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`/api/wounds/${woundId}/chat`, {
        messages: newMessages
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setMessages([...newMessages, { role: 'assistant', text: res.data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { role: 'assistant', text: "I'm sorry, I am having trouble connecting to my medical database right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const chatUI = (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999 }}
        className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 hover:scale-110 active:scale-95 transition-all rounded-full shadow-[0_4px_20px_rgba(79,70,229,0.5)] flex items-center justify-center text-white cursor-pointer group"
      >
        <Bot size={32} className="group-hover:rotate-12 transition-transform" />
      </button>

      {isOpen && (
        <div 
          style={{ position: 'fixed', bottom: '100px', right: '24px', zIndex: 99999, width: 'min(90vw, 400px)' }}
          className="glass-card flex flex-col h-[500px] border border-white/60 shadow-2xl"
        >
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-4 rounded-t-2xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2"><Bot size={22} /> WoundIQ Assistant</div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white font-bold text-xl px-2">&times;</button>
          </div>
          
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="bg-indigo-100 p-2 rounded-full h-fit text-indigo-600 shrink-0">
                <Bot size={18} />
              </div>
            )}
            <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm font-medium ${m.role === 'user' ? 'bg-indigo-500 text-white rounded-br-sm' : 'bg-health-50 text-slate-800 rounded-bl-sm border border-health-100'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="bg-indigo-100 p-2 rounded-full h-fit text-indigo-600">
              <Bot size={18} />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-health-50 text-slate-500 rounded-bl-sm border border-health-100 text-sm flex items-center gap-2">
              <span className="animate-pulse">●</span><span className="animate-pulse delay-100">●</span><span className="animate-pulse delay-200">●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 rounded-b-2xl flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Dr. Robot..." 
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400 font-medium"
        />
        <button type="submit" disabled={loading || !input.trim()} className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white p-3 rounded-xl transition-all h-full flex items-center justify-center">
          <Send size={18} />
        </button>
      </form>
        </div>
      )}
    </>
  );

  return createPortal(chatUI, document.body);
}
