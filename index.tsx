
import React, { useState, useEffect, useMemo, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import { AppTab, UserPreferences } from './types';
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
}

// Fix: Explicitly extending Component and declaring properties to resolve TypeScript access errors
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Critical Error:", error, info);
  }

  render() {
    // Fix: Access state safely after proper declaration
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-xl font-bold mb-4">Erro de Inicialização</h1>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 px-6 py-2 rounded-xl text-sm">Recarregar</button>
        </div>
      );
    }
    // Fix: Access props safely after proper declaration
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
    // Remove o loader do HTML assim que o React estiver pronto
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-hidden relative">
        {activeTab === AppTab.RANDOM && <RandomTab preferences={preferences} />}
        {activeTab === AppTab.LIVE && <LiveTab preferences={preferences} />}
        {activeTab === AppTab.HOME && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <h1 className="text-6xl font-black mb-4 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">LIVEFLOW</h1>
            <p className="text-slate-400 mb-8">Olá, <span className="text-indigo-400 font-bold capitalize">{identityLabel}</span>.</p>
            <div className="flex gap-4">
              <button onClick={() => setActiveTab(AppTab.RANDOM)} className="bg-indigo-600 px-8 py-4 rounded-2xl font-bold">CHAT RANDOM</button>
              <button onClick={() => setActiveTab(AppTab.LIVE)} className="bg-slate-800 px-8 py-4 rounded-2xl font-bold">VER LIVES</button>
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
