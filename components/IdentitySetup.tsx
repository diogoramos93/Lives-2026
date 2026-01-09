
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
    <div className="fixed inset-0 z-[90] bg-slate-950 flex flex-col items-center justify-start p-6 overflow-y-auto hide-scrollbar">
      <div className="max-w-xl w-full flex flex-col items-center py-10">
        <div className="text-center mb-10 shrink-0">
           <div className="inline-flex p-5 rounded-[2rem] bg-indigo-600/10 text-indigo-500 mb-6 border border-indigo-500/10">
             <UserCircle size={48} />
           </div>
           <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">COMO VOCÊ SE IDENTIFICA?</h2>
           <p className="text-slate-500 font-medium text-sm">Isso ajuda a personalizar sua experiência</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-14 w-full">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setMyIdentity(tag.id)}
              className={`p-6 rounded-3xl border-2 transition-all text-center font-black uppercase tracking-widest text-xs ${
                myIdentity === tag.id 
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 active:scale-95'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        <div className="text-center mb-10 shrink-0">
           <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">QUEM QUER ENCONTRAR?</h2>
           <p className="text-slate-500 font-medium text-sm">Pode escolher mais de uma opção</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-14 w-full">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleLookingFor(tag.id)}
              className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs ${
                lookingFor.includes(tag.id)
                ? 'border-rose-500 bg-rose-600 text-white shadow-xl shadow-rose-600/20' 
                : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 active:scale-95'
              }`}
            >
              {lookingFor.includes(tag.id) && <Check size={16} />}
              {tag.label}
            </button>
          ))}
          <button
            onClick={() => setLookingFor(tags.map(t => t.id))}
            className={`p-5 rounded-3xl border-2 transition-all font-black uppercase tracking-widest text-xs sm:col-span-3 ${
              lookingFor.length === tags.length
              ? 'border-rose-500 bg-rose-600 text-white'
              : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
            }`}
          >
            TODOS OS GÊNEROS
          </button>
        </div>

        <div className="w-full flex justify-center pb-12">
          <button
            disabled={!myIdentity}
            onClick={handleContinue}
            className="w-full max-w-sm flex items-center justify-center gap-4 bg-white text-black px-10 py-6 rounded-[2.5rem] font-black text-xl disabled:opacity-20 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
          >
            COMEÇAR <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdentitySetup;
