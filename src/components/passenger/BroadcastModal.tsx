import React, { useState } from 'react';
import { OccupancyLevel } from '../../types';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sighting: any) => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [busNumber, setBusNumber] = useState('21A');
  const [stopLocation, setStopLocation] = useState('Sanpada Jct');
  const [occupancy, setOccupancy] = useState<OccupancyLevel>('seats_full');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      busNumber,
      stopLocation,
      occupancy,
      notes,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-md p-5 rounded-2xl bg-[#1d164f] border border-[#332d65] shadow-2xl flex flex-col gap-4 text-white animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-[#28225a]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#8b4dff] flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[20px]">campaign</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-base font-bold">Broadcast Bus Sighting</h3>
              <span className="font-label-sm text-[11px] text-[#b5c4ff] block">
                Instant crowd confidence verification
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#958da1] hover:text-white hover:bg-[#28225a] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="font-label-sm text-xs text-[#ccc3d8] uppercase tracking-wider block mb-1">
              Bus Line / Fleet ID
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['21A', '21B', '21C', '15C'].map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBusNumber(b)}
                  className={`py-2 rounded-xl font-label-md text-xs font-bold border transition-all ${
                    busNumber === b
                      ? 'bg-[#8b4dff] text-white border-[#d2bcff] shadow-[0_0_12px_rgba(139,77,255,0.5)]'
                      : 'bg-[#100743] text-[#ccc3d8] border-[#28225a] hover:bg-[#28225a]'
                  }`}
                >
                  Bus {b}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-label-sm text-xs text-[#ccc3d8] uppercase tracking-wider block mb-1">
              Observed Stop / Sector
            </label>
            <select
              value={stopLocation}
              onChange={(e) => setStopLocation(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#100743] border border-[#28225a] text-white text-xs font-body-md focus:outline-none focus:border-[#8b4dff]"
            >
              <option value="Vashi Intermodal">Vashi Intermodal Terminus</option>
              <option value="Sanpada Jct">Sanpada Jct (Stop #2)</option>
              <option value="Turbhe Naka Flyover">Turbhe Naka Flyover (Bottleneck)</option>
              <option value="Juinagar Node">Juinagar Node</option>
              <option value="Nerul L.P.">Nerul L.P. Transit Hub</option>
              <option value="Seawoods Grand Central">Seawoods Grand Central</option>
              <option value="CBD Belapur">CBD Belapur Municipal Terminus</option>
            </select>
          </div>

          <div>
            <label className="font-label-sm text-xs text-[#ccc3d8] uppercase tracking-wider block mb-1">
              Onboard Crowd Density
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOccupancy('empty')}
                className={`py-2 rounded-xl text-xs font-label-sm font-semibold border transition-all ${
                  occupancy === 'empty'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                    : 'bg-[#100743] text-[#958da1] border-[#28225a]'
                }`}
              >
                ● Low Crowd
              </button>
              <button
                type="button"
                onClick={() => setOccupancy('seats_full')}
                className={`py-2 rounded-xl text-xs font-label-sm font-semibold border transition-all ${
                  occupancy === 'seats_full'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                    : 'bg-[#100743] text-[#958da1] border-[#28225a]'
                }`}
              >
                ● Seats Full
              </button>
              <button
                type="button"
                onClick={() => setOccupancy('crowded')}
                className={`py-2 rounded-xl text-xs font-label-sm font-semibold border transition-all ${
                  occupancy === 'crowded'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                    : 'bg-[#100743] text-[#958da1] border-[#28225a]'
                }`}
              >
                ● Packed
              </button>
            </div>
          </div>

          <div>
            <label className="font-label-sm text-xs text-[#ccc3d8] uppercase tracking-wider block mb-1">
              Optional Commuter Note
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. AC running cold, conductor handing tickets..."
              className="w-full p-2.5 rounded-xl bg-[#100743] border border-[#28225a] text-white text-xs font-body-sm focus:outline-none focus:border-[#8b4dff] placeholder:text-[#958da1]"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#28225a] text-[#ccc3d8] hover:text-white font-label-sm text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8b4dff] to-[#0055ea] text-white font-label-sm text-xs font-bold shadow-[0_0_16px_rgba(139,77,255,0.5)] active:scale-95 transition-all"
            >
              Broadcast Signal (+15 pts)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
