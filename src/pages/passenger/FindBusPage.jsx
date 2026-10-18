import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import busesData from '../../data/buses.json';
import { BusSearchRibbon } from '../../components/passenger/BusSearchRibbon';
import { BusSearchResults } from '../../components/passenger/BusSearchResults';
import { DeckSeatPicker } from '../../components/passenger/DeckSeatPicker';
import { BookingCheckoutModal } from '../../components/passenger/BookingCheckoutModal';
import { TicketReceiptModal } from '../../components/passenger/TicketReceiptModal';

export const FindBusPage = () => {
  const navigate = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();

  const fromQuery = urlParams.get('from') || 'IIIT Pune Campus (Main Gate)';
  const toQuery = urlParams.get('to') || 'Talegaon Station';
  const dateQuery = urlParams.get('date') || new Date().toISOString().split('T')[0];

  const [searchParams, setSearchParams] = useState({
    from: fromQuery,
    to: toQuery,
    date: dateQuery
  });

  // Modal flow state: [DeckSeatPicker] ➔ [BookingCheckoutModal] ➔ [TicketReceiptModal]
  const [selectedBusForDeck, setSelectedBusForDeck] = useState(null);
  const [checkoutReservation, setCheckoutReservation] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    if (urlParams.get('from') && urlParams.get('to')) {
      setSearchParams({
        from: urlParams.get('from'),
        to: urlParams.get('to'),
        date: urlParams.get('date') || dateQuery
      });
    }
  }, [urlParams, dateQuery]);

  const handleSearchSubmit = ({ from, to, date }) => {
    setSearchParams({ from, to, date });
    setUrlParams({ from, to, date });
  };

  const handleSelectBusForSeats = (bus) => {
    setSelectedBusForDeck(bus);
  };

  const handleProceedToCheckout = (reservationData) => {
    setSelectedBusForDeck(null);
    navigate('/checkout');
  };

  const handleBookingSuccess = (bookingRecord) => {
    setCheckoutReservation(null);
    setConfirmedBooking(bookingRecord);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Unified Search Ribbon */}
      <div className="bg-slate-50 p-4 sm:p-6 rounded-3xl border-2 border-slate-200 overflow-visible relative">
        <BusSearchRibbon
          initialFrom={searchParams.from}
          initialTo={searchParams.to}
          onSearch={handleSearchSubmit}
        />
      </div>

      {/* Search Results with Full Dynamic Facets & Sorting */}
      <BusSearchResults
        from={searchParams.from}
        to={searchParams.to}
        date={searchParams.date}
        buses={busesData}
        onSelectBus={handleSelectBusForSeats}
      />

      {/* WORKFLOW STEP 1: Deck Seat Picker Modal */}
      <DeckSeatPicker
        bus={selectedBusForDeck}
        isOpen={!!selectedBusForDeck}
        onClose={() => setSelectedBusForDeck(null)}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* WORKFLOW STEP 2: Checkout & Reservation Modal */}
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
