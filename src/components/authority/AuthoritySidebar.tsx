import React from 'react';
import { AuthorityTab, UserRole } from '../../types';
import { useSignals } from '../../context/SignalContext';

interface AuthoritySidebarProps {
  activeTab: AuthorityTab;
  onSelectTab: (tab: AuthorityTab) => void;
  setRole: (role: UserRole) => void;
}

export const AuthoritySidebar: React.FC<AuthoritySidebarProps> = ({
  activeTab,
  onSelectTab,
  setRole,
}) => {
  const navItems: { id: AuthorityTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'live-map', label: 'Live Map', icon: 'grid_view' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications_active' },
    { id: 'system-health', label: 'System Health', icon: 'monitor_heart' },
    { id: 'demo-mode', label: 'Demo Mode', icon: 'science' },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-[#0b013e]/90 backdrop-blur-2xl z-50 flex-col justify-between shadow-[0_12px_32px_-4px_rgba(6,3,15,0.8)] border-r border-[#28225a]">
      <div className="flex flex-col">
        {/* Header Branding */}
        <div className="h-16 px-4 flex items-center gap-3 bg-[#19114b]/40 border-b border-[#28225a]">
          <div className="w-9 h-9 rounded-lg bg-[#8b4dff] flex items-center justify-center text-white shadow-[0_0_16px_rgba(139,77,255,0.4)]">
            <span className="material-symbols-outlined text-[20px]">directions_bus</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-lg text-xs tracking-wider text-white uppercase font-bold">
              Transport Authority
            </span>
            <span className="font-label-sm text-[10px] text-[#b5c4ff] tracking-widest uppercase">
              Live Monitoring Center
            </span>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-4 py-3">
          <span className="font-label-sm text-[11px] text-[#958da1] uppercase tracking-wider px-1">
            Operations &amp; Control
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-label-md text-xs transition-all ${
                  isActive
                    ? 'bg-[#8b4dff] text-white shadow-[0_0_12px_rgba(139,77,255,0.4)] font-bold'
                    : 'text-[#ccc3d8] hover:bg-[#28225a] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Security Badge */}
      <div className="p-4 bg-[#19114b]/60 m-3 rounded-2xl flex items-center justify-between border border-[#28225a]">
        <div className="flex flex-col">
          <span className="font-label-sm text-[10px] text-[#958da1] uppercase">Authority Link</span>
          <span className="font-label-md text-xs text-[#d2bcff] font-bold">TRANSIT MONITORING</span>
        </div>
        <span className="material-symbols-outlined text-[#b5c4ff] text-[20px]">verified_user</span>
      </div>
    </aside>
  );
};

export const AuthorityHeader: React.FC<{ setRole: (role: UserRole) => void }> = ({ setRole }) => {
  const { isFirestoreConnected, firestoreSignalsCount } = useSignals();
  const [clock, setClock] = React.useState('14:26:48 UTC+05:30');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      setClock(`${timeStr} UTC+05:30`);
    };
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-[#0b013e]/80 backdrop-blur-xl z-40 px-4 lg:px-6 flex items-center justify-between border-b border-[#28225a]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#28225a] border border-[#332d65]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0055ea] shadow-[0_0_10px_rgba(47,107,255,0.7)] animate-pulse"></span>
          <span className="font-label-sm text-[10px] text-[#b5c4ff] uppercase tracking-wider font-bold">
            LIVE TRACKING ACTIVE - 99.8% UPTIME
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#100743] rounded-full border border-[#28225a] text-[10px] font-mono text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Firestore: {firestoreSignalsCount} Anonymous Signals (Real-Time)</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-[#19114b] rounded-xl border border-[#28225a]">
          <span className="material-symbols-outlined text-[16px] text-[#d2bcff]">schedule</span>
          <span className="font-mono text-xs text-white tracking-wider">{clock}</span>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-[#28225a]">
          <div className="hidden sm:flex flex-col text-right">
            <span className="font-label-md text-xs text-white font-semibold">Operator #104</span>
            <span className="font-label-sm text-[10px] text-[#958da1]">Central Transit Control</span>
          </div>
          <button
            title="Switch back to Passenger App"
            onClick={() => setRole('passenger')}
            className="w-8 h-8 rounded-full bg-[#d2bcff] hover:bg-white flex items-center justify-center text-[#3e008e] shadow-md transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
