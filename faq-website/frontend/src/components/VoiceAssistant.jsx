import { useState, useEffect, useRef } from 'react';
import { Settings, X, ArrowUpRight, Mic } from 'lucide-react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { motion, AnimatePresence } from 'framer-motion';

import BeeLogo from './BeeLogo';

// --- Systematic Honeycomb Background ---
const HoneycombBackground = ({ isLight }) => (
  <svg width="100%" height="100%" className={`absolute inset-0 pointer-events-none z-0 transition-opacity duration-300 ${isLight ? 'opacity-[0.03]' : 'opacity-[0.01]'}`}>
    <defs>
      <pattern id="hex-pattern" x="0" y="0" width="40" height="69.282" patternUnits="userSpaceOnUse">
        <path d="M40 17.32l-20 11.547L0 17.32V-5.774l20-11.547L40-5.774V17.32zm0 46.188l-20 11.548-20-11.548V40.414L20 28.867l20 11.547v23.094z" fill="none" stroke={isLight ? "#000000" : "#FFFFFF"} strokeWidth="1.5" />
      </pattern>
    </defs>
    <rect x="0" y="0" width="100%" height="100%" fill="url(#hex-pattern)" />
  </svg>
);

// --- The Living AI Orb ---
const LivingOrb = ({ state, onClick }) => {
  const isListening = state === 'listening';
  const isProcessing = state === 'processing';
  const isSpeaking = state === 'speaking';
  const sizeClass = "w-20 h-20";

  const liquidBorder = ['50%', '40% 60% 70% 30%', '60% 40% 30% 70%', '30% 70% 50% 50%', '50%'];

  return (
    <motion.div 
      layout
      className={`relative flex items-center justify-center cursor-pointer group ${sizeClass}`} 
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Speaking Frequency Rings */}
      <AnimatePresence>
        {isSpeaking && (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-amber-500/50 pointer-events-none"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.4, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-amber-500/30 pointer-events-none"
            />
          </>
        )}
      </AnimatePresence>

      {/* Outer glowing ring for depth */}
      <motion.div
        animate={{ scale: isSpeaking ? 1.1 : 1, opacity: isSpeaking ? 0.8 : 0.4 }}
        className="absolute inset-0 rounded-full border border-amber-500/30 blur-[1px] pointer-events-none"
      />

      {/* Listening Waveform Ring */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1.35, opacity: 1, rotate: 360 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ rotate: { repeat: Infinity, duration: 3, ease: "linear" }, scale: { repeat: Infinity, duration: 0.8, ease: "easeInOut", repeatType: "mirror" } }}
            className="absolute inset-0 rounded-full border-[3px] border-dashed border-amber-400/70 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Idle Aura & Pulse */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl pointer-events-none"
      />

      {/* Core Orb */}
      <motion.div
        animate={{
          borderRadius: isProcessing ? liquidBorder : '50%',
          rotate: isProcessing ? [0, 360] : 0,
          scale: isListening ? [1, 1.08, 0.92, 1] : 1
        }}
        transition={{
          borderRadius: { repeat: Infinity, duration: 3, ease: "easeInOut" },
          rotate: { repeat: Infinity, duration: 4, ease: "linear" },
          scale: { repeat: Infinity, duration: 1.2, ease: "easeInOut" }
        }}
        className="absolute inset-0 z-10 shadow-[0_0_40px_rgba(217,119,6,0.3)] group-hover:shadow-[0_0_60px_rgba(217,119,6,0.5)] transition-shadow duration-300 flex items-center justify-center"
        style={{
          background: isProcessing
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
            : 'radial-gradient(circle at 30% 30%, #fbbf24 0%, #f59e0b 50%, #d97706 100%)'
        }}
      >
        <div className="absolute inset-0 rounded-full bg-white/20 blur-sm pointer-events-none" />
        
        {/* Center Mic Icon */}
        <Mic size={28} className="text-[#FFFFFF] relative z-20 drop-shadow-md" strokeWidth={2} />

        {/* Subtle particle motion overlay for thinking */}
        {isProcessing && (
          <motion.div 
            animate={{ rotate: -360 }} 
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            className="absolute inset-0 rounded-full opacity-40 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(255,255,255,0.9)_50%,transparent_51%)] bg-[length:8px_8px] pointer-events-none"
          />
        )}
      </motion.div>
    </motion.div>
  );
};

const VoiceAssistant = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      return document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || systemTheme;
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    }
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const isLight = theme === 'light';

  const {
    isOpen,
    setIsOpen,
    isRecording,
    isSpeaking,
    isProcessing,
    chatHistory,
    liveTranscript,
    voiceProfile,
    setVoiceProfile,
    toggleRecording,
    handleUserMessage
  } = useVoiceAssistant();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, liveTranscript, isProcessing]);

  const orbState = isProcessing ? 'processing' : isRecording ? 'listening' : isSpeaking ? 'speaking' : 'idle';
  const isEmptyState = chatHistory.length === 0 && !isRecording && !isProcessing && !liveTranscript;

  // Removed suggestedPrompts as they are now hardcoded in Welcome state

  const springConfig = { type: "spring", stiffness: 400, damping: 30 };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={springConfig}
            className="flex flex-col relative overflow-hidden mb-6 transition-colors duration-300"
            style={{ 
              width: '440px', 
              height: '700px', 
              maxHeight: '85vh',
              borderRadius: '32px',
              backgroundColor: isLight ? '#FFFFFF' : '#0A0A0A',
              borderColor: isLight ? '#E5E7EB' : 'rgba(255, 255, 255, 0.08)',
              borderWidth: '1px',
              borderStyle: 'solid',
              boxShadow: isLight 
                ? '0 20px 40px rgba(0,0,0,0.1)' 
                : '0 40px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
              color: isLight ? '#111827' : '#FFFFFF'
            }}
          >
            <HoneycombBackground isLight={isLight} />
            
            {/* Premium Header - Fixed Top */}
            <div className={`px-6 py-4 flex justify-between items-center z-20 border-b shrink-0 transition-colors duration-300 ${isLight ? 'bg-white border-[#E5E7EB]' : 'bg-[#0A0A0A]/90 backdrop-blur-xl border-[rgba(255,255,255,0.08)]'}`}>
              <div className="flex items-center gap-3">
                <BeeLogo variant="icon-only" className={`w-8 h-8 flex-shrink-0 transition-shadow duration-300 ${isLight ? 'drop-shadow-sm' : 'drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]'}`} />
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className={`absolute inline-flex h-full w-full rounded-full ${orbState !== 'idle' ? 'bg-[#F59E0B] animate-ping' : 'bg-[#10B981]'}`}></span>
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${orbState !== 'idle' ? 'bg-[#F59E0B]' : 'bg-[#10B981]'}`}></span>
                    </span>
                    <span className={`text-[15px] font-semibold tracking-tight leading-none transition-colors duration-300 ${isLight ? 'text-[#111827]' : 'text-[#FFFFFF]'}`}>
                      Bee
                    </span>
                  </div>
                  <span className={`text-[12px] font-medium tracking-wide ml-3.5 mt-1 leading-none transition-colors duration-300 ${isLight ? 'text-[#6B7280]' : 'text-[rgba(255,255,255,0.85)]'}`}>
                    {orbState === 'idle' ? 'Ready' : 'Listening Ready'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: isLight ? '#F3F4F6' : 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`border rounded-full p-2 focus:outline-none transition-colors duration-300 ${
                    isLight 
                      ? `text-[#6B7280] bg-[#F8FAFC] border-[#E5E7EB] ${isSettingsOpen ? 'text-[#F59E0B] bg-[#F3F4F6]' : ''}`
                      : `text-[rgba(255,255,255,0.85)] bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] ${isSettingsOpen ? 'text-[#F59E0B] bg-[rgba(255,255,255,0.08)]' : ''}`
                  }`}
                >
                  <Settings size={16} strokeWidth={2} />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: isLight ? '#F3F4F6' : 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsOpen(false)}
                  className={`border rounded-full p-2 focus:outline-none transition-colors duration-300 ${
                    isLight 
                      ? 'text-[#6B7280] bg-[#F8FAFC] border-[#E5E7EB]'
                      : 'text-[rgba(255,255,255,0.85)] bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]'
                  }`}
                >
                  <X size={16} strokeWidth={2} />
                </motion.button>
              </div>
            </div>

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 flex flex-col relative z-10 overflow-y-auto overflow-x-hidden custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {isSettingsOpen ? (
                  <motion.div 
                    key="settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col p-6 relative z-20"
                  >
                    <h3 className={`text-[18px] font-semibold mb-4 transition-colors duration-300 ${isLight ? 'text-[#111827]' : 'text-[#FFFFFF]'}`}>Voice Settings</h3>
                    <div className="space-y-3">
                      {['Soft Female', 'Professional Female', 'Neutral AI'].map(profile => (
                        <div 
                          key={profile}
                          onClick={() => setVoiceProfile(profile)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                            isLight
                              ? voiceProfile === profile
                                ? 'bg-amber-50 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                : 'bg-[#F8FAFC] border-[#E5E7EB] hover:bg-gray-100'
                              : voiceProfile === profile 
                                ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(217,119,6,0.15)]' 
                                : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[15px] font-medium transition-colors duration-300 ${
                              isLight
                                ? voiceProfile === profile ? 'text-[#F59E0B]' : 'text-[#111827]'
                                : voiceProfile === profile ? 'text-[#F59E0B]' : 'text-[#FFFFFF]'
                            }`}>
                              {profile}
                            </span>
                            {voiceProfile === profile && (
                              <div className="w-2 h-2 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                            )}
                          </div>
                          <p className={`text-[13px] mt-1.5 leading-relaxed transition-colors duration-300 ${isLight ? 'text-[#6B7280]' : 'text-[rgba(255,255,255,0.85)]'}`}>
                            {profile === 'Soft Female' && 'Warm, gentle, and conversational.'}
                            {profile === 'Professional Female' && 'Crisp, articulate, and formal.'}
                            {profile === 'Neutral AI' && 'Balanced, direct, and neutral.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : isEmptyState ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col justify-end p-6 pb-2 relative z-20"
                  >
                    <div className="w-full flex flex-col items-center justify-center h-full mt-auto mb-10">
                      <h2 className={`text-[24px] font-semibold mb-8 text-center transition-colors duration-300 ${isLight ? 'text-[#111827]' : 'text-[#FFFFFF]'}`}>
                        How can I help you today?
                      </h2>
                      <div className="flex flex-wrap justify-center gap-3 w-full max-w-[360px]">
                        {[
                          "What is VINS?",
                          "How are teams formed?",
                          "Tell me about certificates",
                          "Explain internship phases"
                        ].map((prompt, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + (i * 0.05) }}
                            whileHover={{ 
                              backgroundColor: isLight ? '#F3F4F6' : 'rgba(255,255,255,0.1)',
                              borderColor: isLight ? '#D1D5DB' : 'rgba(255,255,255,0.2)'
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleUserMessage(prompt)}
                            className={`px-4 py-2 border rounded-full text-[13px] font-medium transition-colors duration-300 whitespace-nowrap flex-grow-0 flex-shrink-0 ${
                              isLight
                                ? 'bg-[#F8FAFC] border-[#E5E7EB] text-[#6B7280] hover:text-[#111827]'
                                : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.85)] hover:text-[#FFFFFF]'
                            }`}
                          >
                            {prompt}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col p-6 space-y-6 relative z-20"
                  >
                    {chatHistory.map((msg, idx) => {
                      const isUser = msg.role === 'user';
                      // Using a mock timestamp if one doesn't exist on the message object
                      const timeString = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={springConfig}
                          key={idx} 
                          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                        >
                          <div 
                            className={`p-3.5 px-4.5 text-[15px] leading-relaxed shadow-md max-w-[75%] transition-colors duration-300 ${
                              isLight
                                ? isUser
                                  ? 'bg-amber-100 border border-amber-200 text-[#111827] rounded-2xl rounded-tr-sm'
                                  : 'bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827] rounded-2xl rounded-tl-sm'
                                : isUser 
                                  ? 'bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] text-[#FFFFFF] rounded-2xl rounded-tr-sm' 
                                  : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[#FFFFFF] rounded-2xl rounded-tl-sm'
                            }`}
                          >
                            {msg.text.split('\n').map((str, index) => (
                              <span key={index}>
                                {str}
                                {index < msg.text.split('\n').length - 1 && <br />}
                              </span>
                            ))}
                          </div>
                          <span className={`text-[10px] font-medium mt-1.5 px-1 tracking-wide transition-colors duration-300 ${isLight ? 'text-[#6B7280]' : 'text-[rgba(255,255,255,0.85)]'}`}>
                            {isUser ? 'You' : 'Bee'} • {timeString}
                          </span>
                        </motion.div>
                      );
                    })}
                    
                    {/* Live Transcript Bubble */}
                    <AnimatePresence>
                      {liveTranscript && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={springConfig}
                          className="flex flex-col items-end"
                        >
                          <div 
                            className={`p-3.5 px-4.5 text-[15px] leading-relaxed shadow-md max-w-[75%] transition-colors duration-300 rounded-2xl rounded-tr-sm ${
                              isLight
                                ? 'bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827]'
                                : 'bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.85)]'
                            }`}
                          >
                            {liveTranscript}
                            <span className="animate-pulse ml-1 text-[#F59E0B]">...</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div ref={chatEndRef} className="h-4 shrink-0" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Voice Dock - Fixed Bottom */}
            {!isSettingsOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`shrink-0 pt-4 pb-6 px-6 flex justify-center items-center z-30 relative transition-colors duration-300 ${
                  isLight
                    ? 'bg-gradient-to-t from-[#FFFFFF] via-[#FFFFFF]/95 to-transparent'
                    : 'bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent'
                }`}
              >
                {/* Fade out mask for scrolling content behind dock */}
                <div className={`absolute top-[-40px] left-0 right-0 h-[40px] pointer-events-none transition-colors duration-300 ${
                  isLight
                    ? 'bg-gradient-to-t from-[#FFFFFF]/95 to-transparent'
                    : 'bg-gradient-to-t from-[#0A0A0A]/95 to-transparent'
                }`} />
                
                <LivingOrb state={orbState} onClick={toggleRecording} />
              </motion.div>
            )}

            <style jsx="true">{`
              .custom-scrollbar::-webkit-scrollbar { width: 4px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1, y: [0, -4, 0] }}
          transition={{ scale: springConfig, y: { repeat: Infinity, duration: 4, ease: "easeInOut" } }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="w-[72px] h-[72px] flex items-center justify-center relative group focus:outline-none"
        >
          <div className="absolute inset-0 rounded-[28px] bg-amber-500/10 blur-xl group-hover:bg-amber-500/20 transition-colors duration-300" />
          <motion.div 
            className={`absolute inset-0 rounded-[28px] border flex items-center justify-center overflow-hidden transition-colors duration-300 ${
              isLight
                ? 'bg-white border-[#E5E7EB] shadow-[0_10px_25px_rgba(0,0,0,0.1)]'
                : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.08)] shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)]'
            }`}
            whileHover={{ borderColor: isLight ? "#D1D5DB" : "rgba(255,255,255,0.15)" }}
          >
            <Mic 
              size={28} 
              strokeWidth={1.5} 
              className={`transition-colors duration-300 ${isRecording || isProcessing ? 'text-[#F59E0B]' : isLight ? 'text-[#111827] group-hover:text-[#F59E0B]' : 'text-[#FFFFFF] group-hover:text-[#F59E0B]'}`} 
            />
          </motion.div>
        </motion.button>
      )}
    </div>
  );
};

export default VoiceAssistant;
