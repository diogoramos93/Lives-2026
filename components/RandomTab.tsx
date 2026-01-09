
import React, { useState, useEffect, useRef } from 'react';
import { SkipForward, Globe, MessageSquare } from 'lucide-react';
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerIdentity, setPartnerIdentity] = useState<string>('');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<any>(null);

  // Inicializa o socket assim que a aba abre, mas não entra na fila ainda
  useEffect(() => {
    const socket = io(`https://${MOTOR_DOMAIN}`, { 
      transports: ['websocket'], 
      forceNew: true,
      secure: true 
    });
    socketRef.current = socket;
    
    socket.on('match_found', ({ peerId, partnerInfo }: { peerId: string, partnerInfo: any }) => {
      setPartnerIdentity(partnerInfo.identity);
      setMessages([{ id: Date.now().toString(), user: 'Sistema', text: 'Conectado. Diga Oi!' }]);
      
      if (peerRef.current && streamRef.current) {
        const call = peerRef.current.call(peerId, streamRef.current);
        setupCallListeners(call);
        setStatus('connected');
      }
    });

    socket.on('partner_disconnected', () => {
      handleSkip();
    });

    socket.on('receive_random_message', (msg: string) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Estranho', text: msg }]);
    });

    return () => { 
      socket.emit('leave_match');
      cleanup(true); 
      socket.disconnect(); 
    };
  }, []);

  const cleanup = (stopStream = false) => {
    if (currentCallRef.current) { currentCallRef.current.close(); currentCallRef.current = null; }
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
      // Pede permissão e inicia stream apenas quando clica em começar
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, 
          audio: true 
        });
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }
      
      if (!peerRef.current) {
        const peer = new Peer({ config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] } });
        peerRef.current = peer;
        peer.on('open', (id) => {
          socketRef.current?.emit('join_queue', { 
            peerId: id, 
            identity: preferences.myIdentity, 
            lookingFor: preferences.lookingFor 
          });
        });
        peer.on('call', (call) => {
          if (streamRef.current) {
            call.answer(streamRef.current);
            setupCallListeners(call);
            setStatus('connected');
          }
        });
      } else {
        socketRef.current?.emit('join_queue', { 
          peerId: peerRef.current.id, 
          identity: preferences.myIdentity, 
          lookingFor: preferences.lookingFor 
        });
      }
    } catch (err) {
      setStatus('idle');
      alert("Para conversar, você precisa habilitar a câmera e o microfone.");
    }
  };

  const setupCallListeners = (call: any) => {
    currentCallRef.current = call;
    call.on('stream', (remoteStream: MediaStream) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    });
  };

  const handleSkip = () => {
    socketRef.current?.emit('leave_match'); 
    cleanup(false);
    setStatus('searching');
    setTimeout(() => {
      if (peerRef.current?.id) {
        socketRef.current?.emit('join_queue', { 
          peerId: peerRef.current.id, 
          identity: preferences.myIdentity, 
          lookingFor: preferences.lookingFor 
        });
      } else {
        startMatchmaking();
      }
    }, 100);
  };

  const sendMessage = (text: string) => {
    socketRef.current?.emit('send_random_message', text);
    setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Você', text }]);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-slate-950">
      {status === 'idle' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-indigo-600/10 rounded-full flex items-center justify-center mb-8 border border-indigo-600/20">
            <Globe size={48} className="text-indigo-500 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Conectar Instantaneamente</h2>
          <p className="text-slate-500 mb-10 max-w-xs text-sm">Sua câmera será ativada para iniciar o chat de vídeo com estranhos.</p>
          <Button onClick={startMatchmaking} className="px-16 py-6 text-xl rounded-full shadow-2xl shadow-indigo-600/20">
            ENTRAR NO CHAT
          </Button>
        </div>
      ) : (
        <>
          <div className="relative flex-1 flex flex-col min-h-0 bg-black overflow-hidden">
            <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-900">
              {status === 'searching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-30">
                  <div className="w-12 h-12 border-[3px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
                  <p className="text-indigo-500 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Buscando...</p>
                </div>
              )}
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover md:object-contain" />
              
              <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
                <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase border border-white/5 flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                  {status === 'connected' ? `ESTRANHO: ${partnerIdentity}` : 'PROCURANDO'}
                </div>
              </div>

              <div className="absolute bottom-6 left-6 w-28 sm:w-40 aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-white/10 z-40 shadow-2xl">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
              </div>

              <div className="absolute bottom-6 right-6 z-50">
                <button 
                  onClick={handleSkip} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-full shadow-2xl flex items-center gap-3 font-black transition-all active:scale-90 uppercase text-sm tracking-tight"
                >
                  <SkipForward size={20} /> PRÓXIMO
                </button>
              </div>
            </div>
          </div>
          <div className="w-full md:w-[350px] lg:w-[400px] h-[45dvh] md:h-full flex flex-col shrink-0 border-t md:border-t-0 md:border-l border-slate-800">
            <ChatBox messages={messages} onSendMessage={sendMessage} />
          </div>
        </>
      )}
    </div>
  );
};

export default RandomTab;
