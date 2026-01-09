
import React, { useState, useRef, useEffect } from 'react';
import { Send, Shield } from 'lucide-react';
import { ChatMessage } from '../types';
import { moderateLocalText } from '../services/moderationService';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  placeholder?: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, placeholder = "Digite algo..." }) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = input.trim().substring(0, 500); // Production: Limit length
    if (!cleanInput) return;

    if (moderateLocalText(cleanInput)) {
      onSendMessage(cleanInput);
      setInput('');
    } else {
      // Simple feedback without annoying alerts
      setInput('');
      alert("Aviso: Mensagem bloqueada pelos filtros de segurança.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-xl border-l border-slate-800/50">
      {/* Chat Header for Context */}
      <div className="px-4 py-2 border-b border-slate-800/50 flex items-center gap-2 bg-slate-950/20">
        <Shield size={10} className="text-indigo-500" />
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Chat Moderado</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.user === 'Você' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.user === 'Você' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : msg.user === 'MaisJob' || msg.user === 'Sistema'
                  ? 'bg-slate-800/50 text-slate-400 text-xs italic border border-slate-700/50'
                  : 'bg-slate-800 text-slate-200 rounded-tl-none'
            }`}>
              {msg.user !== 'Você' && msg.user !== 'MaisJob' && msg.user !== 'Sistema' && (
                <div className="text-[10px] font-black mb-1 text-indigo-400 uppercase tracking-tighter">
                  Estranho
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      
      <form 
        onSubmit={handleSubmit} 
        className="p-4 bg-slate-950/40 border-t border-slate-800/50 flex gap-2"
        autoComplete="off"
      >
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600 transition-all"
          maxLength={500}
        />
        <button 
          type="submit" 
          disabled={!input.trim()}
          className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 transition-all active:scale-90 disabled:opacity-30 disabled:active:scale-100 shadow-lg shadow-indigo-600/10"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
