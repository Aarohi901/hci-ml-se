import React, { useRef } from 'react';
import { Bus, MapPin, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

/**
 * Popular IIIT Pune Shuttle Route Legs with Compact Vector Pills
 * Features route pin icon, bold route text, timetable badge, and animated arrow.
 */
export const PopularRoutesStrip = ({ onSelectRoute }) => {
  const { announce } = useAccessibility();
  const scrollContainerRef = useRef(null);

  const routes = [
    { 
      fromTitle: 'Campus Main Gate', 
      toTitle: 'Talegaon Station', 
      from: 'IIIT Pune Campus (Main Gate)', 
      to: 'Talegaon Station', 
      tag: 'Station Express', 
      time: 'T3, T5, T7, T10' 
    },
    { 
      fromTitle: 'Talegaon Station', 
      toTitle: 'Campus Main Gate', 
      from: 'Talegaon Station', 
      to: 'IIIT Pune Campus (Main Gate)', 
      tag: 'Station Return', 
      time: 'T4, T6, T8' 
    },
    { 
      fromTitle: 'Campus Main Gate', 
      toTitle: 'Godavari Hostel', 
      from: 'IIIT Pune Campus (Main Gate)', 
      to: 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)', 
      tag: 'Hostel Outbound', 
      time: 'T1, T3, T5, T7, T10' 
    },
    { 
      fromTitle: 'Godavari Hostel', 
      toTitle: 'Campus Main Gate', 
      from: 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)', 
      to: 'IIIT Pune Campus (Main Gate)', 
      tag: 'Campus Inbound', 
      time: 'T2, T4, T6, T8, T9' 
    },
    { 
      fromTitle: 'Godavari Hostel', 
      toTitle: 'Talegaon Station', 
      from: 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)', 
      to: 'Talegaon Station', 
      tag: 'Station Link', 
      time: 'Regular Service' 
    },
    { 
      fromTitle: 'Campus Main Gate', 
      toTitle: 'Medical Store / Hospital', 
      from: 'IIIT Pune Campus (Main Gate)', 
      to: 'Medical Store', 
      tag: 'Healthcare Stop', 
      time: 'Priority Route' 
    }
  ];

  const handleScroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const offset = direction === 'left' ? -260 : 260;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleSelect = (r) => {
    if (onSelectRoute) {
      onSelectRoute(r.from, r.to);
    }
    announce(`Selected route from ${r.fromTitle} to ${r.toTitle}`);
  };

  return (
    <div className="w-full relative py-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Bus className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Frequent Shuttle Legs (IIIT Pune Route)
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center transition-all shadow-xs"
            aria-label="Scroll legs left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center transition-all shadow-xs"
            aria-label="Scroll legs right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto scrollbar-none pb-2 pt-1 px-1 focus:outline-none"
        tabIndex={0}
        aria-label="Popular route legs"
      >
        {routes.map((route, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelect(route)}
            className="group shrink-0 flex items-center gap-3 bg-white hover:bg-sky-50/50 border border-slate-200 hover:border-sky-300 rounded-xl px-4 py-2.5 transition-all duration-200 shadow-xs hover:shadow-sm text-left focus:ring-2 focus:ring-sky-500"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-100/70 text-sky-700 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                <span>{route.fromTitle}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-transform" />
                <span>{route.toTitle}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                <span className="font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded text-[10px]">{route.tag}</span>
                <span>•</span>
                <span>{route.time}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
