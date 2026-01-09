import React, { useState, useEffect, useMemo, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import { AppTab, UserPreferences } from './types';
import Navbar from './components/Navbar';
import RandomTab from './components/RandomTab';
import LiveTab from './components/LiveTab';
import AgeGate from './components/AgeGate';
import IdentitySetup from './components/IdentitySetup';
import { Settings2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Fix: Using React.Component explicitly to ensure 'this.props' is correctly typed and recognized by the TypeScript compiler.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Critical Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
          <h1 className="text-xl font-bold mb-4">Erro de Inicialização</h1>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 px-6 py-2 rounded-xl text-sm font-bold">Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [is18Plus, setIs18Plus] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    myIdentity: null,
    lookingFor: []
  });
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);

  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 600);
    }

    try {
      const ageConfirmed = sessionStorage.getItem('age_confirmed') === 'true';
      if (ageConfirmed) setIs18Plus(true);
      
      const savedPrefs = sessionStorage.getItem('user_prefs');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed?.myIdentity) setPreferences(parsed);
      }
    } catch (e) {
      console.warn("Session error:", e);
    }
  }, []);

  const handleAgeConfirm = () => {
    setIs18Plus(true);
    sessionStorage.setItem('age_confirmed', 'true');
  };

  const handleSetupComplete = (prefs: UserPreferences) => {
    setPreferences(prefs);
    sessionStorage.setItem('user_prefs', JSON.stringify(prefs));
    setActiveTab(AppTab.RANDOM);
  };

  const resetIdentity = () => {
    sessionStorage.removeItem('user_prefs');
    setPreferences({ myIdentity: null, lookingFor: [] });
  };

  const identityLabel = useMemo(() => {
    return preferences.myIdentity?.replace('_', ' ') || '';
  }, [preferences.myIdentity]);

  if (is18Plus === null || !is18Plus) {
    return <AgeGate onConfirm={handleAgeConfirm} />;
  }

  if (!preferences.myIdentity) {
    return <IdentitySetup onComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-hidden relative">
        {activeTab === AppTab.RANDOM && <RandomTab preferences={preferences} />}
        {activeTab === AppTab.LIVE && <LiveTab preferences={preferences} />}
        {activeTab === AppTab.HOME && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in zoom-in duration-700">
            <h1 className="text-6xl md:text-8xl font-black mb-4 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent tracking-tighter">
              MAISJOB
            </h1>
            <div className="flex flex-col items-center gap-2 mb-12">
              <p className="text-slate-400 text-lg">
                Olá, <span className="text-indigo-400 font-bold capitalize">{identityLabel}</span>. Pronto para conectar?
              </p>
              <button 
                onClick={resetIdentity}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-400 transition-colors"
              >
                <Settings2 size={12} /> Mudar Identidade
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <button 
                onClick={() => setActiveTab(AppTab.RANDOM)} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-2xl font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-600/20"
              >
                CHAT RANDOM
              </button>
              <button 
                onClick={() => setActiveTab(AppTab.LIVE)} 
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-8 py-5 rounded-2xl font-black text-xl transition-all hover:scale-105 active:scale-95 border border-white/5"
              >
                VER LIVES
              </button>
            </div>
            
            <div className="mt-16 grid grid-cols-3 gap-8 opacity-40">
               <div className="flex flex-col items-center gap-2">
                 <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest">Privado</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest">Seguro</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest">Rápido</span>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}