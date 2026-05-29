import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const activeTheme = savedTheme || (systemPrefersLight ? 'light' : 'dark');
    setTheme(activeTheme);
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  if (!mounted) return null;

  const isLight = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-between w-16 h-8 p-1 rounded-full bg-white/5 border border-white/10 shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)] transition-colors hover:bg-white/10 overflow-hidden group focus:outline-none"
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />

      {/* Sun icon */}
      <div className={`relative z-10 flex justify-center w-6 h-6 transition-colors duration-300 ${isLight ? 'text-amber-500' : 'text-slate-500'}`}>
        <Sun size={14} className="m-auto" />
      </div>

      {/* Moon icon */}
      <div className={`relative z-10 flex justify-center w-6 h-6 transition-colors duration-300 ${!isLight ? 'text-purple-400' : 'text-slate-500'}`}>
        <Moon size={14} className="m-auto" />
      </div>

      {/* Sliding knob */}
      <motion.div
        className="absolute left-1 top-1 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center z-20"
        initial={false}
        animate={{ x: isLight ? 0 : 32 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-200 to-white shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]" />
        <div className={`absolute inset-0 rounded-full blur-md opacity-40 transition-colors duration-300 ${isLight ? 'bg-amber-400' : 'bg-purple-500'}`} />
      </motion.div>
    </button>
  );
}