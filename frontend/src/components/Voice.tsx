import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Globe, Loader, ShieldAlert, Cpu } from 'lucide-react';

const LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi', script: 'हिन्दी' },
  { code: 'ta-IN', name: 'Tamil', script: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', script: 'తెలుగు' },
  { code: 'bn-IN', name: 'Bengali', script: 'বাংলা' },
  { code: 'kn-IN', name: 'Kannada', script: 'கನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', script: 'മലയാളം' },
  { code: 'mr-IN', name: 'Marathi', script: 'मराठी' },
  { code: 'gu-IN', name: 'Gujarati', script: 'ગુજરાતી' },
  { code: 'pa-IN', name: 'Punjabi', script: 'ਪੰਜਾਬੀ' },
  { code: 'or-IN', name: 'Odia', script: 'ଓଡ଼ିଆ' },
  { code: 'ur-IN', name: 'Urdu', script: 'اردو' },
  { code: 'en-US', name: 'English', script: 'English' }
];

const Voice: React.FC = () => {
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [engine, setEngine] = useState<'sarvam' | 'browser'>('browser'); // Default to browser speech API for maximum local reliability!
  
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  
  const [transcript, setTranscript] = useState('');
  const [agentReply, setAgentReply] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Clean up audio & speech recognition on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Update SpeechRecognition language configuration when selected language changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang.code;
    }
  }, [lang]);

  // Native Browser Web Speech Recognition
  const startBrowserRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support the native Web Speech API. Please use Google Chrome or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = lang.code;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setRecording(true);
      setTranscript('');
      setAgentReply('');
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setTranscript(`Error: Browser speech recognition failed (${event.error})`);
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognition.onresult = async (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setTranscript(speechToText);
      setProcessing(true);
      await getAgentResponse(speechToText);
    };

    recognition.start();
  };

  const startRecording = async () => {
    if (engine === 'browser') {
      startBrowserRecognition();
      return;
    }

    setTranscript('');
    setAgentReply('');
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please verify site permissions.");
    }
  };

  const stopRecording = () => {
    if (engine === 'browser') {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setRecording(false);
      return;
    }

    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleAudioUpload = async (blob: Blob) => {
    setProcessing(true);
    let transcriptText = "";
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');
      
      const sttResponse = await fetch(`${apiUrl}/api/voice/stt?language_code=${lang.code}`, {
        method: 'POST',
        body: formData
      });
      
      if (!sttResponse.ok) {
        throw new Error(`STT request failed with status: ${sttResponse.status}`);
      }
      const sttData = await sttResponse.json();
      
      if (sttData.status === 'demo') {
        setDemoMode(true);
      } else {
        setDemoMode(false);
      }

      transcriptText = sttData.transcript;
      setTranscript(transcriptText);

    } catch (err: any) {
      console.error("STT processing error:", err);
      setTranscript(`Error: Speech recognition failed (${err.message}). Switch to Web Speech API or verify your SARVAM_API_KEY.`);
      setProcessing(false);
      return;
    }

    if (transcriptText) {
      await getAgentResponse(transcriptText);
    }
  };

  const getAgentResponse = async (text: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: "voice_session"
        })
      });

      if (!response.ok) throw new Error("Agent connection failed");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'text') {
                  fullText += parsed.content;
                }
              } catch (e) {}
            }
          }
        }
      }

      const cleanReply = fullText.replace(/[\*#_`\-]/g, "").trim();
      setAgentReply(cleanReply);
      
      if (cleanReply) {
        await playSpeechResponse(cleanReply);
      } else {
        setProcessing(false);
      }

    } catch (err: any) {
      console.error("Chat generation error:", err);
      setAgentReply(`Error: Chat agent failed to respond (${err.message})`);
      setProcessing(false);
    }
  };

  const playSpeechResponse = async (text: string) => {
    if (engine === 'browser') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang.code;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        alert("Text-to-speech not supported in this browser.");
      }
      setProcessing(false);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      
      const ttsResponse = await fetch(`${apiUrl}/api/voice/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          language_code: lang.code
        })
      });

      if (!ttsResponse.ok) throw new Error("TTS Generation failed");
      const ttsData = await ttsResponse.json();

      if (ttsData.audio_base64) {
        const audioUrl = `data:audio/mp3;base64,${ttsData.audio_base64}`;
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onplay = () => setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
      }

    } catch (err: any) {
      console.error("TTS playback error:", err);
      setAgentReply(`Error: Vocal speech synthesis failed (${err.message}). Switch to Web Speech API or verify your SARVAM_API_KEY.`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="dashboard-scroll" style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Engine Switcher */}
        <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={16} color="var(--primary-cyan)" /> Speech Engine Selection
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setEngine('browser')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: engine === 'browser' ? '1px solid var(--primary-cyan)' : '1px solid var(--border-glass)',
                background: engine === 'browser' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                color: engine === 'browser' ? 'var(--primary-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                transition: 'all 0.15s'
              }}
            >
              Web Speech API (Local Browser)
            </button>
            <button
              onClick={() => setEngine('sarvam')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: engine === 'sarvam' ? '1px solid var(--primary-cyan)' : '1px solid var(--border-glass)',
                background: engine === 'sarvam' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                color: engine === 'sarvam' ? 'var(--primary-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                transition: 'all 0.15s'
              }}
            >
              Sarvam AI (Cloud Backend)
            </button>
          </div>
        </div>

        {/* Language Header */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} color="var(--primary-cyan)" /> Selected Input/Output Language
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: lang.code === l.code ? '1px solid var(--primary-cyan)' : '1px solid var(--border-glass)',
                  background: lang.code === l.code ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  color: lang.code === l.code ? 'var(--primary-cyan)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                <span>{l.script}</span>
                <span style={{ fontSize: '10px', opacity: 0.8 }}>{l.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Demo Mode Notice */}
        {demoMode && engine === 'sarvam' && (
          <div className="glass-card" style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#f59e0b' }}>
            <ShieldAlert size={18} />
            <span>Running in Demo Mode. Set <strong>SARVAM_API_KEY</strong> in your .env file to enable live voice translation.</span>
          </div>
        )}

        {/* Recording Controls */}
        <div className="glass-card" style={{ padding: '40px 24px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={processing}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: recording ? '4px solid #ef4444' : '4px solid var(--primary-cyan)',
              background: recording ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 240, 255, 0.05)',
              color: recording ? '#ef4444' : 'var(--primary-cyan)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: recording ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(0, 240, 255, 0.2)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {processing ? <Loader size={32} style={{ animation: 'spin 1.5s linear infinite' }} /> :
             recording ? <MicOff size={32} /> : <Mic size={32} />}
          </button>

          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>
            {recording ? "Recording... Click core to finish and submit" :
             processing ? "Processing voice..." :
             speaking ? "Playing speech response..." : "Click to speak in " + lang.name}
          </div>
        </div>

        {/* Translation Results */}
        {(transcript || agentReply) && (
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {transcript && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Speech Transcript</div>
                <div style={{ fontSize: '15px', color: 'var(--text-main)', marginTop: '4px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  {transcript}
                </div>
              </div>
            )}

            {agentReply && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--primary-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>EcoPulse Voice Reply</span>
                  <button 
                    onClick={() => playSpeechResponse(agentReply)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                  >
                    <Volume2 size={14} /> Replay Audio
                  </button>
                </div>
                <div style={{ fontSize: '15px', color: 'var(--text-main)', marginTop: '4px', background: 'rgba(0, 240, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.15)', lineHeight: 1.5 }}>
                  {agentReply}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Voice;
