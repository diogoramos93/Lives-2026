
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
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<any>(null);

  useEffect(() => {
    const socket = io(`https://${MOTOR_DOMAIN}`, { transports: ['websocket'], secure: true });
    socketRef.current = socket;
    
    socket.on('connect', () => setServerStatus('online'));
    
    socket.on('match_found', ({ peerId, partnerInfo }: { peerId: string, partnerInfo: any }) => {
      setPartnerIdentity(partnerInfo.identity);
      setMessages([{ id: Date.now().toString(), user: 'Sistema', text: `Conectado com um estranho (${partnerInfo.identity}).` }]);
      
      if (peerRef.current && streamRef.current) {
        const call = peerRef.current.call(peerId, streamRef.current);
        setupCallListeners(call);
        setStatus('connected');
      }
    });

    socket.on('partner_disconnected', () => {
      // Se o parceiro pular, eu recebo este aviso e busco um novo automaticamente
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

  const startStream = async () => {
    if (streamRef.current) return streamRef.current;
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, 
      audio: true 
    });
    streamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const startMatchmaking = async () => {
    setStatus('searching');
    setMessages([]);
    try {
      const stream = await startStream();
      
      if (!peerRef.current) {
        const peer = new Peer({ config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] } });
        peerRef.current = peer;
        peer.on('open', (id) => {
          socketRef.current?.emit('join_queue', { peerId: id, identity: preferences.myIdentity, lookingFor: preferences.lookingFor });
        });
        peer.on('call', (call) => {
          call.answer(stream);
          setupCallListeners(call);
          setStatus('connected');
        });
      } else {
        socketRef.current?.emit('join_queue', { peerId: peerRef.current.id, identity: preferences.myIdentity, lookingFor: preferences.lookingFor });
      }
    } catch (err) {
      setStatus('idle');
      alert("Habilite a câmera para conversar.");
    }
  };

  const setupCallListeners = (call: any) => {
    currentCallRef.current = call;
    call.on('stream', (remoteStream: MediaStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });
  };

  const handleSkip = () => {
    socketRef.current?.emit('leave_match'); // Notifica o outro lado para pular também
    cleanup(false);
    setStatus('searching');
    // Pequeno delay para sincronia com o motor
    setTimeout(() => {
      if (peerRef.current?.id) {
        socketRef.current?.emit('join_queue', { 
          peerId: peerRef.current.id, 
          identity: preferences.myIdentity, 
          lookingFor: preferences.lookingFor 
        });
      }
    }, 200);
  };

  const sendMessage = (text: string) => {
    socketRef.current?.emit('send_random_message', text);
    setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Você', text }]);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-slate-950">
      {status === 'idle' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Globe size={64} className="text-indigo-600 mb-8 animate-pulse" />
          <h2 className="text-4xl font-black mb-6 tracking-tighter uppercase">Conecte-se agora</h2>
          <Button onClick={startMatchmaking} disabled={serverStatus !== 'online'} className="px-14 py-6 text-xl rounded-full">
            {serverStatus === 'online' ? 'COMEÇAR CHAT' : 'CONECTANDO...'}
          </Button>
        </div>
      ) : (
        <>
          <div className="relative flex-1 flex flex-col min-h-0 bg-black overflow-hidden">
            <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-900">
              {status === 'searching' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-30">
                  <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-indigo-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Buscando...</p>
                </div>
              )}
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover md:object-contain bg-black" />
              
              <div className="absolute top-4 left-4 z-40 bg-black/60 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/5">
                {status === 'connected' ? `ESTRANHO: ${partnerIdentity}` : 'FILA DE ESPERA'}
              </div>

              <div className="absolute bottom-6 left-6 w-32 md:w-44 aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-white/10 z-40 shadow-2xl">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
              </div>

              <div className="absolute bottom-6 right-6 z-50">
                <button 
                  onClick={handleSkip} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-full shadow-2xl flex items-center gap-3 font-black transition-all active:scale-90"
                >
                  <SkipForward size={20} /> PRÓXIMO
                </button>
              </div>
            </div>
          </div>
          <div className="w-full md:w-[350px] lg:w-[400px] h-[40dvh] md:h-full flex flex-col shrink-0 border-t md:border-t-0 md:border-l border-slate-800">
            <ChatBox messages={messages} onSendMessage={sendMessage} />
          </div>
        </>
      )}
    </div>
  );
};

export default RandomTab;
