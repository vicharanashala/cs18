import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient, { API_ROUTES } from '../api/axiosClient';
import toast from 'react-hot-toast';
import { Shield, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axiosClient.post(API_ROUTES.LOGIN, { email, password });
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.user.role);
      
      if (res.data.user.role === 'admin') {
        toast.success('Admin Login Successful');
        navigate('/admin');
      } else {
        toast.success('Login Successful');
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Backend is unreachable.';
      setErrorMsg(msg);
      toast.error(msg);
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-400">
              <path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2.5-3 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="17" r="1.2" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-bricolage text-slate-100 tracking-tight mb-2">Welcome Back</h1>
          <p className="text-slate-400 text-sm font-medium">Sign in to FAQ Hive</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              required 
              className="w-full rounded-2xl bg-white/5 border border-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/20 px-5 py-4 outline-none transition-all text-slate-100 placeholder-slate-600 text-sm shadow-inner" 
              value={email} 
              onChange={e => { setEmail(e.target.value); setErrorMsg(''); }} 
              placeholder="name@institution.edu"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            </div>
            <input 
              type="password" 
              required 
              className="w-full rounded-2xl bg-white/5 border border-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/20 px-5 py-4 outline-none transition-all text-slate-100 placeholder-slate-600 text-sm shadow-inner" 
              value={password} 
              onChange={e => { setPassword(e.target.value); setErrorMsg(''); }} 
              placeholder="••••••••"
            />
            {errorMsg && (
              <p className="mt-2 text-sm text-red-400 font-medium">
                {errorMsg}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold font-bricolage transition-all hover:bg-white/10 hover:border-white/20 hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(255,255,255,0.05)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} className="text-slate-400" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <Link to="/register" className="text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors">
            Don't have an account? Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
