import React from 'react';
import { RiskBadge } from '../common/RiskBadge';
import { Clock, Users, ArrowRight, HelpCircle, Ticket, Navigation, Accessibility, IndianRupee } from 'lucide-react';

export const BusCard = ({ bus, onOpenExplanation, onRequestSeat, onTrackBus }) => {
  const availableSeats = Math.max(0, bus.capacity - bus.currentOccupancy);

  return (
    <article 
      className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between space-y-6"
      aria-labelledby={`bus-title-${bus.id}`}
    >
      
      {/* Top Header - Chunking: Bus ID & Route Path */}
      <div className="space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 bg-[#075985] text-white rounded-xl flex items-center justify-center font-black text-lg shadow-sm shrink-0"
              aria-hidden="true"
            >
              {bus.id}
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#0F766E] bg-teal-50 px-3 py-1 rounded-md border border-teal-300 inline-block">
                {bus.routeNumber}
              </span>
              <h3 id={`bus-title-${bus.id}`} className="text-xl font-black text-[#172033] mt-1 flex items-center gap-1.5 flex-wrap">
                <span>{bus.origin}</span>
                <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                <span>{bus.destination}</span>
              </h3>
            </div>
          </div>

          {/* Multi-channel risk badge */}
          <RiskBadge riskLevel={bus.riskLevel} probability={bus.overcrowdingProbability} />
        </div>

        {/* Schedule & Metrics Grid - Chunking: Visual Grouping */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-extrabold">
              <Clock className="w-4 h-4 text-[#075985]" aria-hidden="true" />
              <span>Departure</span>
            </div>
            <div className="text-base font-black text-[#172033]">{bus.departureTime}</div>
            <div className="text-xs text-slate-600 font-bold">{bus.estimatedDuration}</div>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-extrabold">
              <Users className="w-4 h-4 text-[#075985]" aria-hidden="true" />
              <span>Available Seats</span>
            </div>
            <div className="text-base font-black text-[#172033]">{availableSeats} seats</div>
            <div className="text-xs text-slate-600 font-bold">Total: {bus.capacity}</div>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-extrabold">
              <Users className="w-4 h-4 text-amber-800" aria-hidden="true" />
              <span>Predicted Demand</span>
            </div>
            <div className="text-base font-black text-[#92400E]">{bus.predictedDemand} pass.</div>
            <div className="text-xs text-[#92400E] font-bold">Util: {Math.round((bus.predictedDemand / bus.capacity) * 100)}%</div>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-extrabold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>Service Type</span>
            </div>
            <div className="text-base font-black text-slate-800">Institute Amenity</div>
            <div className="text-xs text-slate-600 font-bold">Campus Shuttle</div>
          </div>
        </div>

        {/* Accessibility Features */}
        <div>
          <div className="text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5">
            <Accessibility className="w-4 h-4 text-[#075985]" aria-hidden="true" />
            <span>Accessibility Facilities Onboard:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bus.accessibility.map((tag, i) => (
              <span key={i} className="text-xs bg-slate-100 text-slate-800 font-extrabold px-3 py-1 rounded-lg border border-slate-300 flex items-center gap-1">
                <span className="text-[#065F46] font-black" aria-hidden="true">✓</span>
                <span>{tag}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons - Fitts's Law: 44px Minimum Touch Target Height */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={() => onOpenExplanation(bus)}
          className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 text-[#172033] font-extrabold text-xs rounded-xl hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-sky-600 transition-colors border border-slate-300"
          aria-label={`Why is bus ${bus.id} crowded? View Explainable AI SHAP breakdown.`}
        >
          <HelpCircle className="w-4 h-4 text-[#075985]" aria-hidden="true" />
          <span>Why is this crowded?</span>
        </button>

        <button
          onClick={() => onRequestSeat(bus)}
          className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 bg-[#075985] text-white font-black text-xs rounded-xl hover:bg-[#0C4A6E] focus:outline-none focus:ring-4 focus:ring-sky-300 transition-colors shadow-sm"
          aria-label={`Request seat allocation on bus ${bus.id}`}
        >
          <Ticket className="w-4 h-4" aria-hidden="true" />
          <span>Request Seat</span>
        </button>

        <button
          onClick={() => onTrackBus(bus)}
          className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0F766E] text-white font-extrabold text-xs rounded-xl hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-sky-300 transition-colors"
          aria-label={`Track live location of bus ${bus.id}`}
        >
          <Navigation className="w-4 h-4" aria-hidden="true" />
          <span>Track Bus</span>
        </button>
      </div>

    </article>
  );
};
