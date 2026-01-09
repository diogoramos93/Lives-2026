
import React from 'react';
import { AppTab } from '../types';
import { Zap, Radio, Home } from 'lucide-react';

interface NavbarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onTabChange(AppTab.HOME)}
        >
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Zap size={20} fill="white" className="text-white" />
          </div>
          <span className="font-black text-xl tracking-tighter">MAISJOB</span>
        </div>

        <div className="flex gap-1 md:gap-4">
          <button 
            onClick={() => onTabChange(AppTab.RANDOM)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === AppTab.RANDOM 
                ? 'bg-indigo-600/10 text-indigo-400' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Zap size={18} />
            <span className="hidden sm:inline">Random</span>
          </button>
          <button 
            onClick={() => onTabChange(AppTab.LIVE)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === AppTab.LIVE 
                ? 'bg-rose-600/10 text-rose-400' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Radio size={18} />
            <span className="hidden sm:inline">Lives</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
