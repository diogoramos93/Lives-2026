
import React, { useState, useEffect, useRef } from 'react';
import { SkipForward, Globe, SkipBack, User } from 'lucide-react';
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
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
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
    }
  };

  const setupCallListeners = (call: any) => {
    currentCallRef.current = call;
    call.on('stream', (remoteStream: MediaStream) => {
      setStatus('connected');
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
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
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-black">
      {status === 'idle' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse"></div>
            <div className="relative w-32 h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
               <Globe size={60} className="text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-black mb-4 tracking-tighter">Pronto para começar?</h2>
          <p className="text-slate-400 mb-8 max-w-sm font-medium">
            Conectado ao servidor seguro: <span className="text-indigo-400 font-bold uppercase tracking-widest">Online</span>
          </p>

          <Button 
            onClick={startMatchmaking} 
            disabled={serverStatus !== 'online'} 
            className="px-12 py-5 text-xl shadow-2xl shadow-indigo-600/20"
          >
            {serverStatus === 'online' ? 'INICIAR CHAT VÍDEO' : 'CONECTANDO...'}
          </Button>
        </div>
      ) : (
        <>
          <div className="relative flex-1 bg-slate-950 flex flex-col p-1">
            <div className="relative flex-1 bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
              {status === 'searching' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-30">
                  <div className="w-20 h-20 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
                  <p className="font-black text-indigo-400 animate-pulse tracking-widest text-xs uppercase">Buscando nova conexão...</p>
                  <p className="text-slate-600 text-[10px] mt-2 uppercase">{onlineCount} usuários ativos</p>
                </div>
              ) : (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              )}
              
              {status === 'connected' && (
                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase text-white tracking-widest">{partnerIdentity || 'Estranho'}</span>
                </div>
              )}
            </div>

            <div className="absolute bottom-6 left-6 w-36 md:w-48 aspect-[3/4] bg-slate-800 rounded-3xl overflow-hidden border-4 border-black shadow-2xl z-40 group">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <User className="text-white/50" />
              </div>
            </div>

            <div className="absolute bottom-6 right-6 z-50 flex gap-2">
              <button 
                onClick={handleSkip} 
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-2 font-black transition-all active:scale-90 hover:scale-105"
              >
                <SkipForward size={24} /> PRÓXIMO
              </button>
            </div>
          </div>

          <div className="w-full md:w-80 lg:w-96 h-80 md:h-full">
            <ChatBox 
              messages={messages} 
              onSendMessage={sendMessage} 
            />
          </div>
        </>
      )}
    </div>
  );
};

export default RandomTab;
