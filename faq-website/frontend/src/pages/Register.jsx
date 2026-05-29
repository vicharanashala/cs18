import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient, { API_ROUTES } from '../api/axiosClient';
import toast from 'react-hot-toast';
import { UserPlus, ArrowRight } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email.includes('@')) {
      return toast.error('Please enter a valid email address.');
    }
    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters long.');
    }

    setLoading(true);
    try {
      const res = await axiosClient.post(API_ROUTES.REGISTER, { 
        email, 
        password,
        role: isAdmin ? 'admin' : 'student'
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.user.role);
      toast.success('Registration Successful');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Backend is unreachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] rounded-full bg-slate-500/5 blur-[120px] pointer-events-none" />

      <div className="glass-strong p-10 rounded-3xl w-full max-w-md shadow-[0_24px_80px_rgba(0,0,0,0.5)] border border-white/10 relative z-10">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <UserPlus size={22} className="text-slate-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold font-bricolage text-slate-100 tracking-tight mb-2">Create Account</h1>
          <p className="text-slate-400 text-sm font-medium">Join FAQ Hive today</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              required 
              className="w-full rounded-2xl bg-white/5 border border-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/20 px-5 py-4 outline-none transition-all text-slate-100 placeholder-slate-600 text-sm shadow-inner" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="name@institution.edu"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required 
              className="w-full rounded-2xl bg-white/5 border border-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/20 px-5 py-4 outline-none transition-all text-slate-100 placeholder-slate-600 text-sm shadow-inner" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="•••••••• (min 6 chars)"
            />
          </div>
          
          {/* Temporary Admin Toggle */}
          <div className="flex items-center gap-3 py-1 cursor-pointer select-none">
            <input 
              type="checkbox" 
              id="adminToggle"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="w-4 h-4 rounded bg-white/5 border border-white/10 focus:ring-1 focus:ring-white/20 text-slate-100 accent-slate-800 cursor-pointer"
            />
            <label htmlFor="adminToggle" className="text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer">
              Register as Admin
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold font-bricolage transition-all hover:bg-white/10 hover:border-white/20 hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(255,255,255,0.05)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : (
              <>
                <span>Sign Up</span>
                <ArrowRight size={16} className="text-slate-400" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <Link to="/login" className="text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
