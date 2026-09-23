/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserRole, PassengerTab, AuthorityTab, BusLiveStatus } from './types';
import { INITIAL_BUSES } from './data/transitData';
import { Header } from './components/Header';
import { PassengerHome } from './components/passenger/PassengerHome';
import { PassengerChat } from './components/passenger/PassengerChat';
import { PassengerLiveMap } from './components/passenger/PassengerLiveMap';
import { PassengerRewards, PassengerProfile } from './components/passenger/PassengerRewards';
import { BottomNavigation } from './components/passenger/BottomNavigation';
import { BroadcastModal } from './components/passenger/BroadcastModal';

import { AuthoritySidebar, AuthorityHeader } from './components/authority/AuthoritySidebar';
import { AuthorityOverview } from './components/authority/AuthorityOverview';
import { AuthorityLiveMap } from './components/authority/AuthorityLiveMap';
import { AuthorityAlerts } from './components/authority/AuthorityAlerts';
import { AuthoritySystemHealth } from './components/authority/AuthoritySystemHealth';
import { AuthorityDemoMode } from './components/authority/AuthorityDemoMode';
import { SignalProvider, useSignals } from './context/SignalContext';

const GlobalSignalToast: React.FC<{ role: UserRole }> = ({ role }) => {
  const { toastMessage } = useSignals();
  if (!toastMessage || role !== 'authority') return null;
  return (
    <div className="fixed top-20 right-4 z-50 max-w-md p-3.5 rounded-2xl bg-[#100743]/95 border border-[#8b4dff]/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
      <div className="w-8 h-8 rounded-xl bg-[#0055ea] flex items-center justify-center text-white shrink-0 shadow-md">
        <span className="material-symbols-outlined text-[18px]">cell_tower</span>
      </div>
      <div className="flex flex-col">
        <span className="font-label-sm text-[11px] font-bold text-[#b5c4ff] uppercase tracking-wider">
          Authority Sensor Telemetry
        </span>
        <p className="font-body-sm text-xs font-semibold text-white">
          {toastMessage}
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const [role, setRole] = useState<UserRole>('passenger');
  const [passengerTab, setPassengerTab] = useState<PassengerTab>('home');
  const [authorityTab, setAuthorityTab] = useState<AuthorityTab>('overview');
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusLiveStatus>(INITIAL_BUSES[0]);

  const handleSightingSubmit = (sighting: any) => {
    // Sighting submitted
    console.log('Sighting Broadcasted:', sighting);
  };

  return (
    <SignalProvider>
      <GlobalSignalToast role={role} />
      <div className="min-h-screen bg-[#080227] text-[#e4dfff] font-body-md antialiased selection:bg-[#8b4dff] selection:text-white">
        {/* PASSENGER ROLE EXPERIENCE */}
        {role === 'passenger' && (
          <div className="min-h-screen flex flex-col pt-16">
            <Header
              role={role}
              setRole={setRole}
              onOpenProfile={() => setPassengerTab('profile')}
            />

            <main className="flex-1 w-full max-w-7xl mx-auto">
              {passengerTab === 'home' && (
                <PassengerHome
                  bus={selectedBus}
                  onSelectBus={(bus) => setSelectedBus(bus)}
                  onOpenSightingModal={() => setIsBroadcastOpen(true)}
                  onNavigateToTab={(tab) => setPassengerTab(tab)}
                />
              )}

              {passengerTab === 'live-map' && (
                <PassengerLiveMap
                  selectedBus={selectedBus}
                  onSelectBus={(bus) => {
                    setSelectedBus(bus);
                  }}
                />
              )}

              {passengerTab === 'route-chat' && (
                <PassengerChat
                  onOpenSightingModal={() => setIsBroadcastOpen(true)}
                  currentAppBus={selectedBus}
                  onSelectBus={(bus) => setSelectedBus(bus)}
                />
              )}

              {passengerTab === 'rewards' && <PassengerRewards />}

              {passengerTab === 'profile' && <PassengerProfile />}
            </main>

            <BottomNavigation
              activeTab={passengerTab}
              onSelectTab={(tab) => setPassengerTab(tab)}
            />

            <BroadcastModal
              isOpen={isBroadcastOpen}
              onClose={() => setIsBroadcastOpen(false)}
              onSubmit={handleSightingSubmit}
            />
          </div>
        )}

        {/* AUTHORITY ROLE EXPERIENCE */}
        {role === 'authority' && (
          <div className="min-h-screen flex bg-[#080227]">
            {/* Desktop Left Sidebar */}
            <AuthoritySidebar
              activeTab={authorityTab}
              onSelectTab={(tab) => setAuthorityTab(tab)}
              setRole={setRole}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
              <AuthorityHeader setRole={setRole} />

              {/* Mobile / Tablet Authority Sub-Navigation Bar */}
              <div className="lg:hidden mt-16 px-4 py-2 bg-[#0b013e] border-b border-[#28225a] flex items-center gap-2 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'overview', label: 'Overview', icon: 'dashboard' },
                    { id: 'live-map', label: 'Live Map', icon: 'map' },
                    { id: 'alerts', label: 'Alerts', icon: 'warning' },
                    { id: 'system-health', label: 'System Health', icon: 'monitor_heart' },
                    { id: 'demo-mode', label: 'Demo Mode', icon: 'science' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAuthorityTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label-sm text-xs whitespace-nowrap transition-all ${
                      authorityTab === tab.id
                        ? 'bg-[#8b4dff] text-white font-bold shadow-md'
                        : 'bg-[#19114b] text-[#ccc3d8]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <main className="flex-1 p-4 lg:p-6 mt-0 lg:mt-16 overflow-y-auto">
                {authorityTab === 'overview' && (
                  <AuthorityOverview
                    onNavigate={(tab) => setAuthorityTab(tab)}
                    onSelectBus={(bus) => {
                      setSelectedBus(bus);
                      setAuthorityTab('live-map');
                    }}
                  />
                )}
                {authorityTab === 'live-map' && (
                  <AuthorityLiveMap
                    selectedBus={selectedBus}
                    onSelectBus={(bus) => setSelectedBus(bus)}
                  />
                )}
                {authorityTab === 'alerts' && (
                  <AuthorityAlerts
                    onNavigate={(tab) => setAuthorityTab(tab)}
                    onSelectBus={(bus) => {
                      setSelectedBus(bus);
                      setAuthorityTab('live-map');
                    }}
                  />
                )}
                {authorityTab === 'system-health' && (
                  <AuthoritySystemHealth
                    onNavigate={(tab) => setAuthorityTab(tab)}
                  />
                )}
                {authorityTab === 'demo-mode' && (
                  <AuthorityDemoMode
                    onNavigate={(tab) => setAuthorityTab(tab)}
                  />
                )}
              </main>
            </div>
          </div>
        )}
      </div>
    </SignalProvider>
  );
}
