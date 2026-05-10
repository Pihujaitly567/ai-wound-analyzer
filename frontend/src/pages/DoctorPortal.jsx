import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, AlertCircle, Clock, Search, ShieldAlert, FileText, ChevronRight } from 'lucide-react';

export default function DoctorPortal() {
  const [wounds, setWounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminWounds = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role !== 'doctor') {
          navigate('/');
          return;
        }

        const res = await axios.get('/api/admin/wounds', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setWounds(res.data);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) navigate('/');
        console.error("Error fetching admin wounds", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminWounds();
  }, [navigate]);

  const filteredWounds = wounds.filter(w => 
    w.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (w.userId?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-indigo-500" size={36} />
            Doctor Portal
          </h1>
          <p className="text-slate-500 font-medium text-lg mt-1">
            Global view of active "Risky" patient cases requiring professional attention.
          </p>
        </div>
      </div>

      <div className="glass-card p-2 md:p-4 bg-white/70 shadow-xl border-t-4 border-t-indigo-500">
        <div className="flex flex-col md:flex-row gap-4 mb-6 px-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by patient name or case title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-700"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 animate-pulse text-indigo-500 font-bold text-xl">Loading patient cases...</div>
        ) : filteredWounds.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300 mx-4 mb-4">
            <ShieldCheck size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-600">No Risky Cases</h3>
            <p className="text-slate-500 font-medium mt-2">There are currently no active patient cases flagged as risky.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 pb-4">
            {filteredWounds.map(wound => {
              const latestCheckin = wound.checkins[wound.checkins.length - 1];
              return (
                <div 
                  key={wound._id} 
                  onClick={() => navigate(`/wounds/${wound._id}`)}
                  className="bg-white border border-slate-200 hover:border-indigo-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle size={14} /> Critical Review
                      </span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Clock size={14} /> {new Date(wound.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-extrabold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                      {wound.title}
                    </h3>
                    
                    <div className="text-sm font-medium text-slate-600 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {wound.userId?.name?.charAt(0) || '?'}
                      </div>
                      Patient: {wound.userId?.name || 'Unknown'}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                      <p className="text-sm font-bold text-slate-700 mb-1">Latest AI Classification:</p>
                      <p className="text-indigo-600 font-bold">{latestCheckin?.predictedClass} <span className="text-slate-400 font-medium text-xs">({latestCheckin?.confidence?.toFixed(1)}%)</span></p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100">
                    <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
                      <FileText size={16} /> {wound.checkins.length} Check-ins
                    </span>
                    <button className="text-indigo-500 font-bold text-sm flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                      Review Case <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
