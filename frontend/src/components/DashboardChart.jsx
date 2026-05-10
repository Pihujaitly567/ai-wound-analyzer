import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Activity, ChevronDown } from 'lucide-react';

export default function DashboardChart({ wounds }) {
  const activeWounds = wounds.filter(w => w.checkins && w.checkins.length > 0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  if (activeWounds.length === 0) {
    return null;
  }

  const mainWound = activeWounds[selectedIndex] || activeWounds[0]; 
  
  const hasCm2 = mainWound.checkins.some(chk => chk.woundAreaCm2 != null);

  const chartData = [...mainWound.checkins].reverse().map(chk => {
    let healthScore = 100;
    if (chk.category === 'Risky') healthScore = 100 - chk.confidence;
    if (chk.category?.includes('Moderate')) healthScore = 50 + (100 - chk.confidence)/2;
    if (chk.category === 'Healing') healthScore = chk.confidence > 50 ? chk.confidence : 50;

    return {
      date: new Date(chk.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      score: Math.round(healthScore),
      category: chk.category,
      area: hasCm2 ? (chk.woundAreaCm2 || 0) : (chk.woundAreaPixels || 0)
    };
  });

  if (chartData.length < 2) {
    return (
      <div className="glass-card p-6 bg-white/60 mb-8 border border-white">
         <div className="flex items-center gap-3 text-slate-800 font-bold text-lg mb-2">
            <Activity className="text-health-500" /> Recovery Trajectory: <span className="text-health-600">{mainWound.title}</span>
         </div>
         {activeWounds.length > 1 && (
           <div className="mb-3">
             <select 
               value={selectedIndex} 
               onChange={e => setSelectedIndex(Number(e.target.value))}
               className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-health-200"
             >
               {activeWounds.map((w, i) => <option key={w._id} value={i}>{w.title}</option>)}
             </select>
           </div>
         )}
         <p className="text-slate-500 font-medium text-sm">Upload another photo tomorrow to start seeing your AI-generated healing curve!</p>
      </div>
    );
  }

  const latestScore = chartData[chartData.length - 1].score;
  const previousScore = chartData[chartData.length - 2].score;
  const isImproving = latestScore >= previousScore;

  return (
    <div className="glass-card p-6 md:p-8 bg-white/70 mb-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-health-400 to-indigo-400"></div>
      
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4 px-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-1">
            <Activity className="text-indigo-500" /> Recovery Trajectory
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">Tracking AI Health Score for:</span>
            {activeWounds.length > 1 ? (
              <div className="relative inline-block">
                <select 
                  value={selectedIndex} 
                  onChange={e => setSelectedIndex(Number(e.target.value))}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-white border border-health-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-health-200 cursor-pointer hover:border-health-400 transition-colors"
                >
                  {activeWounds.map((w, i) => <option key={w._id} value={i}>{w.title}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <strong className="text-slate-700">{mainWound.title}</strong>
            )}
          </div>
        </div>
        
        <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold ${isImproving ? 'bg-health-100 text-health-700 border border-health-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
          <TrendingUp size={18} className={!isImproving ? 'rotate-180' : ''} />
          {isImproving ? 'Healing Normally' : 'Needs Monitoring'}
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={[0, 100]} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#ef4444', fontSize: 12}} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
            />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="score" 
              name="Health Score"
              stroke="#10b981" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorScore)" 
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="area"
              name={hasCm2 ? "Wound Area (cm²)" : "Wound Area (px)"}
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4, fill: '#ef4444', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
