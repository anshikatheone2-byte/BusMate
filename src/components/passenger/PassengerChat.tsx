import React, { useState, useMemo, useEffect } from 'react';
import { BusLiveStatus, ChatReport } from '../../types';
import { INITIAL_BUSES, INITIAL_CHAT_REPORTS } from '../../data/transitData';

interface PassengerChatProps {
  onOpenSightingModal: () => void;
  currentAppBus?: BusLiveStatus;
  onSelectBus?: (bus: BusLiveStatus) => void;
}

const RECENT_BUSES_STORAGE_KEY = 'busmate_recent_chat_buses';

export const PassengerChat: React.FC<PassengerChatProps> = ({
  onOpenSightingModal,
  currentAppBus,
  onSelectBus,
}) => {
  // Bus catalog
  const [buses, setBuses] = useState<BusLiveStatus[]>(INITIAL_BUSES);

  // Active selected bus (null = list view: Search / Recent / Active Buses)
  const [activeBus, setActiveBus] = useState<BusLiveStatus | null>(null);

  // Search & filter state in the bus list view
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'on-time' | 'delayed'>('all');

  // Recent buses (store bus IDs)
  const [recentBusIds, setRecentBusIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_BUSES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    // Default initial recent buses: 423, 510, 21A
    return ['bus-423', 'bus-510', 'bus-21a'];
  });

  // Bus-specific messages store: Record<busId, ChatReport[]>
  // Ensures messages for Bus 423 NEVER appear in Bus 510's conversation
  const [messagesByBus, setMessagesByBus] = useState<Record<string, ChatReport[]>>(() => {
    const map: Record<string, ChatReport[]> = {};

    // Initialize all known buses with empty arrays
    INITIAL_BUSES.forEach((b) => {
      map[b.id] = [];
    });

    // Populate initial chat reports into their respective bus buckets
    INITIAL_CHAT_REPORTS.forEach((report) => {
      const targetBusId = report.busId || 'bus-21a';
      if (!map[targetBusId]) {
        map[targetBusId] = [];
      }
      map[targetBusId].push(report);
    });

    return map;
  });

  // Conversation sub-filters for the active bus
  const [conversationFilter, setConversationFilter] = useState<'all' | 'incidents' | 'delays' | 'crowd'>('all');
  const [inputText, setInputText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [votedReports, setVotedReports] = useState<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persist recent buses
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_BUSES_STORAGE_KEY, JSON.stringify(recentBusIds));
    } catch {
      // Ignore storage errors
    }
  }, [recentBusIds]);

  // When a passenger selects a bus
  const handleSelectBus = (bus: BusLiveStatus) => {
    setActiveBus(bus);
    if (onSelectBus) {
      onSelectBus(bus);
    }
    // Bump into recent buses
    setRecentBusIds((prev) => {
      const updated = [bus.id, ...prev.filter((id) => id !== bus.id)];
      return updated.slice(0, 6); // Keep top 6 recent
    });
    // Reset conversation filter & input
    setConversationFilter('all');
    setInputText('');
  };

  // Back button to return to the searchable bus list
  const handleBackToList = () => {
    setActiveBus(null);
    setInputText('');
  };

  // Dynamic creation of a room if passenger searches for a custom bus number (scalable for 1,000+ buses)
  const handleCreateCustomBus = (busNum: string) => {
    const cleanNum = busNum.trim().toUpperCase();
    const newBusId = `bus-${cleanNum.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const existing = buses.find((b) => b.id === newBusId || b.name.toUpperCase().includes(cleanNum));
    if (existing) {
      handleSelectBus(existing);
      return;
    }

    const newBus: BusLiveStatus = {
      id: newBusId,
      name: `Bus ${cleanNum}`,
      route: `Route ${cleanNum}: Transit Corridor`,
      direction: `Origin ➔ Destination via Stop`,
      speed: 30,
      status: 'on-time',
      headwayText: '● Live • GPS active',
      delayMinutes: 0,
      sector: 'Metropolitan Route',
      clusterNodes: 6,
      currentPhone: '#01',
      confidencePercent: 92,
      lat: 19.076,
      lng: 72.877,
      confidenceLevel: 'High',
      nearestStop: 'City Central Jct',
      nextStop: 'Terminal Depot',
      nextStopEtaMinutes: 6,
      isNotDetected: false,
    };

    setBuses((prev) => [newBus, ...prev]);
    setMessagesByBus((prev) => ({
      ...prev,
      [newBusId]: [
        {
          id: `rep-${Date.now()}`,
          busId: newBusId,
          busName: newBus.name,
          type: 'official',
          author: 'Transit Control',
          authorBadge: 'Automated Room',
          authorRole: 'Live Corridor Room',
          timestamp: 'Just now',
          content: `Live commuter conversation opened for Bus ${cleanNum}. Share delays, crowd density, and sightings here!`,
        },
      ],
    }));

    handleSelectBus(newBus);
    showToast(`Joined live conversation for Bus ${cleanNum}`);
  };

  // Sending a message strictly for the active bus
  const handleSendMessage = (textToSend?: string) => {
    if (!activeBus) return;
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const newReport: ChatReport = {
      id: `rep-${Date.now()}`,
      busId: activeBus.id,
      busName: activeBus.name,
      type: 'passenger_message',
      author: 'You (Commuter)',
      authorBadge: 'Verified Onboard',
      authorRole: `Live Commuter • ${activeBus.name}`,
      avatarText: 'ME',
      avatarBg: 'bg-[#8b4dff]',
      timestamp: 'Just now',
      content: text.trim(),
      helpfulCount: 0,
      replyCount: 0,
    };

    // Append to this bus's conversation ONLY
    setMessagesByBus((prev) => ({
      ...prev,
      [activeBus.id]: [newReport, ...(prev[activeBus.id] || [])],
    }));

    setInputText('');
    showToast(`Update broadcasted to ${activeBus.name} commuters!`);
  };

  const handleQuickReaction = (reaction: string, label: string) => {
    if (!activeBus) return;
    handleSendMessage(`${reaction} Commuter Update: ${label} reported on ${activeBus.name}.`);
  };

  const toggleHelpful = (reportId: string) => {
    if (!activeBus) return;
    setMessagesByBus((prev) => {
      const currentList = prev[activeBus.id] || [];
      const updatedList = currentList.map((r) => {
        if (r.id === reportId) {
          const isVoted = votedReports.has(reportId);
          return {
            ...r,
            helpfulCount: (r.helpfulCount || 0) + (isVoted ? -1 : 1),
          };
        }
        return r;
      });
      return {
        ...prev,
        [activeBus.id]: updatedList,
      };
    });

    setVotedReports((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
        showToast('Feedback noted! Commuter confidence updated.');
      }
      return next;
    });
  };

  // Filtered buses in list view (scalable search matching number, route, stops)
  const filteredBuses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return buses.filter((bus) => {
      // Status filter
      if (statusFilter === 'live' && bus.isNotDetected) return false;
      if (statusFilter === 'on-time' && bus.status !== 'on-time') return false;
      if (statusFilter === 'delayed' && bus.status !== 'delayed') return false;

      // Text search
      if (!q) return true;
      const matchName = bus.name.toLowerCase().includes(q);
      const matchRoute = bus.route.toLowerCase().includes(q);
      const matchDirection = bus.direction.toLowerCase().includes(q);
      const matchStop = bus.nearestStop?.toLowerCase().includes(q);
      const matchNextStop = bus.nextStop?.toLowerCase().includes(q);
      const matchSector = bus.sector?.toLowerCase().includes(q);
      return matchName || matchRoute || matchDirection || matchStop || matchNextStop || matchSector;
    });
  }, [buses, searchQuery, statusFilter]);

  // Recent buses objects
  const recentBuses = useMemo(() => {
    return recentBusIds
      .map((id) => buses.find((b) => b.id === id))
      .filter((b): b is BusLiveStatus => Boolean(b));
  }, [recentBusIds, buses]);

  // Active bus reports
  const activeBusReports = useMemo(() => {
    if (!activeBus) return [];
    const allReports = messagesByBus[activeBus.id] || [];
    return allReports.filter((r) => {
      if (conversationFilter === 'incidents') return r.type === 'obstruction';
      if (conversationFilter === 'delays') {
        return Boolean(r.delayText || r.content.toLowerCase().includes('delay') || r.content.toLowerCase().includes('holding'));
      }
      if (conversationFilter === 'crowd') {
        return r.type === 'sighting' || r.content.toLowerCase().includes('seat') || r.content.toLowerCase().includes('crowd');
      }
      return true;
    });
  }, [activeBus, messagesByBus, conversationFilter]);

  // Pinned report for active bus (if any)
  const pinnedReport = useMemo(() => {
    if (!activeBus) return null;
    const allReports = messagesByBus[activeBus.id] || [];
    return allReports.find((r) => r.isPinned);
  }, [activeBus, messagesByBus]);

  // Clean formatted route endpoints (e.g. "Andheri → Kurla" or "Vashi → Belapur")
  const formatBusRouteEndpoints = (bus: BusLiveStatus) => {
    if (bus.direction) {
      return bus.direction.replace(/➔|->/g, '→');
    }
    if (bus.route.includes(':')) {
      return bus.route.split(':')[1].trim().replace(/➔|->/g, '→');
    }
    return bus.route.replace(/➔|->/g, '→');
  };

  // =========================================================================
  // VIEW 2: BUS-SPECIFIC CONVERSATION SCREEN (e.g. Bus 423)
  // =========================================================================
  if (activeBus) {
    const busEndpoints = formatBusRouteEndpoints(activeBus);
    const currentStop = activeBus.nearestStop || 'In Transit';
    const nextStop = activeBus.nextStop || 'Next Junction';

    return (
      <div className="flex flex-col w-full max-w-lg mx-auto min-h-screen text-[#e4dfff] pb-40">
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#8b4dff] text-white font-label-sm text-xs shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ALWAYS-VISIBLE STICKY TOP HEADER */}
        {/* The bus number and route must always remain visible so the passenger knows which bus they are discussing */}
        <header className="sticky top-16 z-30 w-full bg-[#130b3a]/95 backdrop-blur-xl border-b border-[#28225a] shadow-[0_8px_24px_rgba(6,3,15,0.7)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Back Button + Bus Number & Route */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                onClick={handleBackToList}
                className="w-8 h-8 rounded-full bg-[#28225a] hover:bg-[#37326a] text-white flex items-center justify-center transition-transform active:scale-90 shrink-0"
                title="Back to All Buses"
                aria-label="Back to bus search list"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl shrink-0" role="img" aria-label="bus">🚌</span>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-headline-sm text-base font-bold text-white tracking-wide truncate">
                      {activeBus.name.replace(/^Bus\s*/i, '')}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 font-label-sm text-[10px] font-bold border border-emerald-500/30 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <span className="font-body-sm text-xs text-[#b5c4ff] font-medium truncate">
                    {busEndpoints}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Crowd Nodes indicator */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#28225a]/90 text-[#d2bcff] font-label-sm text-[10px] font-mono shrink-0 border border-[#37326a]">
              <span className="material-symbols-outlined text-[13px] text-emerald-400">sensors</span>
              <span>{activeBus.clusterNodes || 8} nodes</span>
            </div>
          </div>

          {/* Current & Next Stop Banner */}
          <div className="mt-2.5 pt-2 border-t border-[#28225a]/80 flex items-center justify-between text-xs font-label-sm gap-2">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="text-[#ffb693] font-bold shrink-0">📍 Current:</span>
              <span className="text-white font-medium truncate">{currentStop}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 truncate shrink-0">
              <span className="text-[#b5c4ff] font-bold">➡ Next:</span>
              <span className="text-white font-medium truncate">{nextStop}</span>
            </div>
          </div>
        </header>

        {/* Conversation Content Area */}
        <div className="px-4 py-3 space-y-3">
          {/* Sub-Filters for this Bus */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setConversationFilter('all')}
              className={`px-3 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all ${
                conversationFilter === 'all'
                  ? 'bg-[#8b4dff] text-white font-bold shadow-[0_0_12px_rgba(139,77,255,0.4)]'
                  : 'bg-[#28225a] text-[#ccc3d8] hover:text-white'
              }`}
            >
              All Feed ({messagesByBus[activeBus.id]?.length || 0})
            </button>
            <button
              onClick={() => setConversationFilter('incidents')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all ${
                conversationFilter === 'incidents'
                  ? 'bg-[#be581e] text-white font-bold shadow-[0_0_12px_rgba(190,88,30,0.4)]'
                  : 'bg-[#28225a] text-[#ccc3d8] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-[#ffb693]">warning</span>
              Incidents
            </button>
            <button
              onClick={() => setConversationFilter('delays')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all ${
                conversationFilter === 'delays'
                  ? 'bg-[#0055ea] text-white font-bold shadow-[0_0_12px_rgba(0,85,234,0.4)]'
                  : 'bg-[#28225a] text-[#ccc3d8] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-[#b5c4ff]">speed</span>
              Delays
            </button>
            <button
              onClick={() => setConversationFilter('crowd')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all ${
                conversationFilter === 'crowd'
                  ? 'bg-[#8b4dff] text-white font-bold shadow-[0_0_12px_rgba(139,77,255,0.4)]'
                  : 'bg-[#28225a] text-[#ccc3d8] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-[#d2bcff]">groups</span>
              Crowd Updates
            </button>
          </div>

          {/* Pinned Incident Banner (if applicable for this bus) */}
          {pinnedReport && (
            <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-[#be581e]/30 via-[#28225a]/90 to-[#1d164f] border border-[#be581e]/40 shadow-lg overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ffb693]" />
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-[#ffb693] font-label-sm text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Pinned Incident
                </div>
                <span className="font-mono text-[11px] text-[#ccc3d8]">{pinnedReport.timestamp}</span>
              </div>
              <p className="font-body-sm text-xs text-[#e4dfff] leading-relaxed">
                {pinnedReport.content}
              </p>
              {pinnedReport.delayText && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-[#93000a]/50 text-[#ffb4ab] font-label-sm text-[11px] font-mono font-bold border border-[#ffb4ab]/30">
                  {pinnedReport.delayText}
                </span>
              )}
            </div>
          )}

          {/* One-Tap Live Actions for this Bus */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="font-label-sm text-[10px] text-[#958da1] tracking-wider uppercase font-bold">
                Quick Actions for {activeBus.name}
              </span>
              <span className="font-label-sm text-[10px] text-[#d2bcff] font-mono">
                Real-time sync
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => handleSendMessage(`⚠️ Traffic Jam: Heavy crawling traffic near ${currentStop} on ${activeBus.name}.`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#28225a]/90 hover:bg-[#37326a] active:scale-95 transition-all text-xs font-semibold text-white whitespace-nowrap border border-[#332d65]"
              >
                <span className="material-symbols-outlined text-[15px] text-[#ffb693]">traffic</span>
                Report Jam
              </button>
              <button
                onClick={() => handleSendMessage(`👥 Crowd Update: Seats available on ${activeBus.name}, comfortable ride.`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#28225a]/90 hover:bg-[#37326a] active:scale-95 transition-all text-xs font-semibold text-white whitespace-nowrap border border-[#332d65]"
              >
                <span className="material-symbols-outlined text-[15px] text-[#b5c4ff]">groups</span>
                Seats Available
              </button>
              <button
                onClick={() => handleSendMessage(`🔀 Route Notice: ${activeBus.name} taking flyover bypass near ${currentStop}.`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#28225a]/90 hover:bg-[#37326a] active:scale-95 transition-all text-xs font-semibold text-white whitespace-nowrap border border-[#332d65]"
              >
                <span className="material-symbols-outlined text-[15px] text-[#ffb4ab]">alt_route</span>
                Route Diverted
              </button>
              <button
                onClick={onOpenSightingModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#28225a]/90 hover:bg-[#37326a] active:scale-95 transition-all text-xs font-semibold text-white whitespace-nowrap border border-[#332d65]"
              >
                <span className="material-symbols-outlined text-[15px] text-[#d2bcff]">visibility</span>
                Bus Sighting
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="space-y-3 pt-1">
            {activeBusReports.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#19114b]/60 border border-[#28225a] text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#28225a] flex items-center justify-center mx-auto text-[#d2bcff]">
                  <span className="material-symbols-outlined text-[24px]">chat</span>
                </div>
                <h3 className="font-headline-sm text-sm font-bold text-white">
                  No messages yet for {activeBus.name}
                </h3>
                <p className="font-body-sm text-xs text-[#ccc3d8] max-w-xs mx-auto">
                  Be the first commuter to share updates on crowd capacity, traffic, or boarding conditions!
                </p>
              </div>
            ) : (
              activeBusReports.map((report) => {
                // Confidence Alert
                if (report.type === 'confidence_alert') {
                  return (
                    <article
                      key={report.id}
                      className="p-3.5 rounded-2xl bg-[#28225a]/80 backdrop-blur-md border border-[#332d65] shadow-md flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#0055ea]/40 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[15px] text-[#b5c4ff]">smart_toy</span>
                          </div>
                          <span className="font-label-md text-xs text-[#b5c4ff] font-bold">
                            {report.author}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#0b013e]/80 text-emerald-300 font-label-sm text-[10px] font-bold border border-emerald-500/20">
                          {report.confidence || 96}% confidence
                        </span>
                      </div>
                      <p className="font-body-sm text-xs text-[#e4dfff] leading-relaxed">
                        {report.content}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[#958da1] font-mono border-t border-[#332d65]/40 pt-1">
                        <span>{report.pingId || 'Real-time Signal'}</span>
                        <span>{report.timestamp}</span>
                      </div>
                    </article>
                  );
                }

                // Obstruction
                if (report.type === 'obstruction') {
                  return (
                    <article
                      key={report.id}
                      className="p-3.5 rounded-2xl bg-[#28225a]/90 backdrop-blur-md border border-[#ffb693]/30 shadow-md flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#ffb693] font-label-md text-xs font-bold uppercase">
                          <span className="w-2 h-2 rounded-full bg-[#ffb693] animate-pulse" />
                          <span>{report.author}</span>
                        </div>
                        <span className="font-mono text-[10px] text-[#958da1]">{report.timestamp}</span>
                      </div>
                      <p className="font-body-sm text-xs text-[#e4dfff] leading-relaxed">
                        {report.content}
                      </p>
                      {report.geoImageUrl && (
                        <div className="h-24 rounded-xl overflow-hidden bg-[#0b013e] border border-[#332d65]/50">
                          <img
                            src={report.geoImageUrl}
                            alt="Incident Location"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-[#332d65]/40 text-xs">
                        <span className="text-[#ccc3d8] text-[11px]">
                          ✓ {report.confirmationsCount || 3} confirmations
                        </span>
                        <button
                          onClick={() => showToast('Obstruction verified on route')}
                          className="px-2.5 py-1 rounded-full bg-[#0b013e] hover:bg-[#37326a] text-[#d2bcff] font-label-sm text-[11px] border border-[#332d65]"
                        >
                          Confirm
                        </button>
                      </div>
                    </article>
                  );
                }

                // Official
                if (report.type === 'official') {
                  return (
                    <article
                      key={report.id}
                      className="p-3.5 rounded-2xl bg-[#332d65]/80 backdrop-blur-md border border-[#8b4dff]/40 shadow-lg flex flex-col gap-1.5 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#d2bcff] flex items-center justify-center text-[#3e008e]">
                            <span className="material-symbols-outlined text-[13px]">shield</span>
                          </div>
                          <span className="font-label-md text-xs text-[#d2bcff] font-bold">
                            {report.author}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#8b4dff] text-white font-label-sm text-[9px] uppercase font-bold">
                          Official
                        </span>
                      </div>
                      <p className="font-body-sm text-xs text-[#e4dfff] leading-relaxed">
                        {report.content}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[#958da1] font-mono border-t border-[#4a4455]/40 pt-1">
                        <span>{report.authorRole}</span>
                        <span>{report.timestamp}</span>
                      </div>
                    </article>
                  );
                }

                // Standard Commuter Message or Sighting
                return (
                  <article
                    key={report.id}
                    className="p-3.5 rounded-2xl bg-[#19114b]/90 backdrop-blur-md border border-[#28225a] shadow-md flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full ${
                            report.avatarBg || 'bg-[#8b4dff]'
                          } flex items-center justify-center text-white font-label-sm text-[10px] font-bold`}
                        >
                          {report.avatarText || 'US'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-headline-sm text-xs font-semibold text-white">
                              {report.author}
                            </span>
                            {report.authorBadge && (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/70 text-emerald-300 font-label-sm text-[9px] border border-emerald-500/20">
                                {report.authorBadge}
                              </span>
                            )}
                          </div>
                          {report.authorRole && (
                            <span className="font-label-sm text-[10px] text-[#958da1] block font-mono">
                              {report.authorRole}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-label-sm text-[10px] text-[#958da1] font-mono">
                        {report.timestamp}
                      </span>
                    </div>

                    <p className="font-body-sm text-xs text-[#e4dfff] leading-relaxed">
                      {report.content}
                    </p>

                    {report.statusBadge && (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0055ea]/20 border border-[#0055ea]/40 text-[#b5c4ff] font-label-sm text-[11px] font-semibold">
                          <span className="material-symbols-outlined text-[13px]">airline_seat_recline_extra</span>
                          {report.statusBadge}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-[#28225a]/60">
                      <button
                        onClick={() => toggleHelpful(report.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-[11px] transition-all ${
                          votedReports.has(report.id)
                            ? 'bg-[#8b4dff] text-white font-bold'
                            : 'bg-[#28225a] hover:bg-[#37326a] text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">thumb_up</span>
                        <span>Helpful ({report.helpfulCount || 0})</span>
                      </button>

                      <button
                        onClick={() => setInputText(`@${report.author} `)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#28225a] hover:bg-[#37326a] text-[#ccc3d8] hover:text-white font-label-sm text-[11px]"
                      >
                        <span className="material-symbols-outlined text-[13px]">reply</span>
                        <span>Reply</span>
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* STICKY BOTTOM INPUT DOCK FOR THIS BUS */}
        <div className="fixed bottom-16 inset-x-0 max-w-lg mx-auto px-4 z-40">
          <div className="p-3 rounded-2xl bg-[#332d65]/95 backdrop-blur-2xl border border-[#4a4455]/70 shadow-[0_-8px_32px_rgba(6,3,15,0.85)] flex flex-col gap-2">
            {/* Quick Reaction Pills */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => handleQuickReaction('👍', 'Smooth transit & on schedule')}
                  className="px-2 py-0.5 rounded-full bg-[#28225a] hover:bg-[#37326a] text-white font-label-sm text-[11px] flex items-center gap-1 shrink-0"
                >
                  <span>👍</span>
                  <span className="text-[#ccc3d8]">Smooth</span>
                </button>
                <button
                  onClick={() => handleQuickReaction('⚠️', 'Congestion jam detected')}
                  className="px-2 py-0.5 rounded-full bg-[#28225a] hover:bg-[#37326a] text-white font-label-sm text-[11px] flex items-center gap-1 shrink-0"
                >
                  <span>⚠️</span>
                  <span className="text-[#ffb693]">Jam</span>
                </button>
                <button
                  onClick={() => handleQuickReaction('💺', 'Seats free onboard')}
                  className="px-2 py-0.5 rounded-full bg-[#28225a] hover:bg-[#37326a] text-white font-label-sm text-[11px] flex items-center gap-1 shrink-0"
                >
                  <span>💺</span>
                  <span className="text-[#b5c4ff]">Seats</span>
                </button>
                <button
                  onClick={() => handleQuickReaction('⏱️', '+5m delay')}
                  className="px-2 py-0.5 rounded-full bg-[#28225a] hover:bg-[#37326a] text-white font-label-sm text-[11px] flex items-center gap-1 shrink-0"
                >
                  <span>⏱️</span>
                  <span className="text-[#ccc3d8]">+5m</span>
                </button>
              </div>

              <span className="text-[#958da1] font-label-sm text-[10px] font-mono shrink-0 pl-1">
                {activeBus.name}
              </span>
            </div>

            {/* Main Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="flex items-center gap-1 bg-[#19114b]/90 rounded-full px-3 py-1.5 flex-1 border border-[#332d65]/60 shadow-inner">
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full bg-transparent border-none text-white placeholder:text-[#958da1] focus:outline-none font-body-sm text-xs"
                  placeholder={`Type a message for ${activeBus.name}...`}
                  type="text"
                />
              </div>

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#8b4dff] to-[#0055ea] text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-40 disabled:pointer-events-none shrink-0"
                title="Send Message"
                aria-label="Send message"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: ROUTE CHAT - SEARCH / RECENT / ACTIVE BUSES LIST
  // =========================================================================
  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 py-4 space-y-4 pb-36 text-[#e4dfff]">
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#8b4dff] text-white font-label-sm text-xs shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="chat">💬</span>
            <h1 className="font-headline-sm text-xl font-bold text-white">
              Route Chat
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#332d65]/90 border border-emerald-500/30 text-emerald-300 font-label-sm text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {buses.length} Fleet Buses Live
          </span>
        </div>
        <p className="font-body-sm text-xs text-[#ccc3d8]">
          Bus-specific live commuter conversations. Select a bus to view and share real-time reports.
        </p>
      </section>

      {/* 🔍 SEARCH BUS NUMBER OR ROUTE */}
      <section className="relative">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-[#958da1] pointer-events-none">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
            placeholder="Search bus number or route (e.g. 423, 510, Kurla)..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] focus:border-[#8b4dff] text-white placeholder:text-[#958da1] font-body-sm text-xs shadow-md focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-[#958da1] hover:text-white p-1"
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </section>

      {/* Filter Chips */}
      <section className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all ${
            statusFilter === 'all'
              ? 'bg-[#8b4dff] text-white font-bold shadow-[0_0_12px_rgba(139,77,255,0.4)]'
              : 'bg-[#28225a] text-[#ccc3d8] hover:text-white'
          }`}
        >
          All Buses ({buses.length})
        </button>
        <button
          onClick={() => setStatusFilter('live')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all ${
            statusFilter === 'live'
              ? 'bg-emerald-600 text-white font-bold shadow-[0_0_12px_rgba(5,150,105,0.4)]'
              : 'bg-[#28225a] text-[#ccc3d8] hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Live Tracking
        </button>
        <button
          onClick={() => setStatusFilter('on-time')}
          className={`px-3 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all ${
            statusFilter === 'on-time'
              ? 'bg-[#0055ea] text-white font-bold shadow-[0_0_12px_rgba(0,85,234,0.4)]'
              : 'bg-[#28225a] text-[#ccc3d8] hover:text-white'
          }`}
        >
          On-Time
        </button>
        <button
          onClick={() => setStatusFilter('delayed')}
          className={`px-3 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all ${
            statusFilter === 'delayed'
              ? 'bg-[#be581e] text-white font-bold shadow-[0_0_12px_rgba(190,88,30,0.4)]'
              : 'bg-[#28225a] text-[#ccc3d8] hover:text-white'
          }`}
        >
          Delayed
        </button>
      </section>

      {/* RECENT BUSES SECTION */}
      {!searchQuery && recentBuses.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#d2bcff]">history</span>
              <h2 className="font-label-sm text-xs font-bold text-[#d2bcff] uppercase tracking-wider">
                Recent Buses
              </h2>
            </div>
            <span className="font-label-sm text-[10px] text-[#958da1]">
              Quick Access
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recentBuses.map((bus) => {
              const busEndpoints = formatBusRouteEndpoints(bus);
              const messageCount = messagesByBus[bus.id]?.length || 0;

              return (
                <button
                  key={`recent-${bus.id}`}
                  onClick={() => handleSelectBus(bus)}
                  className="p-3 rounded-2xl bg-[#19114b]/90 hover:bg-[#28225a] border border-[#28225a] hover:border-[#8b4dff]/50 transition-all text-left flex items-center justify-between gap-3 shadow-md group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">🚌</span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-sm font-bold text-white">
                          {bus.name.replace(/^Bus\s*/i, '')}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-label-sm font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Live
                        </span>
                      </div>
                      <span className="font-body-sm text-[11px] text-[#ccc3d8] truncate">
                        {busEndpoints}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {messageCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#0b013e] text-[#d2bcff] font-mono text-[10px]">
                        {messageCount} msgs
                      </span>
                    )}
                    <span className="material-symbols-outlined text-[18px] text-[#958da1] group-hover:text-white transition-colors">
                      chevron_right
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ACTIVE BUSES SECTION */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">directions_bus</span>
            <h2 className="font-label-sm text-xs font-bold text-white uppercase tracking-wider">
              Active Buses
            </h2>
          </div>
          <span className="font-label-sm text-[11px] text-[#ccc3d8] font-mono">
            {filteredBuses.length} {filteredBuses.length === 1 ? 'bus' : 'buses'} available
          </span>
        </div>

        {/* Bus List Items */}
        <div className="space-y-2.5">
          {filteredBuses.map((bus) => {
            const busEndpoints = formatBusRouteEndpoints(bus);
            const busReports = messagesByBus[bus.id] || [];
            const latestMsg = busReports[0];
            const isDelayed = bus.status === 'delayed';

            return (
              <div
                key={bus.id}
                onClick={() => handleSelectBus(bus)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectBus(bus);
                  }
                }}
                className="w-full p-4 rounded-2xl bg-[#19114b]/95 hover:bg-[#201858] border border-[#28225a] hover:border-[#8b4dff]/60 shadow-[0_4px_16px_rgba(6,3,15,0.4)] transition-all cursor-pointer group flex flex-col gap-2.5"
              >
                {/* Main Card Header: Bus Number, Route, Live Status, Chevron */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#28225a] border border-[#332d65] flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                      🚌
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-headline-sm text-base font-extrabold text-white tracking-wide">
                          {bus.name.replace(/^Bus\s*/i, '')}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-[#28225a] text-[#b5c4ff] font-mono text-[10px]">
                          {bus.sector || 'Urban Corridor'}
                        </span>
                      </div>
                      <div className="font-body-md text-xs font-semibold text-[#b5c4ff] mt-0.5 truncate">
                        {busEndpoints}
                      </div>
                    </div>
                  </div>

                  {/* Live Status and Arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-[11px] font-bold ${
                          isDelayed
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isDelayed ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                          }`}
                        />
                        {isDelayed ? 'Delayed' : 'Live'}
                      </span>
                      {bus.nextStopEtaMinutes !== undefined && (
                        <span className="text-[10px] text-[#958da1] font-mono mt-0.5">
                          {bus.nextStopEtaMinutes}m to next stop
                        </span>
                      )}
                    </div>

                    <span className="material-symbols-outlined text-[24px] text-[#958da1] group-hover:text-white group-hover:translate-x-0.5 transition-all">
                      chevron_right
                    </span>
                  </div>
                </div>

                {/* Sub-strip: Current location, Next stop, and message count */}
                <div className="pt-2 border-t border-[#28225a]/60 flex items-center justify-between text-xs text-[#ccc3d8] gap-2 flex-wrap">
                  <div className="flex items-center gap-3 text-[11px] min-w-0">
                    {bus.nearestStop && (
                      <span className="flex items-center gap-1 truncate text-[#e4dfff]">
                        <span className="text-[#ffb693]">📍</span>
                        <span className="truncate">{bus.nearestStop}</span>
                      </span>
                    )}
                    {bus.nextStop && (
                      <span className="hidden sm:flex items-center gap-1 text-[#b5c4ff] truncate">
                        <span>➡</span>
                        <span className="truncate">{bus.nextStop}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-[#d2bcff] font-mono shrink-0 ml-auto">
                    <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
                    <span>{busReports.length} {busReports.length === 1 ? 'report' : 'reports'}</span>
                  </div>
                </div>

                {/* Latest commuter snippet preview if present */}
                {latestMsg && (
                  <div className="bg-[#100743]/60 rounded-xl px-2.5 py-1.5 text-[11px] text-[#ccc3d8] flex items-center gap-1.5 truncate border border-[#28225a]/50">
                    <span className="text-[#8b4dff] font-semibold shrink-0">
                      {latestMsg.author.split(' ')[0]}:
                    </span>
                    <span className="truncate text-[#e4dfff]">
                      {latestMsg.content}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* If search returns no default results, offer instant creation of a room */}
          {filteredBuses.length === 0 && searchQuery.trim() && (
            <div className="p-6 rounded-2xl bg-[#19114b]/80 border border-[#28225a] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#28225a] flex items-center justify-center mx-auto text-2xl">
                🚌
              </div>
              <div>
                <h3 className="font-headline-sm text-sm font-bold text-white">
                  No active buses matching &quot;{searchQuery}&quot;
                </h3>
                <p className="font-body-sm text-xs text-[#ccc3d8] mt-1">
                  You can start a dedicated conversation room for this bus number right now!
                </p>
              </div>
              <button
                onClick={() => handleCreateCustomBus(searchQuery)}
                className="px-4 py-2.5 rounded-full bg-gradient-to-r from-[#8b4dff] to-[#0055ea] text-white font-label-sm text-xs font-bold shadow-lg active:scale-95 transition-all flex items-center gap-2 mx-auto"
              >
                <span className="material-symbols-outlined text-[16px]">add_comment</span>
                <span>Open Chat Room for Bus {searchQuery.trim().toUpperCase()}</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
