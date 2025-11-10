import React, { useState } from 'react';
import { Strategy } from '../types';
import { ChartIcon } from './icons/ChartIcon';
import { TargetIcon } from './icons/TargetIcon';
import { UserIcon } from './icons/UserIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { User } from 'firebase/auth';
import Modal from './Modal';

interface BottomNavProps {
  strategies: Strategy[];
  activeView: string;
  navigateTo: (view: string) => void;
  onNewStrategy: () => void;
  currentUser: User | null;
  onLogin: () => void;
  onProfile: () => void;
  onSettings: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ 
  strategies, 
  activeView, 
  navigateTo, 
  onNewStrategy, 
  currentUser, 
  onLogin, 
  onProfile, 
  onSettings 
}) => {
  const [isStrategiesModalOpen, setIsStrategiesModalOpen] = useState(false);

  const isActive = (view: string) => {
    if (view === 'dashboard') {
      return activeView === 'dashboard';
    }
    if (view === 'profile') {
      return activeView === 'profile';
    }
    if (view === 'strategies') {
      return strategies.some(s => s.id === activeView);
    }
    return false;
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden glass-sidebar border-t border-[rgba(255,255,255,0.1)] z-40">
        <div className="flex items-center justify-around px-2 py-3">
          {/* Dashboard */}
          <button
            onClick={() => navigateTo('dashboard')}
            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-300 flex-1 ${
              isActive('dashboard')
                ? 'bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] text-white'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            <ChartIcon />
            <span className="text-xs font-medium">Dashboard</span>
          </button>

          {/* Strategies */}
          <button
            onClick={() => setIsStrategiesModalOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-300 flex-1 ${
              isActive('strategies')
                ? 'bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] text-white'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            <TargetIcon />
            <span className="text-xs font-medium">Strategies</span>
          </button>

          {/* Profile/Login */}
          <button
            onClick={currentUser ? () => navigateTo('profile') : onLogin}
            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-300 flex-1 ${
              isActive('profile')
                ? 'bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] text-white'
                : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            <UserIcon />
            <span className="text-xs font-medium">{currentUser ? 'Profile' : 'Login'}</span>
          </button>

          {/* Settings */}
          <button
            onClick={onSettings}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-300 flex-1 text-[#A0A0A0] hover:text-white"
          >
            <SettingsIcon />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </nav>

      {/* Strategies Modal */}
      <Modal isOpen={isStrategiesModalOpen} onClose={() => setIsStrategiesModalOpen(false)}>
        <div className="p-4">
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-white to-[#E0E0E0] bg-clip-text text-transparent mb-6">
            Strategies
          </h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {strategies.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => {
                  navigateTo(strategy.id);
                  setIsStrategiesModalOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 text-left ${
                  activeView === strategy.id
                    ? 'bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] text-white'
                    : 'hover:bg-[rgba(255,255,255,0.1)] text-[#E0E0E0] hover:text-white'
                }`}
              >
                <TargetIcon />
                <span className="font-medium flex-1">{strategy.name}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setIsStrategiesModalOpen(false);
                onNewStrategy();
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 mt-4"
            >
              <span>+ New Strategy</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BottomNav;

