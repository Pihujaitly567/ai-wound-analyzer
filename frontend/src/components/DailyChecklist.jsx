import { useState, useEffect } from 'react';
import { CheckSquare, ListTodo, CheckCircle2 } from 'lucide-react';

export default function DailyChecklist({ wounds }) {
  const [tasks, setTasks] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());

  useEffect(() => {
    // Generate tasks based on latest advice from active wounds
    const newTasks = [];
    wounds.forEach(w => {
      if (w.status === 'Active' && w.checkins && w.checkins.length > 0) {
        const latestCheckin = w.checkins[w.checkins.length - 1];
        if (latestCheckin.remedies) {
          latestCheckin.remedies.forEach((remedy, i) => {
            // Give each task a relatively unique ID based on the wound ID and text
            newTasks.push({ id: `${w._id}-${i}`, text: remedy, woundTitle: w.title });
          });
        }
      }
    });
    setTasks(newTasks);

    // Hydrate checked tasks for TODAY
    const today = new Date().toDateString();
    const storedData = localStorage.getItem('woundiq_daily_tasks');
    if (storedData) {
      try {
        const { date, checked } = JSON.parse(storedData);
        if (date === today) {
          setCheckedIds(new Set(checked));
        } else {
          // If it's a new day, clear yesterday's tasks
          localStorage.removeItem('woundiq_daily_tasks');
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [wounds]);

  const toggleTask = (id) => {
    const newSet = new Set(checkedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCheckedIds(newSet);
    
    // Persist to local storage
    localStorage.setItem('woundiq_daily_tasks', JSON.stringify({
      date: new Date().toDateString(),
      checked: Array.from(newSet)
    }));
  };

  if (tasks.length === 0) return null;

  const progress = Math.round((checkedIds.size / tasks.length) * 100) || 0;
  const allComplete = checkedIds.size === tasks.length;

  return (
    <div className="glass-card mb-8 bg-white overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2 relative z-10">
          <ListTodo size={24} /> Daily Care Checklist
        </h2>
        <p className="text-indigo-100 font-medium text-sm mt-1 relative z-10">Customized by AI for your active cases</p>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-slate-700 text-sm">Today's Progress</span>
          <span className="font-bold text-indigo-600 text-sm">{progress}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
          <div 
            className="h-full bg-health-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {allComplete && progress > 0 && (
          <div className="bg-health-50 text-health-700 p-4 rounded-xl font-bold text-sm mb-6 flex items-center justify-center gap-2 animate-in zoom-in duration-300">
            <CheckCircle2 className="text-health-500" /> Great job! You completed all treatments for today.
          </div>
        )}

        <div className="space-y-3">
          {tasks.map(task => {
            const isChecked = checkedIds.has(task.id);
            return (
              <label 
                key={task.id} 
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'bg-slate-50 border-transparent' : 'bg-white border-slate-100 hover:border-indigo-100 shadow-sm'}`}
              >
                <div className="mt-0.5">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isChecked ? 'bg-health-500 text-white' : 'bg-slate-100 border-2 border-slate-200'}`}>
                    {isChecked && <CheckSquare size={16} />}
                  </div>
                  {/* hidden input for accessibility */}
                  <input type="checkbox" className="hidden" checked={isChecked} onChange={() => toggleTask(task.id)} />
                </div>
                <div className="flex-1">
                  <span className={`block font-bold text-sm ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {task.text}
                  </span>
                  <span className={`block text-xs font-semibold mt-1 ${isChecked ? 'text-slate-300' : 'text-indigo-400'}`}>
                    For: {task.woundTitle}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
