import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? { email, password } : { name, email, password };
      const res = await axios.post(endpoint, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
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
            <input 
              type="text" 
              placeholder="Full Name" 
              className="px-4 py-3.5 rounded-xl bg-white/60 border border-health-100 focus:outline-none focus:border-health-300 focus:ring-4 focus:ring-health-100 transition-all placeholder:text-slate-400 font-medium text-slate-700"
              value={name} onChange={e => setName(e.target.value)} required 
            />
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
      </div>
    </div>
  );
}
