
import React, { useState, useEffect, useRef } from 'react';
import { StreamInfo, ChatMessage, UserPreferences } from '../types';
import Button from './Button';
import ChatBox from './ChatBox';
import { Play, Users, Radio, X, Camera } from 'lucide-react';
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
  
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const socket = io(`https://${MOTOR_DOMAIN}`, { transports: ['websocket'], secure: true });
    socketRef.current = socket;

    socket.on('active_streams', (list: StreamInfo[]) => setStreams(list));
    socket.on('receive_live_message', (msg: ChatMessage) => setMessages(prev => [...prev, msg]));
    socket.on('stream_ended', (id) => {
      if (selectedStream?.id === id) {
        alert("A transmissão foi encerrada.");
        closeStream();
      }
    });

    const peer = new Peer({ config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] } });
    peerRef.current = peer;

    // Streamer aceita chamadas de espectadores (streaming silencioso)
    peer.on('call', (call) => {
      if (streamRef.current) {
        call.answer(streamRef.current);
      } else {
        call.close();
      }
    });

    return () => {
      socket.disconnect();
      stopMyStream();
      peer.destroy();
    };
  }, [selectedStream]);

  const startMyStream = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 } }, 
        audio: true 
      });
      streamRef.current = media;
      if (localVideoRef.current) localVideoRef.current.srcObject = media;
      
      setIsStreaming(true);
      socketRef.current?.emit('start_stream', { 
        id: peerRef.current?.id, 
        title: `Live de ${preferences.myIdentity}`, 
        tag: preferences.myIdentity, 
        streamerName: 'Você' 
      });
    } catch (err) {
      alert("Erro ao acessar câmera.");
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
    
    // O espectador "liga" para o streamer com um stream vazio para receber o sinal
    const call = peerRef.current?.call(stream.id, new MediaStream());
    call?.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });
  };

  const closeStream = () => {
    if (selectedStream) socketRef.current?.emit('leave_live_room', selectedStream.id);
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
            className={`w-full h-full object-cover md:object-contain ${isStreaming ? 'mirror' : ''}`} 
          />
          <div className="absolute top-4 right-4 z-50">
            <button onClick={isStreaming ? stopMyStream : closeStream} className="bg-rose-600 hover:bg-rose-500 p-3 rounded-full text-white shadow-xl transition-all active:scale-90">
              <X size={20} />
            </button>
          </div>
          <div className="absolute top-4 left-4 bg-rose-600 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse shadow-lg">AO VIVO</div>
        </div>
        <div className="w-full md:w-[350px] lg:w-[400px] h-[40dvh] md:h-full flex flex-col shrink-0 border-t md:border-t-0 md:border-l border-slate-800">
          <ChatBox 
            messages={messages} 
            placeholder="Comentar na live..."
            onSendMessage={(text) => {
              const roomId = isStreaming ? peerRef.current?.id : selectedStream?.id;
              if (roomId) socketRef.current?.emit('send_live_message', { roomId, text });
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col w-full overflow-hidden">
      <div className="p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-1">Lives Disponíveis</h1>
          <p className="text-slate-500 font-medium text-sm">Transmissões ao vivo em tempo real.</p>
        </div>
        <Button onClick={startMyStream} variant="danger" className="flex items-center gap-2 px-8 py-4 rounded-full shadow-xl shadow-rose-600/10">
          <Camera size={20} /> INICIAR LIVE
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 hide-scrollbar">
        {streams.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[2.5rem] opacity-30">
            <Radio size={48} className="mb-4 text-indigo-500" />
            <p className="font-black uppercase tracking-[0.3em] text-[10px]">Sem lives no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {streams.map((stream) => (
              <div 
                key={stream.id} 
                onClick={() => watchStream(stream)} 
                className="group cursor-pointer bg-slate-900/50 rounded-3xl overflow-hidden border border-slate-800 hover:border-rose-500 transition-all hover:scale-[1.02]"
              >
                <div className="aspect-video bg-slate-800 relative flex items-center justify-center">
                  <Play size={32} className="text-white/10 group-hover:text-rose-500 group-hover:scale-125 transition-all" />
                  <div className="absolute top-3 left-3 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg">LIVE</div>
                </div>
                <div className="p-5">
                  <h3 className="font-black text-white text-[11px] uppercase tracking-widest mb-2 truncate">{stream.title}</h3>
                  <div className="flex items-center justify-between opacity-50 text-[10px] font-bold">
                    <span className="bg-slate-800 px-2 py-0.5 rounded-lg border border-white/5 uppercase">{stream.tag}</span>
                    <span className="flex items-center gap-1.5"><Users size={12} className="text-rose-500" /> {stream.viewerCount}</span>
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
