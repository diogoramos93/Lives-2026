
import React, { useState } from 'react';
import { IdentityTag, UserPreferences } from '../types';
import { Check, ArrowRight, UserCircle } from 'lucide-react';

interface IdentitySetupProps {
  onComplete: (prefs: UserPreferences) => void;
}

const IdentitySetup: React.FC<IdentitySetupProps> = ({ onComplete }) => {
  const [myIdentity, setMyIdentity] = useState<IdentityTag | null>(null);
  const [lookingFor, setLookingFor] = useState<IdentityTag[]>([]);

  const tags: { id: IdentityTag, label: string }[] = [
    { id: 'homem', label: 'Homem' },
    { id: 'mulher', label: 'Mulher' },
    { id: 'trans', label: 'Trans' }
  ];

  const toggleLookingFor = (tag: IdentityTag) => {
    setLookingFor(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleContinue = () => {
    if (myIdentity) {
      onComplete({ myIdentity, lookingFor });
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950 flex flex-col items-center justify-start md:justify-center p-4 overflow-y-auto hide-scrollbar">
      <div className="max-w-xl w-full py-10 md:py-0">
        <div className="text-center mb-10">
           <div className="inline-flex p-4 rounded-3xl bg-indigo-600/10 text-indigo-500 mb-6">
             <UserCircle size={40} />
           </div>
           <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Como você se identifica?</h2>
           <p className="text-slate-500 mt-2 font-medium">Isso ajuda no seu perfil de conexão</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setMyIdentity(tag.id)}
              className={`p-5 md:p-6 rounded-[1.5rem] border-2 transition-all text-center font-black uppercase tracking-widest text-xs md:text-sm ${
                myIdentity === tag.id 
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        <div className="text-center mb-10">
           <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Quem quer encontrar?</h2>
           <p className="text-slate-500 mt-2 font-medium">Selecione uma ou mais opções</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleLookingFor(tag.id)}
              className={`p-5 md:p-6 rounded-[1.5rem] border-2 transition-all flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs md:text-sm ${
                lookingFor.includes(tag.id)
                ? 'border-rose-500 bg-rose-600 text-white shadow-lg shadow-rose-600/20' 
                : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
              }`}
            >
              {lookingFor.includes(tag.id) && <Check size={16} />}
              {tag.label}
            </button>
          ))}
          <button
            onClick={() => setLookingFor(tags.map(t => t.id))}
            className={`p-5 md:p-6 rounded-[1.5rem] border-2 transition-all font-black uppercase tracking-widest text-xs md:text-sm sm:col-span-3 ${
              lookingFor.length === tags.length
              ? 'border-rose-500 bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
            }`}
          >
            Qualquer um
          </button>
        </div>

        <div className="flex justify-center pb-10 md:pb-0">
          <button
            disabled={!myIdentity}
            onClick={handleContinue}
            className="flex items-center gap-4 bg-white text-black px-10 md:px-14 py-5 rounded-[2rem] font-black text-lg md:text-xl disabled:opacity-20 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
          >
            ENTRAR NO MAISJOB <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdentitySetup;
