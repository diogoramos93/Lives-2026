
import React, { useState, useEffect, useRef } from 'react';
import { StreamInfo, ChatMessage, UserPreferences, IdentityTag } from '../types';
import Button from './Button';
import ChatBox from './ChatBox';
import { Play, Users, Radio, X, Camera, Mic, LayoutGrid, AlertCircle } from 'lucide-react';
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
  const [activeFilter, setActiveFilter] = useState<IdentityTag | 'all'>('all');
  
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const socket = io(`https://${MOTOR_DOMAIN}`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('active_streams', (list: StreamInfo[]) => {
      setStreams(list);
    });

    socket.on('receive_live_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('stream_ended', (peerId: string) => {
      if (selectedStream?.id === peerId) {
        alert("A transmissão foi encerrada pelo autor.");
        closeStream();
      }
    });

    // PeerJS para o espectador receber o vídeo
    peerRef.current = new Peer({
      config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
    });

    return () => {
      socket.disconnect();
      peerRef.current?.destroy();
      stopMyStream();
    };
  }, []);

  const startMyStream = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = media;
      setIsStreaming(true);
      
      if (localVideoRef.current) localVideoRef.current.srcObject = media;

      // Quando alguém "chamar" (call) para assistir
      peerRef.current?.on('call', (call) => {
        call.answer(streamRef.current!);
      });

      socketRef.current?.emit('start_stream', {
        id: peerRef.current?.id,
        title: `${preferences.myIdentity} ao vivo`,
        tag: preferences.myIdentity,
        streamerName: 'Você'
      });

    } catch (err) {
      alert("Erro ao iniciar câmera.");
    }
  };

  const stopMyStream = () => {
    socketRef.current?.emit('stop_stream');
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsStreaming(false);
    setMessages([]);
  };

  const watchStream = (stream: StreamInfo) => {
    setSelectedStream(stream);
    setMessages([]);
    socketRef.current?.emit('join_live_room', stream.id);

    // O espectador "liga" para o streamer
    const call = peerRef.current?.call(stream.id, new MediaStream()); // Chamada vazia só para receber
    call?.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    });
  };

  const closeStream = () => {
    if (selectedStream) {
      socketRef.current?.emit('leave_live_room', selectedStream.id);
    }
    setSelectedStream(null);
    setMessages([]);
  };

  const filteredStreams = streams.filter(s => activeFilter === 'all' || s.tag === activeFilter);

  if (selectedStream || isStreaming) {
    return (
      <div className="flex flex-col md:flex-row h-full bg-black">
        <div className="flex-1 bg-black relative flex flex-col items-center justify-center overflow-hidden">
          <video 
            ref={isStreaming ? localVideoRef : remoteVideoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover ${isStreaming ? 'mirror' : ''}`} 
          />
          
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
            <div className="bg-black/40 backdrop-blur-2xl p-4 rounded-[2rem] border border-white/10 flex items-center gap-4">
               <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Radio className="text-white animate-pulse" />
               </div>
               <div>
                  <h2 className="text-white font-black text-sm">{isStreaming ? "Sua Live" : selectedStream?.title}</h2>
                  <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-rose-500 rounded-full"></span> AO VIVO
                  </p>
               </div>
            </div>

            <button 
              onClick={isStreaming ? stopMyStream : closeStream}
              className="bg-white/10 hover:bg-rose-600 p-4 rounded-3xl backdrop-blur-xl transition-all shadow-2xl group"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          {!isStreaming && (
            <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
              <Users size={14} className="text-indigo-400" />
              <span className="text-xs font-bold text-white">{selectedStream?.viewerCount || 0} assistindo</span>
            </div>
          )}
        </div>
        
        <div className="w-full md:w-96 h-80 md:h-full">
          <ChatBox 
            messages={messages} 
            onSendMessage={(text) => {
              socketRef.current?.emit('send_live_message', {
                roomId: isStreaming ? peerRef.current?.id : selectedStream?.id,
                text
              });
              setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Você', text }]);
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-5xl font-black mb-2 tracking-tighter">Explorar</h1>
          <p className="text-slate-500 font-medium">Transmissões ao vivo agora no {MOTOR_DOMAIN}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={startMyStream} variant="danger" className="flex items-center gap-3 px-8 shadow-xl shadow-rose-600/20">
            <Camera size={20} /> ENTRAR AO VIVO
          </Button>
        </div>
      </div>

      {streams.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800">
           <LayoutGrid size={64} className="mb-4 text-slate-700" />
           <p className="font-bold text-slate-500">Nenhuma live ativa no momento.</p>
           <p className="text-xs text-slate-600 max-w-xs mt-2">Seja o primeiro a transmitir clicando no botão acima!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-20">
          {filteredStreams.map((stream) => (
            <div 
              key={stream.id}
              onClick={() => watchStream(stream)}
              className="group cursor-pointer bg-slate-900/40 rounded-[2.5rem] overflow-hidden border border-slate-800/50 hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-600/10"
            >
              <div className="relative aspect-[4/3] bg-slate-800">
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/10">
                   <Play size={48} className="text-white/20 group-hover:text-indigo-500 group-hover:scale-125 transition-all duration-500" />
                </div>
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-rose-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-lg">LIVE</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-black text-slate-100 mb-2 line-clamp-1 text-lg">{stream.title}</h3>
                <div className="flex items-center justify-between">
                  <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">{stream.tag}</p>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                    <Users size={14} /> {stream.viewerCount}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveTab;
