
import React, { useState, useEffect, useRef } from 'react';
import { StreamInfo, ChatMessage, UserPreferences } from '../types';
import Button from './Button';
import ChatBox from './ChatBox';
import { Play, Users, Radio, X, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import Peer from 'peerjs';

const MOTOR_DOMAIN = 'fotos.diogoramos.esp.br';

interface LiveTabProps {
  preferences: UserPreferences;
}

const LiveTab: React.FC<LiveTabProps> = ({ preferences }) => {
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [selectedStream, setSelectedStream] = useState<StreamInfo | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [videoError, setVideoError] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const safePlay = async (videoEl: HTMLVideoElement | null) => {
    if (videoEl && videoEl.srcObject) {
      try { 
        await videoEl.play(); 
        setVideoError(false);
      } catch (err) { 
        console.warn("Live play blocked:", err); 
        setVideoError(true);
      }
    }
  };

  useEffect(() => {
    // Conecta ao mesmo motor do Random
    const socket = io(`https://${MOTOR_DOMAIN}`, { transports: ['websocket'], secure: true });
    socketRef.current = socket;

    socket.on('active_streams', (list: StreamInfo[]) => {
      setStreams(list);
    });

    socket.on('receive_live_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('stream_ended', (id) => {
      if (selectedStream?.id === id) {
        alert("Esta transmissão foi encerrada pelo autor.");
        closeStream();
      }
    });

    // Inicializa PeerJS
    peerRef.current = new Peer({ 
      config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] } 
    });

    return () => {
      socket.disconnect();
      if (peerRef.current) peerRef.current.destroy();
      stopMyStream();
    };
  }, [selectedStream]);

  const startStream = async (mode: 'user' | 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    const media = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }, 
      audio: true 
    });
    streamRef.current = media;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = media;
      safePlay(localVideoRef.current);
    }
    return media;
  };

  const startMyStream = async () => {
    try {
      const stream = await startStream(facingMode);
      setIsStreaming(true);
      
      // Quando alguém ligar para nós (espectador), enviamos nosso stream
      peerRef.current?.on('call', (call) => {
        call.answer(stream);
      });

      socketRef.current?.emit('start_stream', { 
        id: peerRef.current?.id, 
        title: `Live de ${preferences.myIdentity}`, 
        tag: preferences.myIdentity, 
        streamerName: 'Você' 
      });

    } catch (err) {
      console.error(err);
      alert("Erro ao acessar câmera para iniciar live.");
    }
  };

  const toggleCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isStreaming) {
      const newStream = await startStream(newMode);
      // Aqui poderíamos atualizar as chamadas ativas, mas no modelo de live 1-N, 
      // o PeerJS gerencia melhor reiniciando o stream local.
    }
  };

  const stopMyStream = () => {
    socketRef.current?.emit('stop_stream');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const watchStream = (stream: StreamInfo) => {
    setSelectedStream(stream);
    setMessages([]);
    socketRef.current?.emit('join_live_room', stream.id);
    
    // Ligamos para o streamer (não enviamos áudio/vídeo, apenas recebemos)
    const call = peerRef.current?.call(stream.id, new MediaStream());
    call?.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        safePlay(remoteVideoRef.current);
      }
    });
  };

  const closeStream = () => {
    if (selectedStream) {
      socketRef.current?.emit('leave_live_room', selectedStream.id);
    }
    setSelectedStream(null);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  if (selectedStream || isStreaming) {
    return (
      <div className="flex flex-col md:flex-row h-full w-full bg-slate-950 overflow-hidden">
        <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden min-h-0">
          <video 
            ref={isStreaming ? localVideoRef : remoteVideoRef} 
            autoPlay 
            playsInline 
            muted={isStreaming} 
            className={`w-full h-full object-cover md:object-contain ${isStreaming && facingMode === 'user' ? 'mirror' : ''}`} 
          />
          
          {videoError && !isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40 p-6 text-center">
              <button onClick={() => safePlay(remoteVideoRef.current)} className="flex flex-col items-center gap-4 text-white">
                <AlertCircle size={48} className="text-indigo-500" />
                <span className="font-black uppercase tracking-widest text-sm">Clique para ativar a live</span>
              </button>
            </div>
          )}

          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20 pointer-events-auto">
            <div className="bg-black/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-3">
               <Radio size={18} className="text-rose-500 animate-pulse" />
               <h2 className="text-white font-black text-[10px] uppercase tracking-wider">{isStreaming ? "SUA TRANSMISSÃO" : selectedStream?.title}</h2>
            </div>
            <div className="flex gap-2">
              {isStreaming && (
                <button onClick={toggleCamera} className="bg-black/40 hover:bg-black/60 p-3 rounded-2xl backdrop-blur-xl text-white border border-white/10">
                  <RefreshCw size={20} />
                </button>
              )}
              <button onClick={isStreaming ? stopMyStream : closeStream} className="bg-rose-600 hover:bg-rose-500 p-3 rounded-2xl text-white shadow-xl transition-all">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
        <div className="w-full md:w-[350px] lg:w-[400px] h-[35dvh] md:h-full flex flex-col shrink-0 min-h-0 border-t md:border-t-0 md:border-l border-slate-800">
          <ChatBox 
            messages={messages} 
            placeholder="Comente na live..."
            onSendMessage={(text) => {
              const roomId = isStreaming ? peerRef.current?.id : selectedStream?.id;
              if (roomId) {
                socketRef.current?.emit('send_live_message', { roomId, text });
              }
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col w-full overflow-hidden">
      <div className="p-6 md:p-10 shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">LIVES AO VIVO</h1>
            <p className="text-slate-500 font-medium">Assista ou comece sua própria transmissão agora.</p>
          </div>
          <Button onClick={startMyStream} variant="danger" className="flex items-center gap-3 px-8 py-5 rounded-3xl shadow-2xl shadow-rose-600/20">
            <Camera size={22} /> 
            <span className="font-black uppercase tracking-widest text-sm">ENTRAR AO VIVO</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 hide-scrollbar">
        {streams.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-40">
            <Radio size={48} className="mb-4" />
            <p className="font-black uppercase tracking-[0.2em] text-xs">Nenhuma live no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {streams.map((stream) => (
              <div 
                key={stream.id} 
                onClick={() => watchStream(stream)} 
                className="group cursor-pointer bg-slate-900/50 rounded-[2.5rem] overflow-hidden border border-slate-800 hover:border-indigo-500 transition-all hover:-translate-y-1 shadow-xl"
              >
                <div className="aspect-video bg-slate-800 relative flex items-center justify-center overflow-hidden">
                  <Play size={40} className="text-white/20 group-hover:scale-125 transition-transform" />
                  <div className="absolute top-4 left-4 bg-rose-600 text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div> AO VIVO
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-black text-white line-clamp-1 uppercase text-xs tracking-widest mb-3">{stream.title}</h3>
                  <div className="flex items-center justify-between opacity-50 text-[10px] font-bold">
                    <span className="bg-slate-800 px-3 py-1 rounded-lg capitalize">{stream.tag}</span>
                    <span className="flex items-center gap-1.5"><Users size={12} /> {stream.viewerCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTab;
