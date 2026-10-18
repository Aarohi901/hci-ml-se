import React, { useState, useRef, useEffect } from 'react';
import { 
  Bus, 
  MapPin, 
  ArrowLeftRight, 
  Calendar, 
  X, 
  AlertCircle, 
  ChevronRight 
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTranslation } from '../../context/TranslationContext';

const POPULAR_TERMINALS = [
  { city: 'IIIT Pune', terminal: 'IIIT Pune Campus (Main Gate)', landmark: 'Campus Terminus & Admin Block' },
  { city: 'Talegaon Route', terminal: 'Talegaon Station', landmark: 'Railway Station Central Platform' },
  { city: 'Talegaon Route', terminal: 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)', landmark: 'Godavari Boys Off-Campus Residence' },
  { city: 'Talegaon Route', terminal: 'L&T Circle', landmark: 'Industrial Highway Junction' },
  { city: 'Talegaon Route', terminal: 'Restaurant Chain', landmark: 'Student Food Plaza' },
  { city: 'Talegaon Route', terminal: 'Medical Store', landmark: 'Pharmacy & Wellness Centre' },
  { city: 'Talegaon Route', terminal: 'Hospital', landmark: 'General Health Care Hospital' },
  { city: 'Talegaon Route', terminal: 'Laptop Service Centre', landmark: 'IT Hardware Hub' }
];

export const BusSearchRibbon = ({ 
  initialFrom = 'IIIT Pune Campus (Main Gate)', 
  initialTo = 'Talegaon Station', 
  onSearch 
}) => {
  const { announce } = useAccessibility();
  const { t } = useTranslation();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [journeyDate, setJourneyDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [activeDropdown, setActiveDropdown] = useState(null); // 'from' | 'to' | null
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [validationError, setValidationError] = useState('');
  const [isSwapped, setIsSwapped] = useState(false);

  const fromRef = useRef(null);
  const toRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (initialFrom) setFrom(initialFrom);
  }, [initialFrom]);

  useEffect(() => {
    if (initialTo) setTo(initialTo);
  }, [initialTo]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterTerminals = (query) => {
    if (!query || query.trim() === '') return POPULAR_TERMINALS.slice(0, 6);
    const q = query.toLowerCase().trim();
    return POPULAR_TERMINALS.filter(t => 
      t.terminal.toLowerCase().includes(q) || 
      t.landmark.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q)
    );
  };

  const currentSuggestions = activeDropdown === 'from' 
    ? filterTerminals(from) 
    : activeDropdown === 'to' 
      ? filterTerminals(to) 
      : [];

  // Swap terminals with smooth 180deg rotation and speech announcement
  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
    setIsSwapped(prev => !prev);
    setValidationError('');
    announce(`Swapped departure to ${to} and destination to ${temp}`);
  };

  const handleSelectSuggestion = (terminalName, field) => {
    if (field === 'from') {
      setFrom(terminalName);
      setActiveDropdown(null);
      toRef.current?.focus();
      announce(`Origin set to ${terminalName}`);
    } else {
      setTo(terminalName);
      setActiveDropdown(null);
      announce(`Destination set to ${terminalName}`);
    }
    setValidationError('');
  };

  const handleKeyDown = (e, field) => {
    if (currentSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < currentSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : currentSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < currentSuggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(currentSuggestions[focusedIndex].terminal, field);
      }
    } else if (e.key === 'Escape') {
      setActiveDropdown(null);
    }
  };

  const setQuickDate = (daysFromToday) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const dateStr = d.toISOString().split('T')[0];
    setJourneyDate(dateStr);
    announce(daysFromToday === 0 ? 'Date set to Today' : 'Date set to Tomorrow');
  };

  const formatDateDisplay = (dateStr) => {
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
      const year = dateObj.getFullYear();
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      return { day, month, year, weekday };
    } catch {
      return { day: '', month: '', year: '', weekday: '' };
    }
  };

  const formattedDate = formatDateDisplay(journeyDate);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanFrom = from.trim();
    const cleanTo = to.trim();

    if (!cleanFrom || !cleanTo) {
      setValidationError(t('search.error_both_stations'));
      announce('Error: Please enter both departure and arrival stations.');
      return;
    }

    if (cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
      setValidationError(t('search.error_identical'));
      announce('Error: Departure and arrival stations cannot be identical.');
      return;
    }

    setValidationError('');
    announce(`Searching buses from ${cleanFrom} to ${cleanTo} for ${journeyDate}`);
    if (onSearch) {
      onSearch({
        from: cleanFrom,
        to: cleanTo,
        date: journeyDate,
      });
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-6xl mx-auto space-y-4 overflow-visible relative z-20">
      {/* Inline Form Validation Alert */}
      {validationError && (
        <div 
          className="flex items-center gap-2.5 p-3.5 bg-red-50 border-2 border-red-300 text-red-900 text-xs sm:text-sm font-bold rounded-2xl animate-in fade-in duration-150"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Unified Inline Search Ribbon Container with Glassmorphism & Crisp Depth */}
      <form 
        onSubmit={handleSubmit}
        className="relative glass-search-ribbon search-ribbon-form rounded-2xl sm:rounded-3xl flex flex-col md:flex-row items-stretch transition-shadow duration-300 overflow-visible"
        role="search"
        aria-label="Bus journey search ribbon"
      >
        {/* 1. FROM Segment - Dynamic Z-Index elevation when active */}
        <div className={`from-segment relative flex-1 p-3 sm:p-4 min-h-[76px] flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-200/80 hover:bg-slate-50/50 transition-colors md:rounded-l-3xl rounded-t-2xl md:rounded-t-none ${
          activeDropdown === 'from' ? 'z-40' : 'z-10'
        }`}>
          <label htmlFor="ribbonFromInput" className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-0.5" data-i18n="fromLabel">
            {t('fromLabel')}
          </label>
          <div className="flex items-center gap-2.5">
            <Bus className="w-5 h-5 text-[#075985] shrink-0" aria-hidden="true" />
            <input
              id="ribbonFromInput"
              ref={fromRef}
              type="text"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setActiveDropdown('from');
                setValidationError('');
              }}
              onFocus={() => {
                setActiveDropdown('from');
                setFocusedIndex(-1);
              }}
              onKeyDown={(e) => handleKeyDown(e, 'from')}
              placeholder={t('fromPlaceholder')}
              data-i18n-placeholder="fromPlaceholder"
              className="w-full bg-transparent font-medium text-slate-900 text-base placeholder-slate-400 focus:outline-none"
              autoComplete="off"
              role="combobox"
              aria-expanded={activeDropdown === 'from'}
              aria-autocomplete="list"
            />
            {from && (
              <button
                type="button"
                onClick={() => { setFrom(''); fromRef.current?.focus(); }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
                aria-label="Clear From field"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown: FROM - Absolute positioning with high z-index and elevation shadow */}
          {activeDropdown === 'from' && currentSuggestions.length > 0 && (
            <div 
              id="from-autocomplete-dropdown"
              className="absolute top-full left-0 right-0 sm:right-auto w-full sm:min-w-[340px] max-w-md mt-1.5 bg-white border border-slate-200/90 rounded-2xl py-1 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto"
              style={{
                boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 10px 10px -5px rgba(15, 23, 42, 0.08)',
                zIndex: 9999
              }}
            >
              <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100" data-i18n="search.major_stations">
                {t('search.major_stations')}
              </div>
              {currentSuggestions.map((item, idx) => (
                <div
                  key={item.terminal}
                  onClick={() => handleSelectSuggestion(item.terminal, 'from')}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between text-xs font-medium transition-colors ${
                    idx === focusedIndex ? 'bg-sky-50 text-[#075985]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  role="option"
                  aria-selected={idx === focusedIndex}
                >
                  <div className="flex items-center gap-2.5">
                    <Bus className="w-4 h-4 text-[#075985] shrink-0" />
                    <div>
                      <span className="font-semibold block text-slate-900">{item.terminal}</span>
                      <span className="text-xs text-slate-400 font-normal">{item.landmark}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Swap Button with Smooth 180deg Rotation Animation */}
        <div className="relative self-center z-20 -my-3 md:my-0 md:-mx-4 flex justify-center">
          <button
            type="button"
            onClick={handleSwap}
            className={`w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md hover:shadow-lg hover:border-[#075985] flex items-center justify-center text-[#075985] hover:bg-sky-50 active:scale-95 focus:outline-none focus:ring-4 focus:ring-sky-200 transition-all ${
              isSwapped ? 'rotate-180' : 'rotate-0'
            }`}
            style={{ transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease' }}
            title={t('search.swap')}
            data-i18n-title="search.swap"
            aria-label="Swap departure and arrival stations"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. TO Segment - Dynamic Z-Index elevation when active */}
        <div className={`relative flex-1 p-3 sm:p-4 min-h-[76px] flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-200/80 hover:bg-slate-50/50 transition-colors ${
          activeDropdown === 'to' ? 'z-40' : 'z-10'
        }`}>
          <label htmlFor="ribbonToInput" className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-0.5" data-i18n="toLabel">
            {t('toLabel')}
          </label>
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-[#075985] shrink-0" aria-hidden="true" />
            <input
              id="ribbonToInput"
              ref={toRef}
              type="text"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setActiveDropdown('to');
                setValidationError('');
              }}
              onFocus={() => {
                setActiveDropdown('to');
                setFocusedIndex(-1);
              }}
              onKeyDown={(e) => handleKeyDown(e, 'to')}
              placeholder={t('toPlaceholder')}
              data-i18n-placeholder="toPlaceholder"
              className="w-full bg-transparent font-medium text-slate-900 text-base placeholder-slate-400 focus:outline-none"
              autoComplete="off"
              role="combobox"
              aria-expanded={activeDropdown === 'to'}
              aria-autocomplete="list"
            />
            {to && (
              <button
                type="button"
                onClick={() => { setTo(''); toRef.current?.focus(); }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
                aria-label="Clear To field"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown: TO - Absolute positioning with high z-index and elevation shadow */}
          {activeDropdown === 'to' && currentSuggestions.length > 0 && (
            <div 
              id="to-autocomplete-dropdown"
              className="absolute top-full left-0 right-0 sm:right-auto w-full sm:min-w-[340px] max-w-md mt-1.5 bg-white border border-slate-200/90 rounded-2xl py-1 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto"
              style={{
                boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 10px 10px -5px rgba(15, 23, 42, 0.08)',
                zIndex: 9999
              }}
            >
              <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100" data-i18n="search.major_stations">
                {t('search.major_stations')}
              </div>
              {currentSuggestions.map((item, idx) => (
                <div
                  key={item.terminal}
                  onClick={() => handleSelectSuggestion(item.terminal, 'to')}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between text-xs font-medium transition-colors ${
                    idx === focusedIndex ? 'bg-sky-50 text-[#075985]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  role="option"
                  aria-selected={idx === focusedIndex}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-[#075985] shrink-0" />
                    <div>
                      <span className="font-semibold block text-slate-900">{item.terminal}</span>
                      <span className="text-xs text-slate-400 font-normal">{item.landmark}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. DATE OF JOURNEY Segment */}
        <div className="relative flex-1 p-3 sm:p-4 min-h-[76px] flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-200 hover:bg-slate-50/70 transition-colors z-10">
          <label htmlFor="ribbonDateInput" className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-0.5" data-i18n="dateLabel">
            {t('dateLabel')}
          </label>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#075985] shrink-0" aria-hidden="true" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-semibold text-slate-900 tabular-nums">
                  {formattedDate.day} {formattedDate.month} {formattedDate.year}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  ({formattedDate.weekday})
                </span>
              </div>
            </div>

            <input
              id="ribbonDateInput"
              type="date"
              value={journeyDate}
              onChange={(e) => setJourneyDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              aria-label="Choose travel date"
            />
          </div>

          {/* Quick Date Shortcut Chips */}
          <div className="quick-date-chips flex items-center gap-1.5 mt-1 relative z-10">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setQuickDate(0); }}
              className="px-2.5 py-0.5 text-[10px] font-black rounded-lg bg-slate-100 hover:bg-sky-100 hover:text-[#075985] text-slate-700 border border-slate-200 transition-colors"
            >
              <span data-i18n="today">{t('today')}</span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setQuickDate(1); }}
              className="px-2.5 py-0.5 text-[10px] font-black rounded-lg bg-slate-100 hover:bg-sky-100 hover:text-[#075985] text-slate-700 border border-slate-200 transition-colors"
            >
              <span data-i18n="tomorrow">{t('tomorrow')}</span>
            </button>
          </div>
        </div>

        {/* 5. SEARCH BUSES CTA Button */}
        <div className="search-cta-segment flex items-stretch z-10">
          <button
            type="submit"
            className="search-buses-btn w-full md:w-auto min-h-[58px] md:min-h-[76px] px-8 sm:px-10 bg-gradient-to-r from-[#075985] to-[#0284c7] hover:from-[#0C4A6E] hover:to-[#0369a1] active:scale-95 text-white font-semibold text-sm tracking-wider uppercase md:rounded-r-3xl rounded-b-2xl md:rounded-b-none transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-sky-200 cursor-pointer"
          >
            <span data-i18n="searchBusesBtn">{t('searchBusesBtn')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
