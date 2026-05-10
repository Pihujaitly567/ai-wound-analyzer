import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <nav className="glass-card sticky top-0 z-50 rounded-none border-x-0 border-t-0 px-6 py-4 mb-8">
      <div className="container mx-auto max-w-4xl flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="WoundIQ Logo" className="w-[48px] h-[48px] rounded-full shadow-lg group-hover:scale-110 transition-transform object-cover bg-white" />
          <span className="text-2xl font-extrabold tracking-tight text-slate-800">Wound<span className="text-transparent bg-clip-text bg-gradient-to-r from-health-500 to-indigo-500">IQ</span></span>
        </Link>
        <div>
          {token ? (
            <div className="flex items-center gap-6">
              {user && user.role === 'doctor' && (
                <Link to="/doctor" className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors">
                  Doctor Portal
                </Link>
              )}
              <Link to="/profile" className="text-slate-600 hover:text-health-700 font-medium transition-colors">
                Profile
              </Link>
              <button 
                onClick={handleLogout}
                className="text-health-700 hover:text-health-900 font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="text-health-600 font-medium">Welcome</div>
          )}
        </div>
      </div>
    </nav>
  );
}
