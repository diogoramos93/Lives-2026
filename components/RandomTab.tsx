
import React, { useState, useEffect, useRef } from 'react';
import { SkipForward, Globe, User, ShieldCheck } from 'lucide-react';
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
  const [onlineCount, setOnlineCount] = useState(0);
  const [partnerIdentity, setPartnerIdentity] = useState<string>('');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<any>(null);

  // Helper para garantir que o vídeo comece a tocar (vital para mobile)
  const safePlay = async (videoEl: HTMLVideoElement | null) => {
    if (videoEl && videoEl.srcObject) {
      try {
        await videoEl.play();
      } catch (err) {
        console.warn("Autoplay bloqueado ou erro no play:", err);
      }
    }
  };

  useEffect(() => {
    const socket = io(`https://${MOTOR_DOMAIN}`, {
      transports: ['websocket'],
      secure: true
    });
    
    socketRef.current = socket;

    socket.on('connect', () => setServerStatus('online'));
    socket.on('connect_error', () => setServerStatus('offline'));
    socket.on('online_stats', (count: number) => setOnlineCount(count));

    socket.on('match_found', ({ peerId, partnerInfo }: { peerId: string, partnerInfo: any }) => {
      setPartnerIdentity(partnerInfo.identity);
      if (peerRef.current && streamRef.current) {
        const call = peerRef.current.call(peerId, streamRef.current);
        setupCallListeners(call);
        setMessages([{ id: Date.now().toString(), user: 'Sistema', text: `Conectado com ${partnerInfo.identity}.` }]);
      }
    });

    socket.on('partner_disconnected', () => {
      setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Sistema', text: 'O parceiro saiu da conversa.' }]);
      handleSkip();
    });

    socket.on('receive_random_message', (msg: string) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Estranho', text: msg }]);
    });

    return () => {
      cleanup();
      socket.disconnect();
    };
  }, []);

  const cleanup = (stopStream = false) => {
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    if (stopStream && streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const startMatchmaking = async () => {
    setStatus('searching');
    setMessages([]);
    
    try {
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          safePlay(localVideoRef.current);
        }
      }

      if (!peerRef.current) {
        const peer = new Peer({
          config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
        });
        peerRef.current = peer;

        peer.on('open', (id) => {
          socketRef.current?.emit('join_queue', {
            peerId: id,
            identity: preferences.myIdentity,
            lookingFor: preferences.lookingFor
          });
        });

        peer.on('call', (call) => {
          call.answer(streamRef.current!);
          setupCallListeners(call);
        });
      } else {
        socketRef.current?.emit('join_queue', {
          peerId: peerRef.current.id,
          identity: preferences.myIdentity,
          lookingFor: preferences.lookingFor
        });
      }

    } catch (err) {
      console.error(err);
      setStatus('idle');
      alert("Erro ao acessar câmera/microfone. Verifique as permissões.");
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
    call.on('close', () => setStatus('searching'));
  };

  const handleSkip = () => {
    socketRef.current?.emit('leave_match');
    cleanup(false);
    setStatus('searching');
    setTimeout(() => {
      startMatchmaking();
    }, 1500);
  };

  const sendMessage = (text: string) => {
    socketRef.current?.emit('send_random_message', text);
    setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Você', text }]);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-slate-950">
      {status === 'idle' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
          <div className="relative mb-8 shrink-0">
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse"></div>
            <div className="relative w-32 h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
               <Globe size={60} className="text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-black mb-4 tracking-tighter shrink-0">MAISJOB RANDOM</h2>
          <p className="text-slate-400 mb-8 max-w-sm font-medium shrink-0">
            {onlineCount} usuários ativos. Clique abaixo para conectar via vídeo.
          </p>

          <Button 
            onClick={startMatchmaking} 
            disabled={serverStatus !== 'online'} 
            className="px-12 py-5 text-xl shadow-2xl shadow-indigo-600/20 shrink-0"
          >
            {serverStatus === 'online' ? 'CONECTAR AGORA' : 'CONECTANDO...'}
          </Button>
        </div>
      ) : (
        <>
          {/* Main Video Area - Constraint strictly to viewport height */}
          <div className="relative flex-1 flex flex-col min-h-0 bg-black">
            
            {/* The Video Container Box - Flex-grow allows it to fit but object-contain avoids cropping */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-900/10 overflow-hidden">
              {status === 'searching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-30">
                  <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
                  <p className="font-black text-indigo-400 animate-pulse tracking-widest text-xs uppercase">Conectando...</p>
                </div>
              )}
              
              {/* REMOTE VIDEO - object-contain ensures FULL image is visible regardless of ratio */}
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full max-h-full object-contain bg-black shadow-inner" 
              />
              
              {/* STATUS OVERLAYS */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-20 pointer-events-none">
                {status === 'connected' && (
                  <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">{partnerIdentity || 'Estranho'}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-indigo-600/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <ShieldCheck size={12} className="text-white" />
                  <span className="text-[9px] font-black text-white uppercase tracking-tighter">HD • Encrypted</span>
                </div>
              </div>

              {/* LOCAL VIDEO - Small fixed float */}
              <div className="absolute bottom-4 left-4 w-28 md:w-52 aspect-video bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-40">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover mirror" 
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="absolute bottom-4 right-4 flex gap-3 z-50">
                <button 
                  onClick={handleSkip} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-5 md:px-8 md:py-5 rounded-[2rem] shadow-2xl flex items-center gap-2 font-black transition-all active:scale-90 hover:scale-105"
                >
                  <SkipForward size={24} /> 
                  <span className="hidden sm:inline">PULAR</span>
                </button>
              </div>
            </div>
          </div>

          {/* Chat Side Area - Balanced height on mobile */}
          <div className="w-full md:w-[350px] lg:w-[400px] h-[35vh] md:h-full flex flex-col shrink-0 min-h-0 border-t md:border-t-0 md:border-l border-slate-800/50 shadow-2xl z-50">
            <ChatBox 
              messages={messages} 
              onSendMessage={sendMessage} 
              placeholder="Envie uma mensagem..."
            />
          </div>
        </>
      )}
    </div>
  );
};

export default RandomTab;
