import React, { useState } from 'react';
import { BusLiveStatus, AuthorityTab } from '../../types';
import { INITIAL_BUSES } from '../../data/transitData';
import { useSignals } from '../../context/SignalContext';

interface AuthorityAlertsProps {
  onSelectBus?: (bus: BusLiveStatus) => void;
  onNavigate?: (tab: AuthorityTab) => void;
}

interface AlertItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFORMATION';
  busId: string;
  busName: string;
  route: string;
  problem: string;
  time: string;
  currentStatus: string;
}

export const AuthorityAlerts: React.FC<AuthorityAlertsProps> = ({ onSelectBus, onNavigate }) => {
  const { isBusNotDetected, secondsSinceLastSeen, etaConfidence } = useSignals();
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFORMATION'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResolve = (id: string) => {
    setResolvedIds((prev) => [...prev, id]);
    showToast('Alert acknowledged & status updated');
  };

  const handleViewBus = (busId: string) => {
    const bus = INITIAL_BUSES.find((b) => b.id === busId) || INITIAL_BUSES[0];
    if (onSelectBus) {
      onSelectBus(bus);
    }
  };

  // Base fleet alerts
  const staticAlerts: AlertItem[] = [
    {
      id: 'alert-15d-signal-lost',
      severity: 'CRITICAL',
      busId: 'bus-15d',
      busName: 'Bus 15D',
      route: 'Route 15 (Sanpada ⇄ Nerul)',
      problem: 'Signal lost — no commuter pings received in Sector 19 for over 4 minutes.',
      time: '4 min ago',
      currentStatus: 'Signal Lost / Awaiting Sighting',
    },
    {
      id: 'alert-21b-bottleneck',
      severity: 'WARNING',
      busId: 'bus-21b',
      busName: 'Bus 21B',
      route: 'Route 21 (Vashi ⇄ Belapur)',
      problem: 'Severe bottleneck delay at Turbhe Flyover — crawl speed (8 km/h), +12 min headway.',
      time: '11 min ago',
      currentStatus: 'Bottleneck Delay',
    },
    {
      id: 'alert-31d-handover',
      severity: 'INFORMATION',
      busId: 'bus-31d',
      busName: 'Bus 31D',
      route: 'Route 31 (Kopar Khairane ⇄ Panvel)',
      problem: 'Automatic tracking handover completed seamlessly to backup cluster node.',
      time: '18 min ago',
      currentStatus: 'Tracking Stable',
    },
  ];

  // Dynamic alert for Bus 21A if timeout triggered in simulator
  const dynamicAlerts: AlertItem[] = [];
  if (isBusNotDetected) {
    dynamicAlerts.push({
      id: 'alert-21a-timeout',
      severity: 'CRITICAL',
      busId: 'bus-21a',
      busName: 'Bus 21A',
      route: 'Route 21 (Vashi ⇄ Belapur)',
      problem: `Bus signal inactive — no accepted signals for 30s (last seen ${secondsSinceLastSeen}s ago). Position latched.`,
      time: 'Just now',
      currentStatus: 'Bus Not Detected',
    });
  } else if (etaConfidence.isLowConfidence) {
    dynamicAlerts.push({
      id: 'alert-21a-low-confidence',
      severity: 'WARNING',
      busId: 'bus-21a',
      busName: 'Bus 21A',
      route: 'Route 21 (Vashi ⇄ Belapur)',
      problem: `Low tracking confidence (<3 active commuter nodes). ${etaConfidence.whyNote}`,
      time: '1 min ago',
      currentStatus: 'Low Confidence Warning',
    });
  }

  const allAlerts = [...dynamicAlerts, ...staticAlerts].filter(
    (alert) => !resolvedIds.includes(alert.id)
  );

  const filteredAlerts = allAlerts.filter((a) => {
    if (filter === 'ALL') return true;
    return a.severity === filter;
  });

  const criticalCount = allAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = allAlerts.filter((a) => a.severity === 'WARNING').length;
  const infoCount = allAlerts.filter((a) => a.severity === 'INFORMATION').length;

  return (
    <div className="flex flex-col w-full gap-5 pb-20 text-[#e4dfff]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2 rounded-xl bg-[#8b4dff] text-white font-label-sm text-xs shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#0b013e]/70 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-xs text-[#958da1] uppercase tracking-wider font-bold">
              Fleet Exceptions &amp; Incident Queue
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#be581e]/20 text-[#ffb693] font-label-sm text-[10px] font-bold border border-[#be581e]/40">
              {allAlerts.length} Active {allAlerts.length === 1 ? 'Alert' : 'Alerts'}
            </span>
          </div>
          <h1 className="font-headline-sm text-xl md:text-2xl font-bold text-white mt-1">
            Fleet Alerts
          </h1>
          <p className="font-body-sm text-xs text-[#ccc3d8] mt-1">
            Actionable tracking anomalies, delays, and lost signals prioritized for transit dispatchers.
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[#19114b] p-1.5 rounded-xl border border-[#28225a] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-xs whitespace-nowrap transition-all ${
              filter === 'ALL'
                ? 'bg-[#8b4dff] text-white font-bold shadow-md'
                : 'text-[#ccc3d8] hover:text-white'
            }`}
          >
            All ({allAlerts.length})
          </button>
          <button
            onClick={() => setFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-xs whitespace-nowrap transition-all ${
              filter === 'CRITICAL'
                ? 'bg-rose-600 text-white font-bold shadow-md'
                : 'text-rose-300 hover:text-white'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setFilter('WARNING')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-xs whitespace-nowrap transition-all ${
              filter === 'WARNING'
                ? 'bg-[#be581e] text-white font-bold shadow-md'
                : 'text-[#ffb693] hover:text-white'
            }`}
          >
            Warning ({warningCount})
          </button>
          <button
            onClick={() => setFilter('INFORMATION')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-xs whitespace-nowrap transition-all ${
              filter === 'INFORMATION'
                ? 'bg-[#0055ea] text-white font-bold shadow-md'
                : 'text-[#b5c4ff] hover:text-white'
            }`}
          >
            Info ({infoCount})
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex flex-col gap-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#19114b]/60 border border-[#28225a] text-center flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-[36px]">check_circle</span>
            <span className="font-headline-sm text-base font-bold text-white">No Active Alerts</span>
            <span className="font-body-sm text-xs text-[#958da1]">
              All fleet corridors operating within regular parameters.
            </span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isWarning = alert.severity === 'WARNING';

            const borderColor = isCritical
              ? 'border-rose-500/50'
              : isWarning
              ? 'border-[#ffb693]/40'
              : 'border-[#28225a]';

            const bgColor = isCritical
              ? 'bg-rose-950/25'
              : isWarning
              ? 'bg-[#be581e]/15'
              : 'bg-[#19114b]/80';

            const badgeBg = isCritical
              ? 'bg-rose-600 text-white'
              : isWarning
              ? 'bg-[#be581e] text-white'
              : 'bg-[#0055ea] text-white';

            const icon = isCritical
              ? 'sensors_off'
              : isWarning
              ? 'warning'
              : 'info';

            return (
              <div
                key={alert.id}
                className={`p-4 md:p-5 rounded-2xl backdrop-blur-xl border ${borderColor} ${bgColor} shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md ${
                      isCritical
                        ? 'bg-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                        : isWarning
                        ? 'bg-[#be581e]'
                        : 'bg-[#0055ea]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">{icon}</span>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[10px] font-extrabold uppercase ${badgeBg}`}>
                        {alert.severity}
                      </span>
                      <span className="font-headline-sm text-base font-bold text-white">
                        {alert.busName}
                      </span>
                      <span className="font-label-sm text-xs text-[#958da1] font-mono">
                        {alert.route}
                      </span>
                      <span className="font-label-sm text-[11px] text-[#ccc3d8] flex items-center gap-1 ml-auto md:ml-0">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        {alert.time}
                      </span>
                    </div>

                    <p className="font-body-sm text-xs text-[#e4dfff] mt-1.5 leading-relaxed">
                      {alert.problem}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-label-sm text-[11px] text-[#958da1]">Status:</span>
                      <span className="font-mono text-[11px] font-bold text-white px-2 py-0.5 rounded bg-[#100743] border border-[#28225a]">
                        {alert.currentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleViewBus(alert.busId)}
                    className="px-3.5 py-2 rounded-xl bg-[#28225a] hover:bg-[#8b4dff] text-white font-label-sm text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">map</span>
                    <span>View Bus</span>
                  </button>

                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="px-3 py-2 rounded-xl bg-[#19114b] hover:bg-[#28225a] text-[#ccc3d8] hover:text-white font-label-sm text-xs font-semibold border border-[#332d65] transition-all"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
