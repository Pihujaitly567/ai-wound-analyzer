import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? { email, password } : { name, email, password, role };
      const res = await axios.post(endpoint, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user.role === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    }
  };

  return (
    <div className="flex justify-center items-center h-[70vh]">
      <div className="glass-card w-full max-w-md p-8 shadow-glass transition-all duration-300 hover:shadow-xl">
        <h2 className="text-3xl font-extrabold text-center gradient-text mb-2 tracking-tight">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-center text-health-600 font-medium mb-8">
          {isLogin ? 'Log in to track your healing journey' : 'Join WoundIQ today'}
        </p>

        {error && <div className="bg-rose-100/80 backdrop-blur-sm text-rose-500 p-3 rounded-xl mb-4 text-sm font-semibold text-center border border-rose-200">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <>
              <input 
                type="text" 
                placeholder="Full Name" 
                className="px-4 py-3.5 rounded-xl bg-white/60 border border-health-100 focus:outline-none focus:border-health-300 focus:ring-4 focus:ring-health-100 transition-all placeholder:text-slate-400 font-medium text-slate-700"
                value={name} onChange={e => setName(e.target.value)} required 
              />
              <div className="flex bg-white/60 border border-health-100 p-1 rounded-xl">
                <button 
                  type="button" 
                  onClick={() => setRole('patient')} 
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'patient' ? 'bg-health-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Patient
                </button>
                <button 
                  type="button" 
                  onClick={() => setRole('doctor')} 
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'doctor' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Medical Professional
                </button>
              </div>
            </>
          )}
          <input 
            type="email" 
            placeholder="Email Address" 
            className="px-4 py-3.5 rounded-xl bg-white/60 border border-health-100 focus:outline-none focus:border-health-300 focus:ring-4 focus:ring-health-100 transition-all placeholder:text-slate-400 font-medium text-slate-700"
            value={email} onChange={e => setEmail(e.target.value)} required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="px-4 py-3.5 rounded-xl bg-white/60 border border-health-100 focus:outline-none focus:border-health-300 focus:ring-4 focus:ring-health-100 transition-all placeholder:text-slate-400 font-medium text-slate-700"
            value={password} onChange={e => setPassword(e.target.value)} required 
          />
          <button type="submit" className="mt-2 bg-gradient-to-r from-health-500 to-indigo-400 hover:from-health-600 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-500 text-sm font-medium">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-500 font-bold hover:text-indigo-600 transition-colors">
            {isLogin ? 'Create one now' : 'Login instead'}
          </button>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-200/30 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Demo Access
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              type="button"
              onClick={() => {
                setIsLogin(true);
                setEmail('demo@woundiq.com');
                setPassword('demo1234');
              }}
              className="flex-1 bg-white hover:bg-amber-100 text-amber-800 text-sm font-bold py-2 px-3 rounded-lg border border-amber-200 transition-colors"
            >
              Patient Demo
            </button>
            <button 
              type="button"
              onClick={() => {
                setIsLogin(true);
                setEmail('doctor@woundiq.com');
                setPassword('doc1234');
              }}
              className="flex-1 bg-white hover:bg-indigo-100 text-indigo-800 text-sm font-bold py-2 px-3 rounded-lg border border-indigo-200 transition-colors"
            >
              Doctor Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
