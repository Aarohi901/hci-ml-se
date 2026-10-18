import React, { useState, useRef, useEffect } from 'react';
import { 
  Circle, 
  MapPin, 
  ArrowDownUp, 
  X, 
  Search, 
  Calendar, 
  Clock, 
  Zap, 
  Snowflake, 
  Accessibility, 
  ShieldCheck, 
  AlertCircle,
  Bus,
  Check,
  Compass
} from 'lucide-react';
import { STOPS, ROUTE_INFO, TIMETABLE } from '../../data/iiitBusData';

const CAMPUS_STOPS = STOPS.map(s => ({
  name: s.name,
  type: s.isTerminus ? 'Terminus Station' : (s.isHostelTerminus ? 'Hostel Hub' : 'Campus Transit Stop'),
  code: `STP-${s.index}`,
  landmark: s.landmark,
  index: s.index
}));

export const JourneyPlannerCard = ({ 
  initialFrom = 'IIIT Pune Campus (Main Gate)', 
  initialTo = 'Talegaon Station', 
  onSearch,
  onOpenAlerts
}) => {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [timingMode, setTimingMode] = useState('leave-now'); // 'leave-now' | 'depart-at' | 'arrive-by'
  const [departureDate, setDepartureDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [departureTime, setDepartureTime] = useState('08:00');
  
  // Real commuter transit filters
  const [filters, setFilters] = useState({
    directOnly: false,
    acOnly: true,
    wheelchair: false,
    lowFloor: false
  });

  // Autocomplete state
  const [activeInput, setActiveInput] = useState(null); // 'from' | 'to' | null
  const [activeIndex, setActiveIndex] = useState(-1);
  const [validationError, setValidationError] = useState('');

  const fromInputRef = useRef(null);
  const toInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync prop changes if external stop selected from map
  useEffect(() => {
    if (initialFrom) setFrom(initialFrom);
  }, [initialFrom]);

  useEffect(() => {
    if (initialTo) setTo(initialTo);
  }, [initialTo]);

  // Derive direction
  const fromStop = STOPS.find(s => s.name.toLowerCase() === from.toLowerCase()) || STOPS[0];
  const toStop = STOPS.find(s => s.name.toLowerCase() === to.toLowerCase()) || STOPS[4];
  const isAwayFromCampus = (toStop.index || 5) > (fromStop.index || 1);
  const derivedDirection = isAwayFromCampus ? 'AWAY_FROM_CAMPUS' : 'TOWARD_CAMPUS';

  // Filter stations based on query
  const getSuggestions = (query) => {
    if (!query || query.trim() === '') return CAMPUS_STOPS;
    const clean = query.toLowerCase().trim();
    return CAMPUS_STOPS.filter(s => 
      s.name.toLowerCase().includes(clean) || 
      s.type.toLowerCase().includes(clean) ||
      s.code.toLowerCase().includes(clean) ||
      (s.landmark && s.landmark.toLowerCase().includes(clean))
    );
  };

  const currentSuggestions = activeInput === 'from' 
    ? getSuggestions(from) 
    : activeInput === 'to' 
      ? getSuggestions(to) 
      : [];

  // Two-way swap function
  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
    setValidationError('');
  };

  // Field clear
  const handleClear = (field) => {
    if (field === 'from') {
      setFrom('');
      fromInputRef.current?.focus();
    } else {
      setTo('');
      toInputRef.current?.focus();
    }
    setValidationError('');
  };

  // Keyboard navigation for typeahead
  const handleKeyDown = (e, field) => {
    if (currentSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < currentSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : currentSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < currentSuggestions.length) {
        e.preventDefault();
        selectSuggestion(currentSuggestions[activeIndex].name, field);
      }
    } else if (e.key === 'Escape') {
      setActiveInput(null);
      setActiveIndex(-1);
    }
  };

  const selectSuggestion = (stationName, field) => {
    if (field === 'from') {
      setFrom(stationName);
      toInputRef.current?.focus();
    } else {
      setTo(stationName);
    }
    setActiveInput(null);
    setActiveIndex(-1);
    setValidationError('');
  };

  // Toggle commuter preference filter
  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Form submission & validation
  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanFrom = from.trim();
    const cleanTo = to.trim();

    if (!cleanFrom || !cleanTo) {
      setValidationError('Please specify both your origin and destination stop along the IIIT Pune route.');
      return;
    }

    if (cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
      setValidationError('Origin and destination cannot be identical. Please choose distinct shuttle stops.');
      return;
    }

    setValidationError('');

    if (onSearch) {
      onSearch({
        from: cleanFrom,
        to: cleanTo,
        timingMode,
        departureDate,
        departureTime,
        direction: derivedDirection,
        filters
      });
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl p-5 sm:p-7 relative transition-all duration-300">
      
      {/* Route Badge & Direction Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1.5 shadow-xs">
            <Bus className="w-3.5 h-3.5" />
            <span>IIIT Pune ⇄ Talegaon / Godavari Route</span>
          </span>
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">
            10 Daily Trips • 3 Fleet Buses
          </span>
        </div>

        {/* Auto-derived Direction Chip */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Compass className="w-3.5 h-3.5 text-sky-600" />
          <span>
            {derivedDirection === 'AWAY_FROM_CAMPUS' 
              ? 'Outbound: Campus ➔ Talegaon' 
              : 'Inbound: Talegaon ➔ Campus'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Origin / Destination Dual Row with Swap */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center relative">
          
          {/* FROM STOP */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Circle className="w-3 h-3 text-sky-600 fill-sky-600" />
              <span>Boarding Stop</span>
            </label>
            <div className="relative">
              <input
                ref={fromInputRef}
                type="text"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setActiveInput('from');
                  setValidationError('');
                }}
                onFocus={() => {
                  setActiveInput('from');
                  setActiveIndex(-1);
                }}
                onKeyDown={(e) => handleKeyDown(e, 'from')}
                placeholder="Pick boarding stop..."
                className="w-full pl-3.5 pr-8 py-2.5 text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 rounded-xl text-slate-900 transition-all outline-none focus:ring-2 focus:ring-sky-100"
                aria-label="Boarding stop"
                autoComplete="off"
              />
              {from && (
                <button
                  type="button"
                  onClick={() => handleClear('from')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Clear boarding stop"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown for FROM */}
            {activeInput === 'from' && (
              <div 
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-40 py-1 divide-y divide-slate-100"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                  IIIT Pune Route Stops (In Order)
                </div>
                {currentSuggestions.map((item, idx) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => selectSuggestion(item.name, 'from')}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                      idx === activeIndex ? 'bg-sky-50 text-sky-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {item.index}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 ml-5.5">{item.landmark}</div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{item.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SWAP BUTTON */}
          <div className="flex justify-center -my-1 md:my-0">
            <button
              type="button"
              onClick={handleSwap}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 border border-slate-200 hover:border-sky-300 flex items-center justify-center transition-all shadow-xs focus:ring-2 focus:ring-sky-400"
              title="Reverse route direction"
              aria-label="Reverse route direction"
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* TO STOP */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>Destination Stop</span>
            </label>
            <div className="relative">
              <input
                ref={toInputRef}
                type="text"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setActiveInput('to');
                  setValidationError('');
                }}
                onFocus={() => {
                  setActiveInput('to');
                  setActiveIndex(-1);
                }}
                onKeyDown={(e) => handleKeyDown(e, 'to')}
                placeholder="Pick destination stop..."
                className="w-full pl-3.5 pr-8 py-2.5 text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 rounded-xl text-slate-900 transition-all outline-none focus:ring-2 focus:ring-sky-100"
                aria-label="Destination stop"
                autoComplete="off"
              />
              {to && (
                <button
                  type="button"
                  onClick={() => handleClear('to')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Clear destination stop"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown for TO */}
            {activeInput === 'to' && (
              <div 
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-40 py-1 divide-y divide-slate-100"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                  IIIT Pune Route Stops (In Order)
                </div>
                {currentSuggestions.map((item, idx) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => selectSuggestion(item.name, 'to')}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                      idx === activeIndex ? 'bg-sky-50 text-sky-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {item.index}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 ml-5.5">{item.landmark}</div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{item.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Date & Departure Time Band */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Journey Date</span>
            </label>
            <input
              type="date"
              value={departureDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 rounded-xl text-slate-900 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Target Trip Time</span>
            </label>
            <select
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 rounded-xl text-slate-900 transition-all outline-none font-medium"
            >
              {TIMETABLE.filter(t => t.direction === derivedDirection).map((t) => (
                <option key={t.tripId} value={t.departureTime}>
                  {t.tripId}: {t.departureTime} ({t.origin} ➔ {t.destination.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 px-6 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-sm tracking-wide uppercase rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-sky-400 focus:outline-none"
          >
            <Search className="w-4 h-4" />
            <span>Search Shuttle Timetable (T1–T10)</span>
          </button>
        </div>

      </form>
    </div>
  );
};
