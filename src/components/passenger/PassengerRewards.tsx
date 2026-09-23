import React, { useState } from 'react';

export const PassengerRewards: React.FC = () => {
  const [points, setPoints] = useState(94);
  const [redeemed, setRedeemed] = useState<string | null>(null);

  const handleRedeem = (name: string, cost: number) => {
    if (points >= cost) {
      setPoints(points - cost);
      setRedeemed(`Successfully redeemed: ${name}!`);
      setTimeout(() => setRedeemed(null), 3500);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 py-4 space-y-4 pb-28">
      {redeemed && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-label-sm text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{redeemed}</span>
        </div>
      )}

      {/* Rewards Balance Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#8b4dff]/40 via-[#1d164f] to-[#0055ea]/30 border border-[#8b4dff]/40 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-label-sm text-xs uppercase tracking-wider text-[#b5c4ff] font-semibold">
              BusMate Points
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-lg text-4xl font-extrabold text-white font-mono">
                {points}
              </span>
              <span className="font-label-sm text-xs text-[#d2bcff] font-semibold">
                PTS AVAILABLE
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#8b4dff] flex items-center justify-center text-white shadow-[0_0_16px_rgba(139,77,255,0.6)]">
            <span className="material-symbols-outlined text-[28px]">stars</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#332d65]/60 flex items-center justify-between font-label-sm text-xs text-[#ccc3d8]">
          <span>Commuter Rewards Program</span>
          <span className="text-[#b5c4ff]">Redeem for bus passes & local treats</span>
        </div>
      </div>

      {/* How to Earn Points */}
      <div className="p-4 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] shadow-md flex flex-col gap-3">
        <h3 className="font-headline-sm text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-[#8b4dff] text-[20px]">help_outline</span>
          How to Earn Points
        </h3>

        <div className="flex flex-col gap-2.5">
          <div className="p-3 rounded-xl bg-[#100743] border border-[#28225a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#8b4dff]/20 flex items-center justify-center text-[#d2bcff]">
                <span className="material-symbols-outlined text-[20px]">directions_bus</span>
              </div>
              <div>
                <span className="font-headline-sm text-xs font-bold text-white block">
                  Ride the Bus
                </span>
                <span className="text-[11px] text-[#958da1]">
                  Keep BusMate active during your daily bus commute
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold whitespace-nowrap">
              +15 pts
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#100743] border border-[#28225a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0055ea]/20 flex items-center justify-center text-[#b5c4ff]">
                <span className="material-symbols-outlined text-[20px]">verified</span>
              </div>
              <div>
                <span className="font-headline-sm text-xs font-bold text-white block">
                  Confirm Bus Arrivals
                </span>
                <span className="text-[11px] text-[#958da1]">
                  Help fellow riders by confirming when your bus arrives
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold whitespace-nowrap">
              +10 pts
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#100743] border border-[#28225a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#be581e]/20 flex items-center justify-center text-[#ffb693]">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              </div>
              <div>
                <span className="font-headline-sm text-xs font-bold text-white block">
                  Daily Commute Streak
                </span>
                <span className="text-[11px] text-[#958da1]">
                  Open BusMate on consecutive transit days
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold whitespace-nowrap">
              +5 pts
            </span>
          </div>
        </div>
      </div>

      {/* Redeemable Rewards */}
      <div className="p-4 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] shadow-md flex flex-col gap-3">
        <h3 className="font-headline-sm text-sm font-bold text-white uppercase tracking-wider">
          Redeem Commuter Perks
        </h3>

        <div className="flex flex-col gap-2.5">
          <div className="p-3 rounded-xl bg-[#19114b] border border-[#28225a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0055ea]/20 flex items-center justify-center text-[#b5c4ff]">
                <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
              </div>
              <div>
                <span className="font-headline-sm text-xs font-bold text-white block">
                  Free NMMT Bus Ride Pass
                </span>
                <span className="text-[11px] text-[#958da1]">Valid across Route 21 & 15</span>
              </div>
            </div>
            <button
              disabled={points < 50}
              onClick={() => handleRedeem('Free Bus Ride Pass', 50)}
              className={`px-3 py-1.5 rounded-lg font-label-sm text-xs font-bold transition-all ${
                points >= 50
                  ? 'bg-[#8b4dff] hover:bg-[#732ee6] text-white shadow-md'
                  : 'bg-[#28225a] text-[#958da1] cursor-not-allowed'
              }`}
            >
              50 pts
            </button>
          </div>

          <div className="p-3 rounded-xl bg-[#19114b] border border-[#28225a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#be581e]/20 flex items-center justify-center text-[#ffb693]">
                <span className="material-symbols-outlined text-[20px]">coffee</span>
              </div>
              <div>
                <span className="font-headline-sm text-xs font-bold text-white block">
                  Vashi Stn Chai / Coffee Voucher
                </span>
                <span className="text-[11px] text-[#958da1]">Platform 2 Station Kiosk</span>
              </div>
            </div>
            <button
              disabled={points < 40}
              onClick={() => handleRedeem('Chai/Coffee Voucher', 40)}
              className={`px-3 py-1.5 rounded-lg font-label-sm text-xs font-bold transition-all ${
                points >= 40
                  ? 'bg-[#be581e] hover:bg-[#a64917] text-white shadow-md'
                  : 'bg-[#28225a] text-[#958da1] cursor-not-allowed'
              }`}
            >
              40 pts
            </button>
          </div>

          <div className="p-3 rounded-xl bg-[#19114b] border border-[#28225a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                <span className="material-symbols-outlined text-[20px]">local_activity</span>
              </div>
              <div>
                <span className="font-headline-sm text-xs font-bold text-white block">
                  ₹20 Bus Fare Discount
                </span>
                <span className="text-[11px] text-[#958da1]">Applied to your next digital transit ticket</span>
              </div>
            </div>
            <button
              disabled={points < 25}
              onClick={() => handleRedeem('₹20 Bus Fare Discount', 25)}
              className={`px-3 py-1.5 rounded-lg font-label-sm text-xs font-bold transition-all ${
                points >= 25
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  : 'bg-[#28225a] text-[#958da1] cursor-not-allowed'
              }`}
            >
              25 pts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PassengerProfile: React.FC = () => {
  const [anonymousId, setAnonymousId] = useState('BM-8842-X9');
  const [batterySaver, setBatterySaver] = useState(true);
  const [notifyArrivals, setNotifyArrivals] = useState(true);
  const [notifyConfidence, setNotifyConfidence] = useState(true);
  const [notifyDisruptions, setNotifyDisruptions] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard?.writeText(anonymousId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateId = () => {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const suffix = ['X9', 'K4', 'M7', 'R2'][Math.floor(Math.random() * 4)];
    setAnonymousId(`BM-${randomHex}-${suffix}`);
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 py-4 space-y-4 pb-28 text-white">
      {/* Profile & Privacy Header */}
      <div className="p-5 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#8b4dff] to-[#0055ea] flex items-center justify-center text-white font-headline-sm text-xl font-bold shadow-[0_0_16px_rgba(139,77,255,0.6)]">
            <span className="material-symbols-outlined text-[28px]">shield_person</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-base font-bold">Profile & Privacy</h2>
            <span className="font-mono text-xs text-[#b5c4ff] block">
              Anonymous Commuter
            </span>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-emerald-300 font-label-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              No Account Required • Fully Private
            </span>
          </div>
        </div>
      </div>

      {/* Anonymous ID Card */}
      <div className="p-4 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#d2bcff] text-[18px]">fingerprint</span>
            <h3 className="font-headline-sm text-xs font-bold uppercase tracking-wider text-white">
              Anonymous ID
            </h3>
          </div>
          <button
            onClick={handleRegenerateId}
            className="text-xs font-label-sm text-[#b5c4ff] hover:text-white flex items-center gap-1 transition-colors"
            title="Generate new anonymous ID"
          >
            <span className="material-symbols-outlined text-[15px]">refresh</span>
            <span>Reset ID</span>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[#100743] border border-[#28225a] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-mono text-base font-bold tracking-wider text-white">
              {anonymousId}
            </span>
            <span className="text-[11px] text-[#958da1]">
              Rotated locally for zero cross-session tracking
            </span>
          </div>
          <button
            onClick={handleCopyId}
            className="px-3 py-1.5 rounded-lg bg-[#28225a] hover:bg-[#332d65] text-[#d2bcff] hover:text-white text-xs font-label-sm font-semibold flex items-center gap-1 transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Battery Saver Settings */}
      <div className="p-4 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] shadow-md flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">battery_saver</span>
          <h3 className="font-headline-sm text-xs font-bold uppercase tracking-wider text-white">
            Battery Optimization
          </h3>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-[#28225a]">
          <div>
            <span className="font-label-md text-xs font-semibold block text-white">
              Battery Saver Mode
            </span>
            <span className="text-[11px] text-[#958da1]">
              Optimizes background updates to minimize battery consumption while traveling
            </span>
          </div>
          <button
            onClick={() => setBatterySaver(!batterySaver)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              batterySaver ? 'bg-[#8b4dff]' : 'bg-[#28225a]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                batterySaver ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="p-4 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] shadow-md flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#d2bcff] text-[18px]">notifications</span>
          <h3 className="font-headline-sm text-xs font-bold uppercase tracking-wider text-white">
            Notification Settings
          </h3>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-[#28225a]">
          <div>
            <span className="font-label-md text-xs font-semibold block text-white">
              Bus Arrival Alerts
            </span>
            <span className="text-[11px] text-[#958da1]">
              Notify when approaching bus is within 3 minutes
            </span>
          </div>
          <button
            onClick={() => setNotifyArrivals(!notifyArrivals)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              notifyArrivals ? 'bg-[#8b4dff]' : 'bg-[#28225a]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                notifyArrivals ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-[#28225a]">
          <div>
            <span className="font-label-md text-xs font-semibold block text-white">
              Live Route Updates
            </span>
            <span className="text-[11px] text-[#958da1]">
              Alerts when live conditions change on your daily route
            </span>
          </div>
          <button
            onClick={() => setNotifyConfidence(!notifyConfidence)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              notifyConfidence ? 'bg-[#8b4dff]' : 'bg-[#28225a]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                notifyConfidence ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <span className="font-label-md text-xs font-semibold block text-white">
              Route Bottleneck & Delay Notices
            </span>
            <span className="text-[11px] text-[#958da1]">
              Receive alerts for significant route slowdowns and traffic incidents
            </span>
          </div>
          <button
            onClick={() => setNotifyDisruptions(!notifyDisruptions)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              notifyDisruptions ? 'bg-[#8b4dff]' : 'bg-[#28225a]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                notifyDisruptions ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="p-4 rounded-2xl bg-[#100743] border border-[#332d65] text-xs text-[#ccc3d8] flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#d2bcff] font-bold">
          <span className="material-symbols-outlined text-[18px]">lock</span>
          <span>Privacy Note & Guarantees</span>
        </div>
        <p className="leading-relaxed text-[#958da1]">
          BusMate respects your absolute privacy. Your location is never tied to your personal identity, phone number, or name. Location updates are purely used to calculate live bus arrivals and route movements, after which data points are automatically discarded.
        </p>
      </div>
    </div>
  );
};
