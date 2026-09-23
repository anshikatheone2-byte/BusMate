import React from 'react';
import { UserRole } from '../types';
import { useSignals } from '../context/SignalContext';

interface HeaderProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ role, setRole, onOpenProfile }) => {
  const { isFirestoreConnected, firestoreSignalsCount } = useSignals();

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#100743]/85 backdrop-blur-xl pt-safe shadow-[0_1px_16px_rgba(6,3,15,0.6)] border-b border-[#28225a]/40">
      <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className="material-symbols-outlined text-[#d2bcff] text-[26px]">directions_bus</span>
            <div className="flex flex-col">
              <span className="font-headline-sm text-base md:text-lg font-bold text-[#e4dfff] tracking-tight leading-tight">
                Bus<span className="text-[#d2bcff]">Mate</span>
              </span>
              <span className="hidden sm:inline font-label-sm text-[10px] text-[#b5c4ff] tracking-tight font-medium">
                Crowd-Powered Smart Bus Tracking
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#28225a]/80 backdrop-blur-md border border-[#332d65]/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-emerald-300 font-semibold">
              LIVE
            </span>
          </div>

          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#100743]/90 border border-[#28225a] text-[10px] font-mono text-[#b5c4ff]"
            title="Real-time Firestore anonymous signals stream. Ephemeral retention: 10 mins. Strict privacy: anonymous IDs only."
          >
            <span className="material-symbols-outlined text-[12px] text-[#8b4dff]">cloud_sync</span>
            <span>Firestore: {firestoreSignalsCount} anon pings</span>
          </div>
        </div>

        {/* Right: Role Switcher & User Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Role Pill Switcher */}
          <div className="flex items-center p-0.5 rounded-full bg-[#0b013e]/90 border border-[#28225a]">
            <button
              onClick={() => setRole('passenger')}
              className={`px-2.5 py-1 rounded-full font-label-sm text-xs transition-all duration-200 ${
                role === 'passenger'
                  ? 'text-white bg-[#8b4dff] shadow-[0_0_12px_rgba(139,77,255,0.5)] font-semibold'
                  : 'text-[#ccc3d8] hover:text-white'
              }`}
              type="button"
            >
              Passenger
            </button>
            <button
              onClick={() => setRole('authority')}
              className={`px-2.5 py-1 rounded-full font-label-sm text-xs transition-all duration-200 ${
                role === 'authority'
                  ? 'text-white bg-[#0055ea] shadow-[0_0_12px_rgba(0,85,234,0.5)] font-semibold'
                  : 'text-[#ccc3d8] hover:text-white'
              }`}
              type="button"
            >
              Authority
            </button>
          </div>

          {/* Avatar button */}
          <button
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full bg-[#d2bcff] flex items-center justify-center text-[#3e008e] hover:ring-2 hover:ring-[#8b4dff] transition-all shadow-md"
            title="User Profile"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
