
import React, { useState, useEffect, useRef } from 'react';
import { SkipForward, Globe, RefreshCw, AlertCircle } from 'lucide-react';
import Button from './Button';
import ChatBox from './ChatBox';
import { ChatMessage, UserPreferences } from '../types';
import Peer from 'peerjs';
import { io, Socket } from 'socket.io-client';

const MOTOR_DOMAIN = 'fotos.diogoramos.esp.br';

interface RandomTabProps {
  preferences: UserPreferences;
}

const RandomTab: React.FC<RandomTabProps> = ({ preferences }) => {
  const [status, setStatus] = useState<'idle' | 'searching' | 'connected'>('idle');
  const [serverStatus, setServerStatus] = useState<'conectando' | 'online' | 'offline'>('conectando');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerIdentity, setPartnerIdentity] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [videoError, setVideoError] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<any>(null);

  const safePlay = async (videoEl: HTMLVideoElement | null) => {
    if (videoEl && videoEl.srcObject) {
      try {
        await videoEl.play();
        setVideoError(false);
      } catch (err) {
        console.warn("Auto-play blocked or failed:", err);
        setVideoError(true);
      }
    }
  };

  useEffect(() => {
    const socket = io(`https://${MOTOR_DOMAIN}`, { transports: ['websocket'], secure: true });
    socketRef.current = socket;
    socket.on('connect', () => setServerStatus('online'));
    socket.on('match_found', ({ peerId, partnerInfo }: { peerId: string, partnerInfo: any }) => {
      setPartnerIdentity(partnerInfo.identity);
      if (peerRef.current && streamRef.current) {
        const call = peerRef.current.call(peerId, streamRef.current);
        setupCallListeners(call);
        setMessages([{ id: Date.now().toString(), user: 'Sistema', text: `Conectado com ${partnerInfo.identity}.` }]);
      }
    });
    socket.on('partner_disconnected', () => handleSkip());
    socket.on('receive_random_message', (msg: string) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Estranho', text: msg }]);
    });
    return () => { cleanup(true); socket.disconnect(); };
  }, []);

  const cleanup = (stopStream = false) => {
    if (currentCallRef.current) { currentCallRef.current.close(); currentCallRef.current = null; }
    if (stopStream && streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const startStream = async (mode: 'user' | 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        safePlay(localVideoRef.current);
      }
      return stream;
    } catch (err) {
      console.error("Camera access error:", err);
      throw err;
    }
  };

  const startMatchmaking = async () => {
    setStatus('searching');
    setMessages([]);
    try {
      const stream = await startStream(facingMode);
      if (!peerRef.current) {
        const peer = new Peer({ config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] } });
        peerRef.current = peer;
        peer.on('open', (id) => {
          socketRef.current?.emit('join_queue', { peerId: id, identity: preferences.myIdentity, lookingFor: preferences.lookingFor });
        });
        peer.on('call', (call) => {
          call.answer(streamRef.current!);
          setupCallListeners(call);
        });
      } else {
        socketRef.current?.emit('join_queue', { peerId: peerRef.current.id, identity: preferences.myIdentity, lookingFor: preferences.lookingFor });
      }
    } catch (err) {
      setStatus('idle');
      alert("Erro ao acessar câmera. Verifique as permissões.");
    }
  };

  const toggleCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    try {
      const newStream = await startStream(newMode);
      if (currentCallRef.current && currentCallRef.current.peerConnection) {
        const videoTrack = newStream.getVideoTracks()[0];
        const sender = currentCallRef.current.peerConnection.getSenders().find((s: any) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      }
    } catch (e) {
      console.error("Toggle camera failed", e);
    }
  };

  const setupCallListeners = (call: any) => {
    currentCallRef.current = call;
    call.on('stream', (remoteStream: MediaStream) => {
      setStatus('connected');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        safePlay(remoteVideoRef.current);
      }
    });
  };

  const handleSkip = () => {
    socketRef.current?.emit('leave_match');
    cleanup(false);
    setStatus('searching');
    setTimeout(() => startMatchmaking(), 600);
  };

  const sendMessage = (text: string) => {
    socketRef.current?.emit('send_random_message', text);
    setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Você', text }]);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-slate-950">
      {status === 'idle' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto hide-scrollbar">
          <Globe size={64} className="text-indigo-600 mb-8 animate-pulse" />
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">PRONTO PARA CONECTAR?</h2>
          <Button onClick={startMatchmaking} disabled={serverStatus !== 'online'} className="px-14 py-6 text-xl rounded-[2rem] shadow-2xl shadow-indigo-600/20">
            {serverStatus === 'online' ? 'INICIAR AGORA' : 'CONECTANDO AO SERVIDOR...'}
          </Button>
        </div>
      ) : (
        <>
          {/* Container de Vídeo: min-h-0 e flex-1 garante que ele ocupe o espaço mas não extrapole */}
          <div className="relative flex-1 flex flex-col min-h-0 bg-black overflow-hidden">
            <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-900">
              {status === 'searching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-30">
                  <div className="w-14 h-14 border-[5px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
                  <p className="text-indigo-500 font-black uppercase text-xs tracking-[0.3em] animate-pulse">Buscando Parceiro...</p>
                </div>
              )}
              
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover md:object-contain bg-black" 
              />

              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40 p-6 text-center">
                  <button 
                    onClick={() => { safePlay(remoteVideoRef.current); safePlay(localVideoRef.current); }}
                    className="flex flex-col items-center gap-4 text-white"
                  >
                    <AlertCircle size={48} className="text-indigo-500" />
                    <span className="font-black uppercase tracking-widest text-sm">Clique aqui para ativar vídeo/áudio</span>
                  </button>
                </div>
              )}

              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
                {status === 'connected' && (
                  <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10">
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">{partnerIdentity}</span>
                  </div>
                )}
              </div>

              {/* Controles Flutuantes */}
              <div className="absolute top-4 right-4 z-40 flex flex-col gap-3 pointer-events-auto">
                <button 
                  onClick={toggleCamera} 
                  className="bg-black/40 hover:bg-indigo-600 p-4 rounded-3xl backdrop-blur-xl transition-all border border-white/10 text-white shadow-2xl"
                  title="Trocar Câmera"
                >
                  <RefreshCw size={22} />
                </button>
              </div>

              {/* Preview Local - Responsivo e posicionado com margem de segurança */}
              <div className="absolute bottom-6 left-6 w-28 sm:w-36 md:w-48 aspect-[3/4] sm:aspect-video bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-40">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'mirror' : ''}`} 
                />
              </div>

              <div className="absolute bottom-6 right-6 z-50">
                <button 
                  onClick={handleSkip} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 sm:px-10 sm:py-5 rounded-[2rem] shadow-2xl flex items-center gap-3 font-black transition-all hover:scale-105 active:scale-95 border border-white/10"
                >
                  <SkipForward size={24} /> 
                  <span className="hidden sm:inline tracking-tighter">PRÓXIMO</span>
                </button>
              </div>
            </div>
          </div>

          {/* Chat lateral: h-[35vh] no mobile, full no desktop */}
          <div className="w-full md:w-[350px] lg:w-[400px] h-[35dvh] md:h-full flex flex-col shrink-0 border-t md:border-t-0 md:border-l border-slate-800 min-h-0">
            <ChatBox messages={messages} onSendMessage={sendMessage} />
          </div>
        </>
      )}
    </div>
  );
};

export default RandomTab;
