
import React, { useState } from 'react';
import { IdentityTag, UserPreferences } from '../types';
import { Check, ArrowRight } from 'lucide-react';

interface IdentitySetupProps {
  onComplete: (prefs: UserPreferences) => void;
}

const IdentitySetup: React.FC<IdentitySetupProps> = ({ onComplete }) => {
  const [myIdentity, setMyIdentity] = useState<IdentityTag | null>(null);
  const [lookingFor, setLookingFor] = useState<IdentityTag[]>([]);

  const tags: { id: IdentityTag, label: string }[] = [
    { id: 'homem', label: 'Homem' },
    { id: 'mulher', label: 'Mulher' },
    { id: 'mulher_trans', label: 'Mulher Trans' },
    { id: 'homem_trans', label: 'Homem Trans' },
    { id: 'nao_binario', label: 'Não-binário' },
    { id: 'outro', label: 'Outro' }
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
    <div className="fixed inset-0 z-[90] bg-slate-950 flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full py-12">
        <h2 className="text-4xl font-black text-center mb-12">Como você se identifica?</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setMyIdentity(tag.id)}
              className={`p-6 rounded-3xl border-2 transition-all text-center font-bold ${
                myIdentity === tag.id 
                ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400' 
                : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        <h2 className="text-4xl font-black text-center mb-12">Quem você quer encontrar?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleLookingFor(tag.id)}
              className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                lookingFor.includes(tag.id)
                ? 'border-rose-500 bg-rose-600/10 text-rose-400' 
                : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
              }`}
            >
              {lookingFor.includes(tag.id) && <Check size={18} />}
              {tag.label}
            </button>
          ))}
          <button
            onClick={() => setLookingFor(tags.map(t => t.id))}
            className={`p-6 rounded-3xl border-2 transition-all font-bold ${
              lookingFor.length === tags.length
              ? 'border-rose-500 bg-rose-600/10 text-rose-400'
              : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
            }`}
          >
            Qualquer um
          </button>
        </div>

        <div className="flex justify-center">
          <button
            disabled={!myIdentity}
            onClick={handleContinue}
            className="flex items-center gap-3 bg-white text-black px-12 py-5 rounded-full font-black text-xl disabled:opacity-30 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
          >
            Começar Agora <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdentitySetup;
