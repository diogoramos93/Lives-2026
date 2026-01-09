import React, { Component, useState, useEffect, useMemo, ReactNode, ErrorInfo } from 'react';
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

// Fix: Explicitly importing and extending 'Component' from 'react' ensures the TypeScript compiler correctly identifies 'this.props' in the class.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Critical Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
          <h1 className="text-xl font-bold mb-4">Erro de Inicialização</h1>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 px-6 py-2 rounded-xl text-sm font-bold">Recarregar</button>
        </div>
      );
    }
    // Fix: Accessing 'this.props.children' now works correctly as 'ErrorBoundary' is explicitly recognized as a React Component.
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
    <div className="h-[100dvh] w-full flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30 overflow-hidden">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 relative min-h-0 w-full overflow-hidden">
        {activeTab === AppTab.RANDOM && <RandomTab preferences={preferences} />}
        {activeTab === AppTab.LIVE && <LiveTab preferences={preferences} />}
        {activeTab === AppTab.HOME && (
          <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center animate-in fade-in zoom-in duration-700 overflow-y-auto hide-scrollbar">
            <div className="w-full max-w-lg flex flex-col items-center py-10">
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-black mb-4 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent tracking-tighter shrink-0">
                MAISJOB
              </h1>
              
              <div className="flex flex-col items-center gap-3 mb-12 shrink-0">
                <p className="text-slate-400 text-lg sm:text-xl">
                  Olá, <span className="text-indigo-400 font-extrabold capitalize">{identityLabel}</span>. Pronto para conectar?
                </p>
                <button 
                  onClick={resetIdentity}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-full text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition-all border border-slate-800"
                >
                  <Settings2 size={14} /> Mudar Identidade
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full px-4">
                <button 
                  onClick={() => setActiveTab(AppTab.RANDOM)} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-3xl font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-600/20"
                >
                  CHAT RANDOM
                </button>
                <button 
                  onClick={() => setActiveTab(AppTab.LIVE)} 
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-8 py-5 rounded-3xl font-black text-xl transition-all hover:scale-105 active:scale-95 border border-white/5"
                >
                  VER LIVES
                </button>
              </div>
              
              <div className="mt-16 grid grid-cols-3 gap-6 sm:gap-12 opacity-30 shrink-0">
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest">Privado</span>
                 </div>
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest">Seguro</span>
                 </div>
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest">Rápido</span>
                 </div>
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