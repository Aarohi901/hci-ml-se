import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Bus, 
  ChevronRight, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import busesData from '../../data/buses.json';
import { BusSearchRibbon } from '../../components/passenger/BusSearchRibbon';
import { PopularRoutesStrip } from '../../components/passenger/PopularRoutesStrip';
import { BusSearchResults } from '../../components/passenger/BusSearchResults';
import { DeckSeatPicker } from '../../components/passenger/DeckSeatPicker';
import { BookingCheckoutModal } from '../../components/passenger/BookingCheckoutModal';
import { TicketReceiptModal } from '../../components/passenger/TicketReceiptModal';
import { OperatorBadge } from '../../components/passenger/OperatorBadge';
import { useTranslation } from '../../context/TranslationContext';

export const HomePage = () => {
  const navigate = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();
  const { t } = useTranslation();

  // Read URL query params or fallback to defaults
  const fromQuery = urlParams.get('from') || 'IIIT Pune Campus (Main Gate)';
  const toQuery = urlParams.get('to') || 'Talegaon Station';
  const dateQuery = urlParams.get('date') || new Date().toISOString().split('T')[0];

  // Search parameters state
  const [searchParams, setSearchParams] = useState({
    from: fromQuery,
    to: toQuery,
    date: dateQuery
  });

  const [hasSearched, setHasSearched] = useState(false);

  // Modal flow state: [DeckSeatPicker] ➔ [BookingCheckoutModal] ➔ [TicketReceiptModal]
  const [selectedBusForDeck, setSelectedBusForDeck] = useState(null);
  const [checkoutReservation, setCheckoutReservation] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Auto-search if explicit query parameters exist in URL on load
  useEffect(() => {
    document.title = 'BusMate — Pune Bus Booking & Timetables';
    if (urlParams.get('from') && urlParams.get('to')) {
      setSearchParams({
        from: urlParams.get('from'),
        to: urlParams.get('to'),
        date: urlParams.get('date') || dateQuery
      });
      setHasSearched(true);
    }
  }, [urlParams, dateQuery]);

  // Triggered when user submits the Search Ribbon or clicks a popular route pill
  const handleSearchSubmit = ({ from, to, date }) => {
    setSearchParams({ from, to, date });
    setHasSearched(true);

    // Synchronize router query params (?from=...&to=...&date=...)
    setUrlParams({ from, to, date });

    setTimeout(() => {
      document.getElementById('busResultsView')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const handleSelectPopularRoute = (from, to) => {
    const today = new Date().toISOString().split('T')[0];
    setSearchParams({ from, to, date: today });
    setHasSearched(true);
    setUrlParams({ from, to, date: today });

    setTimeout(() => {
      document.getElementById('busResultsView')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // Step 1: Open Deck Seat Picker
  const handleSelectBusForSeats = (bus) => {
    setSelectedBusForDeck(bus);
  };

  // Step 2: From Deck Seat Picker ➔ Navigate to /checkout Page
  const handleProceedToCheckout = (reservationData) => {
    setSelectedBusForDeck(null);
    navigate('/checkout');
  };

  // Step 3: From Checkout Sandbox ➔ Confirmed Ticket Receipt
  const handleBookingSuccess = (bookingRecord) => {
    setCheckoutReservation(null);
    setConfirmedBooking(bookingRecord);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-[#172033] space-y-10 sm:space-y-12 pb-20">
      
      {/* 1. Hero Section & Unified Search Ribbon with Ambient Mesh Aurora & Transit Grid */}
      <section 
        className="relative bg-mesh-aurora pt-8 sm:pt-12 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 overflow-visible"
        aria-label="Bus Search Hero"
      >
        {/* Subtle Transit Dot Matrix Overlay for Visual Depth */}
        <div 
          className="absolute inset-0 bg-transit-grid pointer-events-none opacity-50" 
          aria-hidden="true" 
        />

        <div className="relative z-10 max-w-6xl mx-auto space-y-4 text-center">
          
          <h1 className="sr-only">IIIT Pune Campus Shuttle</h1>

          {/* Unified Inline Search Ribbon with query sync & glassmorphism */}
          <BusSearchRibbon
            initialFrom={searchParams.from}
            initialTo={searchParams.to}
            onSearch={handleSearchSubmit}
          />

        </div>
      </section>

      {/* 2. Search Results Section with Dynamic Facets (Appears after search or on route select) */}
      {hasSearched && (
        <div id="busResultsView" className="px-4 sm:px-6 lg:px-8">
          <BusSearchResults
            from={searchParams.from}
            to={searchParams.to}
            date={searchParams.date}
            buses={busesData}
            onSelectBus={handleSelectBusForSeats}
          />
        </div>
      )}

      {/* 3. Quick Utility & Value Banners */}
      <div className="px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Popular Commuter Routes Strip */}
        <PopularRoutesStrip onSelectRoute={handleSelectPopularRoute} />

        {/* Featured Daily Transit Fleet (Zero ML contamination, Pure passenger cards) */}
        {!hasSearched && (
          <section className="w-full max-w-6xl mx-auto space-y-4 pt-4" aria-label="Featured Bus Operators">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Featured Daily Transit Services
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  Direct low-floor city routes and dedicated student/staff university shuttles
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHasSearched(true)}
                className="text-xs font-black text-[#075985] hover:underline flex items-center gap-1"
              >
                <span>View All Timetables</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {busesData.slice(0, 3).map((bus) => (
                <div 
                  key={bus.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs bus-card-interactive flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <OperatorBadge operator={bus.operator || bus.routeNumber} className="w-8 h-8" />
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-[#075985] border border-sky-200">
                          {bus.routeKey || 'Transit'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{bus.departureTime}</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-base text-slate-900 tracking-tight">
                        {bus.routeNumber}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {bus.origin} ➔ {bus.destination}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{bus.status}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider" data-i18n="priceCol">
                        {t('priceCol')}
                      </span>
                      <span className="text-xl font-bold text-slate-900 tabular-nums">
                        {bus.fare.includes('Free') ? 'FREE' : '₹25'}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-a11y-engine="true"
                      data-i18n="selectSeats"
                      onClick={() => handleSelectBusForSeats(bus)}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#075985] to-[#0284c7] hover:from-[#0C4A6E] hover:to-[#0369a1] active:scale-95 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      {t('selectSeats')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* WORKFLOW STEP 1: Deck-Based Seat Picker Modal */}
      <DeckSeatPicker
        bus={selectedBusForDeck}
        isOpen={!!selectedBusForDeck}
        onClose={() => setSelectedBusForDeck(null)}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* WORKFLOW STEP 2: Checkout & Reservation Safeguards Modal */}
      <BookingCheckoutModal
        reservationData={checkoutReservation}
        isOpen={!!checkoutReservation}
        onClose={() => setCheckoutReservation(null)}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* WORKFLOW STEP 3: Confirmed Ticket Receipt Modal */}
      <TicketReceiptModal
        booking={confirmedBooking}
        isOpen={!!confirmedBooking}
        onClose={() => setConfirmedBooking(null)}
      />

    </div>
  );
};
