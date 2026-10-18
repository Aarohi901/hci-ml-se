import React from 'react';

/**
 * Sleek Vector Operator Logos & Brand Badges (Pure Inline SVG / CSS)
 * Zero external image dependencies.
 */
export const OperatorBadge = ({ operator = '', className = '' }) => {
  const opLower = (operator || '').toLowerCase();

  // 0. IIIT Pune Official Campus Shuttle (Primary Badge)
  if (opLower.includes('iiit') || opLower.includes('campus') || opLower.includes('shuttle') || !operator) {
    return (
      <div 
        className={`w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 via-[#0369a1] to-sky-900 shadow-xs flex items-center justify-center shrink-0 border border-sky-300/40 text-white font-bold text-xs ${className}`}
        title="IIIT Pune Official Campus Shuttle"
        aria-label="IIIT Pune Official Transit Badge"
      >
        <span className="text-[9px] font-black tracking-wider font-mono">IIITP</span>
      </div>
    );
  }

  // 1. IntrCity SmartBus (Modern indigo/cyan pill with lightning/speed bus icon)
  if (opLower.includes('intrcity') || opLower.includes('smartbus')) {
    return (
      <div 
        className={`w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 p-0.5 shadow-xs flex items-center justify-center shrink-0 ${className}`}
        title={operator}
        aria-label={`${operator} Brand Badge`}
      >
        <div className="w-full h-full bg-[#0284c7]/20 rounded-[10px] flex items-center justify-center backdrop-blur-xs">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-5 h-5 text-white"
            aria-hidden="true"
          >
            {/* Speed streak & lightning bus vector */}
            <path 
              d="M3 13L13 3L11 11H21L11 21L13 13H3Z" 
              fill="currentColor"
              stroke="#E0F2FE"
              strokeWidth="0.8"
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
        </div>
      </div>
    );
  }

  // 2. Prasanna Purple (Deep purple monogram circle with white stylized "P" vector)
  if (opLower.includes('prasanna') || opLower.includes('purple')) {
    return (
      <div 
        className={`w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#581c87] shadow-xs flex items-center justify-center shrink-0 border border-purple-400/30 ${className}`}
        title={operator}
        aria-label={`${operator} Brand Badge`}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-5 h-5 text-white"
          aria-hidden="true"
        >
          {/* Stylized Modern P Monogram */}
          <path 
            d="M6 4H14.5C17.5 4 19.5 5.8 19.5 8.8C19.5 11.8 17.5 13.6 14.5 13.6H10V20H6V4Z" 
            fill="currentColor" 
          />
          <path 
            d="M10 7.5H14C15.4 7.5 16.2 8.1 16.2 8.8C16.2 9.5 15.4 10.1 14 10.1H10V7.5Z" 
            fill="#581C87" 
          />
          <circle cx="17.5" cy="18" r="2" fill="#E9D5FF" />
        </svg>
      </div>
    );
  }

  // 3. FlixBus (Crisp electric-lime / forest-green badge with sleek arrow insignia)
  if (opLower.includes('flix') || opLower.includes('flixbus')) {
    return (
      <div 
        className={`w-9 h-9 rounded-xl bg-gradient-to-br from-[#22c55e] via-[#16a34a] to-[#15803d] shadow-xs flex items-center justify-center shrink-0 border border-emerald-300/40 ${className}`}
        title={operator}
        aria-label={`${operator} Brand Badge`}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-5 h-5 text-white"
          aria-hidden="true"
        >
          {/* Dual Dynamic Forward Chevrons / Transit Arrow */}
          <path 
            d="M5 6L11 12L5 18M13 6L19 12L13 18" 
            stroke="currentColor" 
            strokeWidth="3.2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>
    );
  }

  // 4. Zingbus / Regional Express Operators (Amber/coral accent badge with bus/shield emblem)
  if (opLower.includes('zing') || opLower.includes('zingbus') || opLower.includes('regional')) {
    return (
      <div 
        className={`w-9 h-9 rounded-xl bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] shadow-xs flex items-center justify-center shrink-0 border border-amber-300/30 ${className}`}
        title={operator}
        aria-label={`${operator} Brand Badge`}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-5 h-5 text-white"
          aria-hidden="true"
        >
          {/* Shield with Bus Crest */}
          <path 
            d="M12 2L4 5V11C4 16.5 7.4 21.6 12 23C16.6 21.6 20 16.5 20 11V5L12 2Z" 
            fill="currentColor" 
            fillOpacity="0.25"
            stroke="currentColor" 
            strokeWidth="1.8" 
          />
          <path 
            d="M8 8H16V14C16 14.6 15.6 15 15 15H9C8.4 15 8 14.6 8 14V8Z" 
            fill="currentColor" 
          />
          <circle cx="10" cy="13" r="1" fill="#EA580C" />
          <circle cx="14" cy="13" r="1" fill="#EA580C" />
        </svg>
      </div>
    );
  }

  // 5. Dynamic Fallback Badge Component:
  // Extracts monogram initials and maps to an auto-colored subtle gradient chip
  const cleanName = (operator || 'Transit').trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  let initials = 'SB';
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    initials = words[0].substring(0, 2).toUpperCase();
  } else if (words.length === 1) {
    initials = words[0][0].toUpperCase();
  }

  // Deterministic palette hash
  const palettes = [
    { bg: 'from-blue-600 to-indigo-700', border: 'border-blue-400/30', text: 'text-white' },
    { bg: 'from-amber-500 to-orange-600', border: 'border-amber-400/30', text: 'text-white' },
    { bg: 'from-emerald-600 to-teal-700', border: 'border-emerald-400/30', text: 'text-white' },
    { bg: 'from-violet-600 to-purple-800', border: 'border-violet-400/30', text: 'text-white' },
    { bg: 'from-rose-500 to-pink-600', border: 'border-rose-400/30', text: 'text-white' },
    { bg: 'from-cyan-600 to-sky-700', border: 'border-cyan-400/30', text: 'text-white' }
  ];

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = palettes[Math.abs(hash) % palettes.length];

  return (
    <div 
      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${palette.bg} ${palette.border} border shadow-xs flex items-center justify-center shrink-0 ${className}`}
      title={operator}
      aria-label={`${operator} Initials Monogram`}
    >
      <span className={`text-xs font-bold font-mono tracking-tight ${palette.text}`}>
        {initials}
      </span>
    </div>
  );
};

export default OperatorBadge;
