
import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface AgeGateProps {
  onConfirm: () => void;
}

const AgeGate: React.FC<AgeGateProps> = ({ onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-md w-full my-auto">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl shadow-black text-center relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 via-indigo-600 to-rose-600"></div>
          
          <div className="w-24 h-24 bg-rose-600/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse-soft">
            <ShieldAlert size={48} strokeWidth={2.5} />
          </div>
          
          <h1 className="text-3xl font-black mb-4 tracking-tight">AVISO DE CONTEÚDO</h1>
          
          <div className="space-y-4 mb-10">
            <p className="text-slate-300 text-sm leading-relaxed">
              Esta plataforma é exclusiva para interações espontâneas entre adultos. Ao prosseguir, você concorda com nossos termos:
            </p>
            
            <ul className="text-left text-xs text-slate-500 space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
              <li className="flex gap-2">
                <span className="text-rose-500">•</span>
                Você confirma ter no mínimo 18 anos de idade.
              </li>
              <li className="flex gap-2">
                <span className="text-rose-500">•</span>
                Proibido assédio, ódio ou atividades ilegais.
              </li>
              <li className="flex gap-2">
                <span className="text-rose-500">•</span>
                A plataforma não armazena dados pessoais dos usuários.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <button 
              onClick={onConfirm}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20 text-lg"
            >
              CONCORDO E TENHO 18+
            </button>
            <button 
              onClick={() => window.location.href = 'https://www.google.com'}
              className="w-full bg-transparent border border-slate-800 hover:bg-slate-800 text-slate-500 font-bold py-4 rounded-2xl transition-all"
            >
              NÃO TENHO IDADE / SAIR
            </button>
          </div>
          
          <p className="mt-8 text-[9px] text-slate-600 uppercase tracking-[0.25em] font-medium">
            Sua conexão é Protegida e Anônima
          </p>
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-600 text-[10px] uppercase font-bold tracking-widest opacity-50">
           <AlertTriangle size={12} /> Cuidado com Golpes • Nunca compartilhe senhas
        </div>
      </div>
    </div>
  );
};

export default AgeGate;
