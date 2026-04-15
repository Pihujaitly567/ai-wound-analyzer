import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PlusCircle, Activity, ChevronRight, CheckCircle2 } from 'lucide-react';
import DashboardChart from '../components/DashboardChart';
import DailyChecklist from '../components/DailyChecklist';

export default function Dashboard() {
  const [wounds, setWounds] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWounds();
  }, []);

  const fetchWounds = async () => {
    try {
      const res = await axios.get('/api/wounds', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setWounds(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/auth');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    try {
      const res = await axios.post('/api/wounds', { title: newTitle }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate(`/wounds/${res.data._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const activeWounds = wounds.filter(w => w.status === 'Active');
  const healedWounds = wounds.filter(w => w.status === 'Healed');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Your Personal Wound Tracker</h1>
          <p className="text-health-600 font-medium mt-1 text-lg">Track and analyze your wound's healing progress</p>
        </div>
      </div>

      <div className="glass-card p-6 flex flex-col md:flex-row gap-6 items-center justify-between bg-gradient-to-r from-health-50 via-white to-indigo-50/50 shadow-glass border-white/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-health-200/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="z-10 w-full">
          <h3 className="font-bold text-xl text-slate-800 mb-1">Start a new analysis case</h3>
          <p className="text-sm text-slate-500 font-medium mb-4 md:mb-0">Please place a round coin (like a Quarter) near your wound for accurate cm² tracking.</p>
        </div>
        <div className="z-10 w-full flex justify-end">
        {isCreating ? (
          <form onSubmit={handleCreate} className="flex w-full md:w-auto gap-3">
            <input type="text" placeholder="e.g. Scraped knee" className="px-5 py-3 rounded-xl bg-white/80 border border-health-200 focus:outline-none focus:ring-4 focus:ring-health-100 font-medium placeholder:text-slate-400 w-full" value={newTitle} onChange={e=>setNewTitle(e.target.value)} autoFocus />
            <button type="submit" className="bg-health-500 hover:bg-health-600 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-md shrink-0">Start</button>
            <button type="button" onClick={()=>setIsCreating(false)} className="px-4 py-3 font-medium text-slate-400 hover:text-slate-600 transition-colors shrink-0">Cancel</button>
          </form>
        ) : (
          <button onClick={() => setIsCreating(true)} className="flex items-center justify-center gap-2 bg-gradient-to-r from-health-500 to-indigo-400 hover:from-health-600 hover:to-indigo-500 text-white px-6 py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full md:w-auto">
            <PlusCircle size={22} />
            <span>New Case</span>
          </button>
        )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <DashboardChart wounds={activeWounds} />
        </div>
        <div>
          <DailyChecklist wounds={activeWounds} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Activity size={24} className="text-health-500" /> Active Cases
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {activeWounds.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white/40 border border-dashed border-slate-300 rounded-2xl text-slate-400 font-medium">
              No active cases found. Start a new one above.
            </div>
          ) : (
            activeWounds.map(w => (
              <Link to={`/wounds/${w._id}`} key={w._id} className="glass-card p-6 hover:border-health-300 hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white/60">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-health-600 transition-colors flex items-center gap-2">
                    {w.title}
                  </h3>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${w.status === 'Active' ? 'bg-health-100 text-health-700 border border-health-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    {w.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500 mb-6 bg-slate-50 px-3 py-2 rounded-lg inline-block">
                  {w.woundType ? `Primary Tag: ${w.woundType}` : 'Awaiting first scan'}
                </p>
                <div className="text-sm font-medium text-slate-500 flex justify-between items-center border-t border-slate-100 pt-4">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> {w.checkins?.length || 0} Records</span>
                  <span className="flex items-center text-health-600 group-hover:translate-x-1 transition-transform">View Details <ChevronRight size={16}/></span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Past Records / Healed Wounds */}
      {healedWounds.length > 0 && (
        <div className="pt-8 border-t border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CheckCircle2 size={24} className="text-slate-400" /> Past Records
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-80 hover:opacity-100 transition-opacity">
            {healedWounds.map(w => (
              <Link to={`/wounds/${w._id}`} key={w._id} className="glass-card p-5 hover:border-slate-300 transition-all cursor-pointer group bg-slate-50/50 grayscale-[30%]">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2 truncate">
                    {w.title}
                  </h3>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-600 border border-slate-300 shrink-0">
                    {w.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 mb-4 bg-slate-100/50 px-2.5 py-1.5 rounded-lg inline-block">
                  {w.woundType ? `Tagged: ${w.woundType}` : 'No tag'}
                </p>
                <div className="text-xs font-semibold text-slate-500 border-t border-slate-200 pt-3 flex justify-between">
                  <span>{w.checkins?.length || 0} Scans</span>
                  <span className="group-hover:text-slate-700">View Archive &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
