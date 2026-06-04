import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, X } from 'lucide-react';

export default function LoginRequiredModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const overlayRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const actions = [
    {
      label: 'Log In',
      icon: LogIn,
      variant: 'primary',
      onClick: () => { onClose(); navigate('/login'); },
    },
    {
      label: 'Browse FAQs',
      icon: null,
      variant: 'secondary',
      onClick: () => { onClose(); navigate('/faqs'); },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-sm bg-[#0f1117] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 flex flex-col items-center text-center"
          >
            {/* Lock icon */}
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h2 className="font-bold font-bricolage text-xl text-slate-100 mb-2">
              Log in to continue
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              This feature is available to registered members only. Create a free account or sign in to access it.
            </p>

            <div className="w-full flex flex-col gap-3">
              {actions.map(action => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className={
                    action.variant === 'primary'
                      ? 'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-sm font-bold font-bricolage transition-all cursor-pointer'
                      : 'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-semibold font-bricolage transition-all cursor-pointer'
                  }
                >
                  {action.icon && <action.icon size={16} />}
                  {action.label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="mt-4 text-slate-500 hover:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}