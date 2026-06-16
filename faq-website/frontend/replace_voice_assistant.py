import sys

file_path = "/Users/animeshpathak/ocfaqproj/faq-website/frontend/src/components/VoiceAssistant.jsx"
with open(file_path, 'r') as f:
    content = f.read()

replacements = [
    # Chunk 1: Honeycomb Background
    (
        '''const HoneycombBackground = () => (
  <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none opacity-[0.01] z-0">
    <defs>
      <pattern id="hex-pattern" x="0" y="0" width="40" height="69.282" patternUnits="userSpaceOnUse">
        <path d="M40 17.32l-20 11.547L0 17.32V-5.774l20-11.547L40-5.774V17.32zm0 46.188l-20 11.548-20-11.548V40.414L20 28.867l20 11.547v23.094z" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />''',
        '''const HoneycombBackground = ({ isLight }) => (
  <svg width="100%" height="100%" className={`absolute inset-0 pointer-events-none z-0 transition-opacity duration-300 ${isLight ? 'opacity-[0.03]' : 'opacity-[0.01]'}`}>
    <defs>
      <pattern id="hex-pattern" x="0" y="0" width="40" height="69.282" patternUnits="userSpaceOnUse">
        <path d="M40 17.32l-20 11.547L0 17.32V-5.774l20-11.547L40-5.774V17.32zm0 46.188l-20 11.548-20-11.548V40.414L20 28.867l20 11.547v23.094z" fill="none" stroke={isLight ? "#000000" : "#FFFFFF"} strokeWidth="1.5" />'''
    ),
    # Chunk 2: Initialize Theme State
    (
        '''const VoiceAssistant = () => {
  const {
    isOpen,
    setIsOpen,''',
        '''const VoiceAssistant = () => {
  const [theme, setTheme] = useState('dark');

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
    setIsOpen,'''
    ),
    # Chunk 3: Container style
    (
        '''            className="flex flex-col relative overflow-hidden mb-6"
            style={{ 
              width: '440px', 
              height: '700px', 
              maxHeight: '85vh',
              borderRadius: '32px',
              backgroundColor: '#0A0A0A',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
          >
            <HoneycombBackground />
            
            {/* Premium Header - Fixed Top */}
            <div className="px-6 py-4 flex justify-between items-center z-20 border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0A]/90 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3">
                <BeeLogo variant="icon-only" className="drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] w-8 h-8 flex-shrink-0" />
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className={`absolute inline-flex h-full w-full rounded-full ${orbState !== 'idle' ? 'bg-amber-400 animate-ping' : 'bg-[#10B981]'}`}></span>
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${orbState !== 'idle' ? 'bg-amber-400' : 'bg-[#10B981]'}`}></span>
                    </span>
                    <span className="text-[15px] font-semibold tracking-tight text-white leading-none">
                      Bee
                    </span>
                  </div>
                  <span className="text-[12px] font-medium tracking-wide text-[rgba(255,255,255,0.85)] ml-3.5 mt-1 leading-none">
                    {orbState === 'idle' ? 'Ready' : 'Listening Ready'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`text-[rgba(255,255,255,0.85)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-full p-2 focus:outline-none transition-colors ${isSettingsOpen ? 'text-amber-400 bg-[rgba(255,255,255,0.08)]' : ''}`}
                >
                  <Settings size={16} strokeWidth={2} />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsOpen(false)}
                  className="text-[rgba(255,255,255,0.85)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-full p-2 focus:outline-none transition-colors"
                >''',
        '''            className="flex flex-col relative overflow-hidden mb-6 transition-colors duration-300"
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
                    <span className={`text-[15px] font-semibold tracking-tight leading-none transition-colors duration-300 ${isLight ? 'text-[#111827]' : 'text-white'}`}>
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
                >'''
    ),
    # Chunk 4: Settings Content
    (
        '''                    <h3 className="text-[18px] font-semibold text-white mb-4">Voice Settings</h3>
                    <div className="space-y-3">
                      {['Soft Female', 'Professional Female', 'Neutral AI'].map(profile => (
                        <div 
                          key={profile}
                          onClick={() => setVoiceProfile(profile)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                            voiceProfile === profile 
                              ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(217,119,6,0.15)]' 
                              : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[15px] font-medium ${voiceProfile === profile ? 'text-amber-400' : 'text-white'}`}>
                              {profile}
                            </span>
                            {voiceProfile === profile && (
                              <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            )}
                          </div>
                          <p className="text-[13px] text-[rgba(255,255,255,0.85)] mt-1.5 leading-relaxed">''',
        '''                    <h3 className={`text-[18px] font-semibold mb-4 transition-colors duration-300 ${isLight ? 'text-[#111827]' : 'text-white'}`}>Voice Settings</h3>
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
                                : voiceProfile === profile ? 'text-[#F59E0B]' : 'text-white'
                            }`}>
                              {profile}
                            </span>
                            {voiceProfile === profile && (
                              <div className="w-2 h-2 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                            )}
                          </div>
                          <p className={`text-[13px] mt-1.5 leading-relaxed transition-colors duration-300 ${isLight ? 'text-[#6B7280]' : 'text-[rgba(255,255,255,0.85)]'}`}>'''
    ),
    # Chunk 5: Empty State
    (
        '''                      <h2 className="text-[24px] font-semibold text-white mb-8 text-center">
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
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              borderColor: 'rgba(255,255,255,0.2)'
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleUserMessage(prompt)}
                            className="px-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-full text-[13px] font-medium text-[rgba(255,255,255,0.85)] hover:text-white transition-all whitespace-nowrap flex-grow-0 flex-shrink-0"
                          >''',
        '''                      <h2 className={`text-[24px] font-semibold mb-8 text-center transition-colors duration-300 ${isLight ? 'text-[#111827]' : 'text-white'}`}>
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
                                : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.85)] hover:text-white'
                            }`}
                          >'''
    ),
    # Chunk 6: Chat bubbles
    (
        '''                          <div 
                            className={`p-3.5 px-4.5 text-[15px] leading-relaxed shadow-md max-w-[75%] ${
                              isUser 
                                ? 'bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] text-white rounded-2xl rounded-tr-sm' 
                                : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-white rounded-2xl rounded-tl-sm'
                            }`}
                          >
                            {msg.text.split('\\n').map((str, index) => (
                              <span key={index}>
                                {str}
                                {index < msg.text.split('\\n').length - 1 && <br />}
                              </span>
                            ))}
                          </div>
                          <span className="text-[10px] font-medium text-[rgba(255,255,255,0.85)] mt-1.5 px-1 tracking-wide">''',
        '''                          <div 
                            className={`p-3.5 px-4.5 text-[15px] leading-relaxed shadow-md max-w-[75%] transition-colors duration-300 ${
                              isLight
                                ? isUser
                                  ? 'bg-amber-100 border border-amber-200 text-[#111827] rounded-2xl rounded-tr-sm'
                                  : 'bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827] rounded-2xl rounded-tl-sm'
                                : isUser 
                                  ? 'bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] text-white rounded-2xl rounded-tr-sm' 
                                  : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-white rounded-2xl rounded-tl-sm'
                            }`}
                          >
                            {msg.text.split('\\n').map((str, index) => (
                              <span key={index}>
                                {str}
                                {index < msg.text.split('\\n').length - 1 && <br />}
                              </span>
                            ))}
                          </div>
                          <span className={`text-[10px] font-medium mt-1.5 px-1 tracking-wide transition-colors duration-300 ${isLight ? 'text-[#6B7280]' : 'text-[rgba(255,255,255,0.85)]'}`}>'''
    ),
    # Chunk 7: Live Transcript Bubble
    (
        '''                          <div 
                            className="p-3.5 px-4.5 text-[15px] leading-relaxed shadow-md max-w-[75%] bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.85)] rounded-2xl rounded-tr-sm"
                          >
                            {liveTranscript}
                            <span className="animate-pulse ml-1 text-amber-500">...</span>
                          </div>''',
        '''                          <div 
                            className={`p-3.5 px-4.5 text-[15px] leading-relaxed shadow-md max-w-[75%] transition-colors duration-300 rounded-2xl rounded-tr-sm ${
                              isLight
                                ? 'bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827]'
                                : 'bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.85)]'
                            }`}
                          >
                            {liveTranscript}
                            <span className="animate-pulse ml-1 text-[#F59E0B]">...</span>
                          </div>'''
    ),
    # Chunk 8: Voice Dock Gradient
    (
        '''              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="shrink-0 pt-4 pb-6 px-6 flex justify-center items-center z-30 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent relative"
              >
                {/* Fade out mask for scrolling content behind dock */}
                <div className="absolute top-[-40px] left-0 right-0 h-[40px] bg-gradient-to-t from-[#0A0A0A]/95 to-transparent pointer-events-none" />''',
        '''              <motion.div 
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
                }`} />'''
    ),
    # Chunk 9: FAB Button
    (
        '''          <motion.div 
            className="absolute inset-0 rounded-[28px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden"
            whileHover={{ borderColor: "rgba(255,255,255,0.15)" }}
          >
            <Mic 
              size={28} 
              strokeWidth={1.5} 
              className={`transition-colors duration-300 ${isRecording || isProcessing ? 'text-amber-400' : 'text-white group-hover:text-amber-400'}`} 
            />
          </motion.div>''',
        '''          <motion.div 
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
              className={`transition-colors duration-300 ${isRecording || isProcessing ? 'text-[#F59E0B]' : isLight ? 'text-[#111827] group-hover:text-[#F59E0B]' : 'text-white group-hover:text-[#F59E0B]'}`} 
            />
          </motion.div>'''
    )
]

for i, (old_str, new_str) in enumerate(replacements):
    if old_str not in content:
        print(f"Error: Chunk {i+1} not found in the file.")
        print(f"Expected to find:\n{old_str}\n")
        sys.exit(1)
    content = content.replace(old_str, new_str)

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully replaced all chunks.")
