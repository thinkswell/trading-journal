import React from 'react';
import { Strategy } from '../types';
import { ChartIcon } from './icons/ChartIcon';
import { TargetIcon } from './icons/TargetIcon';
import { PlusIcon } from './icons/PlusIcon';
import { UserIcon } from './icons/UserIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { User } from 'firebase/auth';
import { FiBriefcase } from 'react-icons/fi';

interface SidebarProps {
  strategies: Strategy[];
  activeView: string;
  navigateTo: (view: string) => void;
  onNewStrategy: () => void;
  currentUser: User | null;
  onLogin: () => void;
  onProfile: () => void;
  onSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ strategies, activeView, navigateTo, onNewStrategy, currentUser, onLogin, onProfile, onSettings }) => {
  return (
    <aside className="hidden lg:flex w-64 glass-sidebar p-4 flex-col relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }}></div>
      
      <div className="relative z-10 flex items-center gap-3 mb-8 pb-4 border-b border-[rgba(255,255,255,0.1)]">
         <div className="p-2 rounded-lg bg-gradient-to-br from-[#6A5ACD]/20 to-[#8b5cf6]/10 border border-[#6A5ACD]/20">
           <div className="text-[#6A5ACD]" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <FiBriefcase size={24} />
           </div>
         </div>
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-white to-[#E0E0E0] bg-clip-text text-transparent">Trader-Log Journal</h1>
      </div>
      <nav className="flex-1 relative z-10">
        <ul>
          <li
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 mb-1 ${
              activeView === 'dashboard' 
                ? 'bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] text-white shadow-sm shadow-[#6A5ACD]/10 border border-[#6A5ACD]/30' 
                : 'hover:bg-[rgba(255,255,255,0.1)] text-[#E0E0E0] hover:text-white hover:translate-x-1'
            }`}
            onClick={() => navigateTo('dashboard')}
          >
            <ChartIcon />
            <span className="font-medium">{activeView === 'dashboard' ? 'Dashboard' : 'Dashboard'}</span>
          </li>
        </ul>
        <h2 className="text-xs font-bold text-[#A0A0A0] mt-6 mb-3 px-3 uppercase tracking-wider">Strategies</h2>
        <ul className="space-y-1">
          {strategies.map((strategy, index) => (
            <li
              key={strategy.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                activeView === strategy.id 
                  ? 'bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] text-white shadow-sm shadow-[#6A5ACD]/10 border border-[#6A5ACD]/30' 
                  : 'hover:bg-[rgba(255,255,255,0.1)] text-[#E0E0E0] hover:text-white hover:translate-x-1'
              }`}
              onClick={() => navigateTo(strategy.id)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TargetIcon />
              <span className="truncate font-medium">{strategy.name}</span>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto relative z-10">
         <hr className="border-[rgba(255,255,255,0.1)] my-3" />
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
                <div 
                    onClick={onProfile}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 flex-1 ${
                        activeView === 'profile' 
                          ? 'bg-[rgba(255,255,255,0.15)] text-white border border-[rgba(255,255,255,0.2)]' 
                          : 'hover:bg-[rgba(255,255,255,0.1)] text-[#E0E0E0] hover:text-white'
                    }`}
                >
                    <UserIcon />
                    <span className="font-medium">Profile</span>
                </div>
                <button
                    onClick={onSettings}
                    className="p-3 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-white transition-all duration-300"
                    aria-label="Settings"
                >
                    <SettingsIcon />
                </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
                <div 
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 hover:bg-[rgba(255,255,255,0.1)] text-[#E0E0E0] hover:text-white flex-1"
                    onClick={onLogin}
                >
                    <UserIcon />
                    <span className="font-medium">Login / Sign Up</span>
                </div>
                <button 
                  onClick={onSettings}
                  className="p-3 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-white transition-all duration-300"
                  aria-label="Settings"
                >
                  <SettingsIcon />
                </button>
            </div>
          )}
      </div>

      <button
        onClick={onNewStrategy}
        className="relative z-10 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 mt-4 shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 hover:scale-[1.02] active:scale-[0.98]"
      >
        <PlusIcon />
        New Strategy
      </button>
    </aside>
  );
};

export default Sidebar;