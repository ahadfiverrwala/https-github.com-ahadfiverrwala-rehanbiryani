import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Info, Globe, MicOff, Mic, Sparkles } from 'lucide-react';
import { GeminiLiveService } from './services/geminiService';
import Visualizer from './components/Visualizer';
import InfoModal from './components/InfoModal';
import { ConnectionState, AudioVolumeState } from './types';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [volumeState, setVolumeState] = useState<AudioVolumeState>({ inputVolume: 0, outputVolume: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);

  useEffect(() => {
    serviceRef.current = new GeminiLiveService();
    
    serviceRef.current.setVolumeCallback((input, output) => {
        setVolumeState({ inputVolume: input, outputVolume: output });
    });

    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }
    };
  }, []);

  const handleConnect = async () => {
    if (!serviceRef.current) return;
    
    setErrorMsg(null);
    setConnectionState(ConnectionState.CONNECTING);
    
    await serviceRef.current.connect(
      () => {
        setConnectionState(ConnectionState.DISCONNECTED);
        setVolumeState({ inputVolume: 0, outputVolume: 0 });
        setIsMuted(false);
      },
      (err) => {
        setConnectionState(ConnectionState.ERROR);
        setErrorMsg(err.message || "An unexpected error occurred.");
      }
    );
    
    setConnectionState(ConnectionState.CONNECTED);
  };

  const handleDisconnect = () => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }
  };

  const toggleMute = () => {
    if (connectionState === ConnectionState.CONNECTED && serviceRef.current) {
      const newState = !isMuted;
      setIsMuted(newState);
      serviceRef.current.setMute(newState);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden selection:bg-blue-100">
      
      {/* Subtle Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/40 blur-[120px] rounded-full mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-100/40 blur-[120px] rounded-full mix-blend-multiply"></div>
      </div>

      {/* Header */}
      <header className="w-full pt-8 px-6 flex justify-between items-center max-w-2xl mx-auto z-10">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center">
               <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Rehan School</h1>
                <p className="text-sm text-slate-500 font-medium">AI Assistant</p>
            </div>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="group p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 text-slate-600"
          aria-label="Info"
        >
          <Info className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col items-center justify-center relative px-6 z-10">
        
        {/* Status Card */}
        <div className="mb-12 flex flex-col items-center space-y-4">
             {/* Visualizer Frame */}
            <div className="relative w-full h-48 flex items-center justify-center">
                <Visualizer 
                    inputVolume={isMuted ? 0 : volumeState.inputVolume} 
                    outputVolume={volumeState.outputVolume} 
                    isActive={connectionState === ConnectionState.CONNECTED}
                />
            </div>

            {/* Status Text */}
            <div className="h-8 flex items-center justify-center">
                {errorMsg ? (
                    <div className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg border border-red-100 animate-fade-in flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        {errorMsg}
                    </div>
                ) : connectionState === ConnectionState.CONNECTING ? (
                    <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg animate-pulse">
                        Connecting...
                    </span>
                ) : connectionState === ConnectionState.DISCONNECTED ? (
                     <span className="text-slate-400 text-sm font-medium">Ready to help</span>
                ) : isMuted ? (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-sm font-semibold border border-slate-200">
                        <MicOff className="w-4 h-4" />
                        <span>Muted</span>
                    </div>
                ) : (
                    <span className="text-emerald-600 text-sm font-semibold transition-opacity duration-300" style={{opacity: volumeState.outputVolume > 10 ? 1 : 0}}>
                        Speaking...
                    </span>
                )}
            </div>
        </div>

        {/* Controls */}
        <div className="w-full flex items-center justify-center">
          
          {connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.ERROR ? (
            
            // Start Button - Wide Pill
            <button
              onClick={handleConnect}
              className="group relative w-full max-w-xs h-16 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl shadow-xl shadow-slate-200 hover:shadow-blue-200 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between px-2 pl-6 overflow-hidden"
            >
              <span className="font-semibold text-lg tracking-wide">Start Conversation</span>
              <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                 <Phone className="w-6 h-6 fill-current" />
              </div>
            </button>

          ) : (
            
            // Connected Controls - Floating Dock
            <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                
                {/* Mute Toggle */}
                <button
                    onClick={toggleMute}
                    className={`h-16 w-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                        isMuted 
                        ? 'bg-slate-100 text-slate-900' 
                        : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600'
                    }`}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                        {isMuted ? 'Unmute' : 'Mute'}
                    </span>
                </button>

                {/* End Call */}
                <button
                    onClick={handleDisconnect}
                    className="h-16 w-32 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200"
                >
                    <PhoneOff className="w-6 h-6 fill-current" />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">End</span>
                </button>
            </div>
          )}
          
        </div>

      </main>

      {/* Footer */}
      <footer className="p-6 text-center w-full z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 border border-slate-200/60 backdrop-blur-sm text-slate-400 text-xs font-medium">
            <Globe className="w-3 h-3" />
            <span>Urdu & English Supported</span>
        </div>
      </footer>

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default App;