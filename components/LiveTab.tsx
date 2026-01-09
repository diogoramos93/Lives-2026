
import React, { useState, useEffect, useRef } from 'react';
import { StreamInfo, ChatMessage, UserPreferences, IdentityTag } from '../types';
import Button from './Button';
import ChatBox from './ChatBox';
import { Play, Users, Radio, X, Camera, LayoutGrid, ShieldCheck } from 'lucide-react';
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
  const [activeFilter] = useState<IdentityTag | 'all'>('all');
  
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const safePlay = async (videoEl: HTMLVideoElement | null) => {
    if (videoEl && videoEl.srcObject) {
      try {
        await videoEl.play();
      } catch (err) {
        console.warn("Mobile play issue:", err);
      }
    }
  };

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
        alert("A transmissão foi encerrada.");
        closeStream();
      }
    });

    peerRef.current = new Peer({
      config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
    });

    return () => {
      socket.disconnect();
      peerRef.current?.destroy();
      stopMyStream();
    };
  }, [selectedStream]);

  const startMyStream = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = media;
      setIsStreaming(true);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = media;
        safePlay(localVideoRef.current);
      }

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
      alert("Permita o acesso à câmera.");
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
    setMessages([]);
  };

  const filteredStreams = streams.filter(s => activeFilter === 'all' || s.tag === activeFilter);

  if (selectedStream || isStreaming) {
    return (
      <div className="flex flex-col md:flex-row h-full w-full bg-slate-950 overflow-hidden">
        {/* Stream Viewport - Responsive Container */}
        <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden min-h-0">
          <video 
            ref={isStreaming ? localVideoRef : remoteVideoRef} 
            autoPlay 
            playsInline 
            muted={isStreaming}
            className={`w-full h-full max-h-full object-contain ${isStreaming ? 'mirror' : ''}`} 
          />
          
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl pointer-events-auto">
               <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Radio size={20} className="text-white animate-pulse" />
               </div>
               <div className="min-w-0">
                  <h2 className="text-white font-black text-xs truncate uppercase tracking-tighter">
                    {isStreaming ? "Você está online" : selectedStream?.title}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                    <span className="text-rose-500 text-[8px] font-black uppercase tracking-widest">LIVE</span>
                  </div>
               </div>
            </div>

            <button 
              onClick={isStreaming ? stopMyStream : closeStream}
              className="bg-white/10 hover:bg-rose-600 p-3 rounded-2xl backdrop-blur-xl transition-all shadow-2xl group pointer-events-auto"
            >
              <X size={20} className="text-white group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-10 pointer-events-none">
             <div className="flex flex-col gap-2">
                {!isStreaming && (
                  <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                    <Users size={14} className="text-indigo-400" />
                    <span className="text-[10px] font-bold text-white">{selectedStream?.viewerCount || 0} assistindo</span>
                  </div>
                )}
             </div>
          </div>
        </div>
        
        {/* Stream Chat Area */}
        <div className="w-full md:w-[350px] lg:w-[400px] h-[35vh] md:h-full flex flex-col shrink-0 min-h-0 border-t md:border-t-0 md:border-l border-slate-800/50 shadow-2xl">
          <ChatBox 
            messages={messages} 
            onSendMessage={(text) => {
              socketRef.current?.emit('send_live_message', {
                roomId: isStreaming ? peerRef.current?.id : selectedStream?.id,
                text
              });
              setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Você', text }]);
            }} 
            placeholder="Diga algo na live..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
          <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tighter">LIVES AO VIVO</h1>
          <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">Descubra transmissões agora</p>
        </div>
        
        <Button onClick={startMyStream} variant="danger" className="flex items-center justify-center gap-3 px-8 shadow-xl shadow-rose-600/20 text-sm">
          <Camera size={20} /> ENTRAR AO VIVO
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 hide-scrollbar">
        {streams.length === 0 ? (
          <div className="h-64 md:h-96 flex flex-col items-center justify-center text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800 p-8">
             <LayoutGrid size={48} className="mb-4 text-slate-700 opacity-20" />
             <p className="font-bold text-slate-500">Silêncio total por aqui...</p>
             <p className="text-[10px] text-slate-600 max-w-xs mt-2 uppercase tracking-widest">Inicie sua própria live para quebrar o gelo!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {filteredStreams.map((stream) => (
              <div 
                key={stream.id}
                onClick={() => watchStream(stream)}
                className="group cursor-pointer bg-slate-900/40 rounded-[2.5rem] overflow-hidden border border-slate-800/50 hover:border-indigo-500/50 transition-all hover:shadow-2xl"
              >
                <div className="relative aspect-video bg-slate-800 flex items-center justify-center overflow-hidden">
                  <Play size={40} className="text-white/20 group-hover:text-indigo-500 group-hover:scale-125 transition-all duration-500" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-rose-600 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg text-white">LIVE</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-black text-slate-100 mb-2 line-clamp-1">{stream.title}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">{stream.tag}</p>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                      <Users size={12} /> {stream.viewerCount}
                    </div>
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
