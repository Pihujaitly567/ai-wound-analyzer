import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Activity, Droplet, HeartPulse, Save, AlertCircle, Stethoscope, Building, FileText, Award } from 'lucide-react';

export default function Profile() {
  const [userRole, setUserRole] = useState('patient');
  const [profile, setProfile] = useState({
    age: '',
    bloodType: 'O+',
    allergies: '',
    diabetesStatus: 'None',
    specialty: '',
    hospital: '',
    licenseNumber: '',
    yearsOfExperience: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role) setUserRole(user.role);
    if (user.profile) {
      setProfile(prev => ({
        ...prev,
        ...user.profile,
        allergies: user.profile.allergies ? user.profile.allergies.join(', ') : ''
      }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const payload = { ...profile };
      
      if (userRole === 'patient') {
        payload.age = parseInt(profile.age, 10) || null;
        payload.allergies = profile.allergies.split(',').map(a => a.trim()).filter(a => a);
      } else {
        payload.yearsOfExperience = parseInt(profile.yearsOfExperience, 10) || null;
      }

      const res = await axios.put('/api/auth/profile', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage('Error updating profile: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
        <User className="text-health-500" size={36} />
        {userRole === 'doctor' ? 'Professional Profile' : 'Medical Profile'}
      </h1>
      
      <div className="glass-card p-6 md:p-8 bg-white/70 shadow-xl border-t-4 border-t-health-500">
        {message && (
          <div className={`p-4 rounded-xl mb-6 font-bold text-sm ${message.includes('Error') ? 'bg-rose-100 text-rose-700' : 'bg-health-100 text-health-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {userRole === 'patient' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Activity size={16} className="text-health-500"/> Age
                  </label>
                  <input 
                    type="number" 
                    value={profile.age} 
                    onChange={e => setProfile({...profile, age: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-health-300 focus:ring-4 focus:ring-health-100 transition-all font-medium text-slate-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Droplet size={16} className="text-rose-500"/> Blood Type
                  </label>
                  <select 
                    value={profile.bloodType} 
                    onChange={e => setProfile({...profile, bloodType: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-health-300 focus:ring-4 focus:ring-health-100 transition-all font-medium text-slate-700"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500"/> Allergies (comma separated)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Penicillin, Latex"
                  value={profile.allergies} 
                  onChange={e => setProfile({...profile, allergies: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-health-300 focus:ring-4 focus:ring-health-100 transition-all font-medium text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <HeartPulse size={16} className="text-indigo-500"/> Diabetes Status
                </label>
                <select 
                  value={profile.diabetesStatus} 
                  onChange={e => setProfile({...profile, diabetesStatus: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-health-300 focus:ring-4 focus:ring-health-100 transition-all font-medium text-slate-700"
                >
                  {['None', 'Type 1', 'Type 2', 'Pre-diabetic'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Stethoscope size={16} className="text-indigo-500"/> Medical Specialty
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dermatology"
                    value={profile.specialty} 
                    onChange={e => setProfile({...profile, specialty: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Building size={16} className="text-sky-500"/> Primary Hospital / Clinic
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. General Hospital"
                    value={profile.hospital} 
                    onChange={e => setProfile({...profile, hospital: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FileText size={16} className="text-slate-500"/> License Number
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. MED-12345"
                    value={profile.licenseNumber} 
                    onChange={e => setProfile({...profile, licenseNumber: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Award size={16} className="text-amber-500"/> Years of Experience
                  </label>
                  <input 
                    type="number" 
                    placeholder="e.g. 10"
                    value={profile.yearsOfExperience} 
                    onChange={e => setProfile({...profile, yearsOfExperience: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-700"
                  />
                </div>
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full mt-6 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${userRole === 'doctor' ? 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600' : 'bg-gradient-to-r from-health-500 to-indigo-500 hover:from-health-600 hover:to-indigo-600'}`}
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
