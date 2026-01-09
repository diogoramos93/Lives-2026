
import React, { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppTab, UserPreferences, IdentityTag } from './types';
import Navbar from './components/Navbar';
import RandomTab from './components/RandomTab';
import LiveTab from './components/LiveTab';
import AgeGate from './components/AgeGate';
import IdentitySetup from './components/IdentitySetup';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Fix: Extending the imported Component directly to resolve the property 'props' not existing error (line 58)
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState { 
    return { hasError: true, error }; 
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Critical Render Error caught by Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-black mb-2 text-white">Erro de Inicialização</h1>
          <p className="text-slate-400 mb-8 max-w-xs text-sm">
            Houve um problema ao carregar os módulos de vídeo. Tente limpar o cache do navegador.
          </p>
          <button 
            onClick={() => {
              sessionStorage.clear();
              window.location.reload();
            }} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold transition-all"
          >
            Resetar e Recarregar
          </button>
        </div>
      );
    }
    // Accessing this.props.children is now correctly typed
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
    console.log("LiveFlow: App component mounted successfully.");
    try {
      const ageConfirmed = sessionStorage.getItem('age_confirmed') === 'true';
      if (ageConfirmed) setIs18Plus(true);
      
      const savedPrefs = sessionStorage.getItem('user_prefs');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed && parsed.myIdentity) {
          setPreferences(parsed);
        }
      }
    } catch (e) {
      console.error("LiveFlow: Failed to load session data:", e);
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
          <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
              <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter relative bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                LIVEFLOW
              </h1>
            </div>
            
            <p className="text-slate-400 mb-12 max-w-md text-lg leading-relaxed">
              Você está navegando como <span className="text-indigo-400 font-bold capitalize">{identityLabel}</span>.
              Conexão segura via <span className="text-slate-200">fotos.diogoramos.esp.br</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
              <button 
                onClick={() => setActiveTab(AppTab.RANDOM)} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
              >
                MODO RANDOM
              </button>
              <button 
                onClick={() => setActiveTab(AppTab.LIVE)} 
                className="flex-1 bg-slate-800 hover:bg-slate-700 px-8 py-4 rounded-2xl font-black transition-all active:scale-95"
              >
                VER LIVES
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  // Limpa o loader inicial antes de renderizar o React
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} else {
  console.error("LiveFlow: CRITICAL - Root element not found.");
}
