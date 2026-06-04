import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const useVoiceAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  
  // Voice Settings
  const [voiceProfile, setVoiceProfile] = useState(() => {
    return localStorage.getItem('bee_voice_profile') || 'Soft Female';
  });
  const [availableVoices, setAvailableVoices] = useState([]);

  const recognitionRef = useRef(null);

  // Load voices asynchronously
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };
    
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Update local storage on voice profile change
  useEffect(() => {
    localStorage.setItem('bee_voice_profile', voiceProfile);
  }, [voiceProfile]);

  const getPreferredBeeVoice = (profile) => {
    if (availableVoices.length === 0) return null;

    let preferredNames = [];
    let targetPitch = 1.0;
    let targetRate = 1.0;

    switch (profile) {
      case 'Soft Female':
        preferredNames = ['Samantha', 'Google US English Female', 'Microsoft Aria Online (Natural) - English (United States)', 'Microsoft Aria', 'Ava', 'Victoria'];
        targetPitch = 1.05;
        targetRate = 0.95;
        break;
      case 'Professional Female':
        preferredNames = ['Ava', 'Victoria', 'Google UK English Female', 'Samantha', 'Microsoft Zira'];
        targetPitch = 0.95;
        targetRate = 1.0;
        break;
      case 'Neutral AI':
      default:
        preferredNames = ['Daniel', 'Google UK English Male', 'Microsoft Guy', 'Alex'];
        targetPitch = 1.0;
        targetRate = 1.0;
        break;
    }

    let selectedVoice = null;
    
    // Attempt to find preferred voices
    for (const name of preferredNames) {
      const match = availableVoices.find(v => v.name.includes(name));
      if (match) {
        selectedVoice = match;
        break;
      }
    }

    // Fallback logic
    if (!selectedVoice) {
      const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
      const femaleFallback = englishVoices.find(v => v.name.toLowerCase().includes('female') || v.name.includes('Samantha') || v.name.includes('Zira'));
      selectedVoice = femaleFallback || englishVoices[0] || availableVoices[0];
    }

    return { voice: selectedVoice, pitch: targetPitch, rate: targetRate };
  };

  const speakMessage = (text) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voiceSettings = getPreferredBeeVoice(voiceProfile);
    
    if (voiceSettings?.voice) {
      utterance.voice = voiceSettings.voice;
      utterance.pitch = voiceSettings.pitch;
      utterance.rate = voiceSettings.rate;
      utterance.volume = 1.0;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleUserMessageRef = useRef();

  const handleUserMessage = async (message) => {
    setChatHistory(prev => [...prev, { role: 'user', text: message }]);
    setIsProcessing(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${apiUrl}/api/bee/chat`, { message });
      const answer = response.data.answer;

      setChatHistory(prev => [...prev, { role: 'assistant', text: answer }]);
      speakMessage(answer);
    } catch (error) {
      console.error("Failed to fetch AI response", error);
      const errorMsg = "Sorry, I couldn't process your request right now. Check if I'm correctly configured.";
      setChatHistory(prev => [...prev, { role: 'assistant', text: errorMsg }]);
      speakMessage(errorMsg);
      toast.error("Failed to connect to AI server.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Keep ref updated
  useEffect(() => {
    handleUserMessageRef.current = handleUserMessage;
  });

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setLiveTranscript('');
      };

      recognition.onresult = async (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setLiveTranscript(finalTranscript || interimTranscript);

        if (finalTranscript && handleUserMessageRef.current) {
          await handleUserMessageRef.current(finalTranscript);
          setLiveTranscript('');
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
          toast.error("Microphone error: " + event.error);
        }
        setIsRecording(false);
        setLiveTranscript('');
      };

      recognition.onend = () => {
        setIsRecording(false);
        setLiveTranscript('');
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }

    // Cleanup synthesis on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Voice recognition is not supported in your browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return {
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
  };
};
