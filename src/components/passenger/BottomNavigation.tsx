import React from 'react';
import { PassengerTab } from '../../types';

interface BottomNavigationProps {
  activeTab: PassengerTab;
  onSelectTab: (tab: PassengerTab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const tabs: { id: PassengerTab; label: string; icon: string; badge?: boolean }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'live-map', label: 'Live Map', icon: 'near_me' },
    { id: 'route-chat', label: 'Route Chat', icon: 'chat_bubble', badge: true },
    { id: 'rewards', label: 'Rewards', icon: 'stars' },
    { id: 'profile', label: 'Profile', icon: 'account_circle' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-[#100743]/95 backdrop-blur-xl border-t border-[#28225a] shadow-[0_-4px_24px_rgba(6,3,15,0.7)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 min-w-[56px] h-12 transition-all duration-200 ${
                isActive
                  ? 'text-[#d2bcff] [filter:drop-shadow(0_0_8px_rgba(139,77,255,0.6))] scale-105'
                  : 'text-[#958da1] hover:text-[#e4dfff]'
              }`}
            >
              <div className="relative">
                <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ffb693] animate-pulse"></span>
                )}
              </div>
              <span className="font-label-sm text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
