import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Printer, 
  Download, 
  MapPin, 
  Bus, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  ArrowRight, 
  User, 
  Copy, 
  Check, 
  Navigation,
  Share2,
  PhoneCall,
  Mail,
  AlertTriangle,
  FileText,
  Award,
  HeartPulse,
  Accessibility
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTranslation } from '../../context/TranslationContext';
import { OperatorBadge } from '../../components/passenger/OperatorBadge';
import { TRIP_PURPOSES, isReservedPrioritySeat } from '../../utils/priorityScoring';
import { BookingStatusExplanation } from '../../components/passenger/BookingStatusExplanation';

/**
 * 2. Dedicated Confirmation View & Printable PDF / E-Ticket View
 * Routes: /booking-confirmation and /ticket/:pnr
 * Fully optimized for both screen viewing and A4 browser printing (@media print).
 */
export const BookingConfirmationPage = () => {
  const navigate = useNavigate();
  const { pnr: paramPnr } = useParams();
  const [searchParams] = useSearchParams();
  const queryPnr = searchParams.get('pnr');
  const targetPnr = paramPnr || queryPnr;

  const { announce } = useAccessibility();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Load target booking from sessionStorage or localStorage
  const [booking, setBooking] = useState(() => {
    try {
      const trips = JSON.parse(localStorage.getItem('smartbus_my_trips') || '[]');
      
      if (targetPnr && trips && trips.length > 0) {
        const found = trips.find(t => (t.pnr || t.id) === targetPnr);
        if (found) return found;
      }

      const stored = sessionStorage.getItem('smartbus_last_booking');
      if (stored) return JSON.parse(stored);

      if (trips && trips.length > 0) return trips[0];
    } catch (e) {
      console.error('Error loading booking for confirmation:', e);
    }

    // Default sample confirmed e-ticket
    return {
      pnr: 'SB-8492041',
      bookingId: 'BK-2026-9921',
      busId: 'SB-01',
      routeNumber: '101 BRTS Direct (Swargate - Station)',
      busPlate: 'MH 14 BT 3312',
      operator: 'IntrCity SmartBus',
      busClass: 'Electric AC Low-Floor (2+2)',
      origin: 'Swargate Bus Stand',
      destination: 'Pune Central Railway Station',
      boardingPoint: 'Swargate - Main Terminal Bay 3',
      boardingPointLandmark: 'Platform 3, Opposite Metro Concourse',
      boardingTime: '17:30',
      droppingPoint: 'Pune Station - Central Gate 1',
      droppingPointLandmark: 'Central Station Main Interchange Gate',
      droppingTime: '18:15',
      duration: '45 mins',
      seats: ['L1', 'L2'],
      passengers: [
        { seatId: 'L1', deck: 'lower', name: 'Diwansh Sharma', age: 24, gender: 'Male' },
        { seatId: 'L2', deck: 'lower', name: 'Pooja Verma', age: 26, gender: 'Female' }
      ],
      contactEmail: 'diwansh.sharma@example.com',
      contactPhone: '+91 98765 43210',
      fareBreakdown: {
        baseFare: 50,
        discount: 0,
        gst: 3,
        total: 53
      },
      paymentMethod: 'Paid via UPI (Instant Sandbox)',
      idempotencyToken: 'idemp_sb_live_8492041',
      bookingDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      bookingTime: '14:25 IST',
      status: 'Confirmed'
    };
  });

  useEffect(() => {
    document.title = `BusMate E-Ticket — ${booking.pnr || 'Confirmation'}`;
    if (booking?.pnr) {
      announce(`Booking confirmed. Your PNR is ${booking.pnr}.`);
    }
  }, [booking, announce]);

  const handleCopyPnr = () => {
    if (booking?.pnr) {
      navigator.clipboard.writeText(booking.pnr);
      setCopied(true);
      announce(`Copied PNR ${booking.pnr} to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    announce('Opening browser print dialogue');
    window.print();
  };

  const tripPurposeKey = booking.tripPurpose || booking.passengers?.[0]?.tripPurpose || 'GENERAL_LEISURE';
  const purposeObj = TRIP_PURPOSES[tripPurposeKey] || {
    label: tripPurposeKey === 'MEDICAL' ? 'Medical / Doctor Visit' :
           tripPurposeKey === 'WORK_COMMUTE' ? 'Work / Office Commute' :
           tripPurposeKey === 'EDUCATION_EXAM' ? 'Student / College / Exam Travel' : 'General / Personal Trip',
    icon: tripPurposeKey === 'MEDICAL' ? '🏥' : (tripPurposeKey === 'EDUCATION_EXAM' ? '🎓' : (tripPurposeKey === 'WORK_COMMUTE' ? '💼' : '🚶'))
  };
  const isHighPriority = Boolean(booking.priorityScore >= 70 || booking.isHighPriority);
  const priorityScore = booking.priorityScore ?? (isHighPriority ? 75 : 15);

  const handleDownload = () => {
    announce('Downloading E-Ticket receipt file');
    const ticketText = `
=================================================================
                 BUSMATE TRANSIT OFFICIAL E-TICKET
=================================================================
PNR Reference     : ${booking.pnr}
Booking ID        : ${booking.bookingId || 'BK-2026-9921'}
Booking Date & Time: ${booking.bookingDate || new Date().toLocaleDateString()} at ${booking.bookingTime || '14:25 IST'}
Status            : ${booking.status || 'CONFIRMED'} (Paid)

PRIORITY ALLOCATION & PURPOSE:
Travel Purpose    : ${purposeObj.label}
Priority Status   : ${isHighPriority ? 'High Priority Passenger' : 'Standard Commuter'} (Score: ${priorityScore} pts)

TRANSIT JOURNEY DETAILS:
Route             : ${booking.routeNumber}
Operator          : ${booking.operator || 'SmartBus City Transit'}
Bus Vehicle Reg.  : ${booking.busPlate || 'MH 14 BT 3312'}
Bus Class         : ${booking.busClass || 'AC Express Standard'}
Departure Stop    : ${booking.origin} (${booking.boardingTime || '17:30'})
Boarding Bay      : ${booking.boardingPoint || 'Main Terminal'} (${booking.boardingPointLandmark || 'Main Platform'})
Arrival Stop      : ${booking.destination} (${booking.droppingTime || '18:15'})
Dropping Point    : ${booking.droppingPoint || 'Central Terminal'}

PASSENGER & SEAT MANIFEST:
${(booking.passengers || []).map((p, i) => `[Seat ${p.seatId} - ${p.deck || 'Lower'} Deck] ${p.name} | Age: ${p.age} yrs | Gender: ${p.gender}`).join('\n')}

FARE & PAYMENT SUMMARY:
Base Fare         : ₹${booking.fareBreakdown?.baseFare || 50}
Discounts Applied : ₹${booking.fareBreakdown?.discount || 0}
Transit GST (5%)  : ₹${booking.fareBreakdown?.gst || 3}
Total Paid Amount : ₹${booking.fareBreakdown?.total || 53}
Payment Mode      : ${booking.paymentMethod || 'Paid via UPI / Card Sandbox'}
Transaction Token : ${booking.idempotencyToken || 'N/A'}

COMMUTER SUPPORT:
Helpline Number   : 1800-200-BUSES (Toll Free, 24/7)
Support Email     : support@busmate.in
=================================================================
Thank you for commuting with BusMate! Have a safe and timely trip!
=================================================================
`;
    const element = document.createElement('a');
    const file = new Blob([ticketText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `BusMate_ETicket_${booking.pnr}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      
      {/* 1. On-Screen Success Notification Banner (Hidden in Print) */}
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs print:hidden no-print">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
            <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300" data-i18n="ticket.confirmed_badge">
                {t('ticket.confirmed_badge')}
              </span>
              <span className="text-xs text-emerald-700 font-semibold tabular-nums">
                {booking.bookingTime || 'Today'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-emerald-950 tracking-[-0.015em]" data-i18n="ticketConfirmed">
              {t('ticketConfirmed')}
            </h1>
            <p className="text-xs sm:text-sm font-normal text-emerald-800" data-i18n="ticket.confirmed_sub">
              {t('ticket.confirmed_sub')}
            </p>
          </div>
        </div>

        {/* Quick Top Print Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-semibold text-xs tracking-wider uppercase rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span data-i18n="printTicket">{t('printTicket')}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Action Bar (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 print:hidden no-print">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 font-semibold text-xs uppercase tracking-wider rounded-xl border border-slate-300 transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#075985]" />
            <span data-i18n="printTicket">{t('printTicket')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 font-semibold text-xs uppercase tracking-wider rounded-xl border border-slate-300 transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span data-i18n="ticket.download_receipt">{t('ticket.download_receipt')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/my-trips"
            className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-[#075985] font-semibold text-xs uppercase tracking-wider rounded-xl border border-sky-200 transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span data-i18n="myBookings">{t('myBookings')}</span>
          </Link>

          <Link
            to="/"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span data-i18n="bookAnother">{t('bookAnother')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ========================================================
          HCI ALLOCATION EXPLANATION & A/B TRANSPARENCY CARD
          Answers: Was I allocated a seat? Why? & Evaluates trust
          ======================================================== */}
      <div className="print:hidden no-print">
        <BookingStatusExplanation 
          booking={booking} 
          onAcceptReallocation={(details) => {
            setBooking(prev => ({
              ...prev,
              status: 'Confirmed',
              seats: [details?.assignedSeat || '2A'],
              passengers: (prev.passengers || []).map(p => ({ ...p, seatId: details?.assignedSeat || '2A' })),
              routeNumber: details?.assignedBusName || 'Route 5 at 17:40 (Adjacent Bus)',
              boardingTime: details?.assignedBusTime || '17:40'
            }));
          }}
          onRevertToWaitlist={(details) => {
            setBooking(prev => ({
              ...prev,
              status: 'Waitlisted',
              boardingTime: details?.originalBusTime || '17:30',
              routeNumber: `Route 5 (${details?.originalBusTime || '17:30'} Departure - Standby Waitlist #2)`
            }));
          }}
        />
      </div>

      {/* ========================================================
          3. OFFICIAL DIGITAL E-TICKET (FRAMED FOR PRINT & SCREEN)
          Class: .ticket-container handles clean A4 page framing
          ======================================================== */}
      <article 
        className="ticket-container bg-white rounded-3xl border-2 border-slate-300/90 shadow-xl overflow-hidden transition-all"
        aria-label="Official BusMate Digital E-Ticket"
      >
        
        {/* TICKET HEADER: Brand Mark, Status Badge, PNR & Helpline */}
        <div className="bg-[#075985] text-white p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 border-b border-sky-900/50">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Bus className="w-5 h-5 text-sky-200" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold font-heading tracking-tight text-white">
                Bus<span className="text-sky-300">Mate</span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-200/90 px-2 py-0.5 rounded bg-white/10" data-i18n="ticket.official_pass">
                {t('ticket.official_pass')}
              </span>
              
              {/* Confirmed Live Badge with Pulsing Green Dot */}
              <span className="bg-emerald-500/20 text-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span data-i18n="ticket.confirmed_badge">{t('ticket.confirmed_badge')}</span>
              </span>
            </div>

            <p className="text-xs text-sky-100 font-medium pt-0.5">
              Issued on: <span className="text-white font-semibold">{booking.bookingDate}</span> • 24/7 Commuter Helpline: <span className="text-white font-semibold font-mono">1800-200-BUSES</span>
            </p>
          </div>

          {/* Prominent PNR Badge with Copy Action */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 sm:text-right min-w-[210px] w-full md:w-auto">
            <div className="flex md:justify-end items-center justify-between text-sky-200 text-[10px] font-bold uppercase tracking-wider">
              <span data-i18n="pnr">{t('pnr')}</span>
              <span className="font-mono text-white/80 font-normal">ID: {booking.bookingId || 'BK-84920'}</span>
            </div>
            
            <div className="flex md:justify-end items-center gap-2 mt-1">
              <span className="text-2xl font-mono font-bold text-white tracking-wider tabular-nums">
                {booking.pnr}
              </span>
              <button
                type="button"
                onClick={handleCopyPnr}
                className="p-1.5 text-sky-200 hover:text-white hover:bg-white/20 rounded-lg transition-colors print:hidden no-print"
                title="Copy PNR string to clipboard"
                aria-label="Copy PNR to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* JOURNEY OVERVIEW CARD (VISUAL TRANSIT ROUTE) */}
        <div className="p-6 sm:p-8 border-b border-slate-200 bg-slate-50/70">
          
          {/* Bus Service & Operator Details Strip */}
          <div className="pb-5 mb-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <OperatorBadge operator={booking.operator} className="w-9 h-9" />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {booking.routeNumber}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                  <span className="font-semibold text-slate-700">{booking.operator}</span>
                  <span>•</span>
                  <span>{booking.busClass || 'A/C Sleeper (2+1)'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle Reg:</span>
              <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                {booking.busPlate || 'MH 14 BT 3312'}
              </span>
            </div>
          </div>

          {/* Departure ➔ Trajectory ➔ Arrival Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Origin Stop Details */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                ORIGIN & BOARDING STOP
              </span>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {booking.boardingTime || '17:30'}
              </div>
              <div className="text-sm font-bold text-slate-800">
                {booking.origin}
              </div>
              <p className="text-xs font-medium text-[#075985]">
                {booking.boardingPoint}
              </p>
              {booking.boardingPointLandmark && (
                <p className="text-[11px] text-slate-400 font-normal">
                  Landmark: {booking.boardingPointLandmark}
                </p>
              )}
              <span className="text-xs text-slate-500 block pt-0.5">
                Date: <strong>{booking.bookingDate}</strong>
              </span>
            </div>

            {/* Travel Path & Duration Indicator */}
            <div className="flex flex-col items-center justify-center text-center space-y-1.5 px-2">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-600 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{booking.duration || '45 mins'} travel duration</span>
              </div>

              <div className="w-full max-w-[200px] flex items-center gap-1.5 my-1">
                <div className="w-3 h-3 rounded-full bg-[#075985] shrink-0 border-2 border-white shadow-xs"></div>
                <div className="h-0.5 bg-slate-300 flex-1 border-t-2 border-dashed border-slate-400"></div>
                <ArrowRight className="w-4 h-4 text-[#075985] shrink-0" />
                <div className="h-0.5 bg-slate-300 flex-1 border-t-2 border-dashed border-slate-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-600 shrink-0 border-2 border-white shadow-xs"></div>
              </div>

              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                Direct Transit Express
              </span>
            </div>

            {/* Destination Stop Details */}
            <div className="space-y-1 md:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                DESTINATION & DROPPING STOP
              </span>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {booking.droppingTime || '18:15'}
              </div>
              <div className="text-sm font-bold text-slate-800">
                {booking.destination}
              </div>
              <p className="text-xs font-medium text-emerald-700">
                {booking.droppingPoint}
              </p>
              {booking.droppingPointLandmark && (
                <p className="text-[11px] text-slate-400 font-normal">
                  Landmark: {booking.droppingPointLandmark}
                </p>
              )}
              <span className="text-xs text-slate-500 block pt-0.5">
                Date: <strong>{booking.bookingDate}</strong>
              </span>
            </div>

          </div>
        </div>

        {/* DEDICATED PRIORITY ALLOCATION & TRAVEL PURPOSE FIELD */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-emerald-50/50 to-amber-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            
            {/* Dedicated Field: Travel Purpose */}
            <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-2xl shrink-0">
                {purposeObj.icon || '🚌'}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Travel Purpose
                </span>
                <span id="ticket-travel-purpose" className="text-base font-extrabold text-slate-900 block">
                  {purposeObj.label}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Verified Commuter Travel Reason
                </span>
              </div>
            </div>

            {/* Dedicated Field: Priority Status */}
            <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isHighPriority ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {isHighPriority ? <Award className="w-6 h-6 text-emerald-600" /> : <ShieldCheck className="w-6 h-6 text-slate-500" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Priority Status
                </span>
                <span id="ticket-priority-status" className={`text-base font-extrabold block ${
                  isHighPriority ? 'text-emerald-700' : 'text-slate-800'
                }`}>
                  {isHighPriority ? 'High Priority Passenger' : 'Standard Commuter'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Composite Score: {priorityScore} pts • {isHighPriority ? 'Front Reserved Seating Verified' : 'Standard Transit Access'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* PASSENGER & SEAT MANIFEST TABLE + SVG QR PASS */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 border-b border-slate-200">
          
          {/* Passenger Table (8 Cols) */}
          <div className="md:col-span-8 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-[#075985]" />
              <span>Passenger & Seat Manifest</span>
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Passenger Name</th>
                    <th className="py-2.5 px-4">Age / Gender</th>
                    <th className="py-2.5 px-4 text-center">Seat Number</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(booking.passengers || []).map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium tabular-nums">
                        {p.age} yrs • {p.gender}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-sky-50 text-[#075985] font-bold border border-sky-200 tabular-nums">
                          Seat {p.seatId}
                        </span>
                        {(isReservedPrioritySeat(p.seatId) || booking.isPrioritySeat) && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px]">
                            ★ Priority
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Confirmed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Commuter Contact Information */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email: <strong className="text-slate-800">{booking.contactEmail}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile: <strong className="text-slate-800 tabular-nums">{booking.contactPhone}</strong></span>
              </div>
            </div>
          </div>

          {/* SVG/CSS QR Code Validator Pass (4 Cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center bg-slate-50/90 rounded-2xl border border-slate-200 p-5 text-center space-y-3">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
              {/* Crisp Inline Vector QR Graphic */}
              <svg 
                viewBox="0 0 100 100" 
                className="w-28 h-28 text-slate-900" 
                fill="currentColor"
                aria-label={`QR Code Pass for PNR ${booking.pnr}`}
              >
                {/* 3 Standard Corner Position Blocks */}
                <rect x="5" y="5" width="26" height="26" rx="3" fill="#0f172a" />
                <rect x="9" y="9" width="18" height="18" rx="2" fill="#ffffff" />
                <rect x="13" y="13" width="10" height="10" fill="#075985" />

                <rect x="69" y="5" width="26" height="26" rx="3" fill="#0f172a" />
                <rect x="73" y="9" width="18" height="18" rx="2" fill="#ffffff" />
                <rect x="77" y="13" width="10" height="10" fill="#075985" />

                <rect x="5" y="69" width="26" height="26" rx="3" fill="#0f172a" />
                <rect x="9" y="73" width="18" height="18" rx="2" fill="#ffffff" />
                <rect x="13" y="77" width="10" height="10" fill="#075985" />

                {/* Data Matrix Elements */}
                <rect x="36" y="8" width="6" height="6" rx="1" />
                <rect x="48" y="14" width="6" height="6" rx="1" />
                <rect x="40" y="24" width="6" height="6" rx="1" />
                <rect x="56" y="24" width="6" height="6" rx="1" />
                
                <rect x="8" y="38" width="6" height="6" rx="1" />
                <rect x="20" y="44" width="6" height="6" rx="1" />
                <rect x="36" y="40" width="8" height="8" rx="1" fill="#075985" />
                <rect x="48" y="48" width="6" height="6" rx="1" />
                <rect x="62" y="40" width="6" height="6" rx="1" />
                <rect x="76" y="44" width="6" height="6" rx="1" />
                <rect x="86" y="38" width="6" height="6" rx="1" />

                <rect x="38" y="60" width="6" height="6" rx="1" />
                <rect x="52" y="64" width="6" height="6" rx="1" />
                <rect x="66" y="58" width="6" height="6" rx="1" />
                <rect x="80" y="68" width="6" height="6" rx="1" />

                <rect x="36" y="76" width="6" height="6" rx="1" />
                <rect x="48" y="82" width="6" height="6" rx="1" />
                <rect x="64" y="76" width="6" height="6" rx="1" />
                <rect x="76" y="84" width="6" height="6" rx="1" />
              </svg>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono font-bold text-slate-800 uppercase tracking-wider block">
                {booking.pnr}
              </span>
              <p className="text-[10px] text-slate-500 font-normal leading-tight">
                Scan via Onboard Conductor Terminal or Metro Interchange Validator
              </p>
            </div>
          </div>

        </div>

        {/* PAYMENT & FARE BREAKDOWN SUMMARY */}
        <div className="p-6 sm:p-8 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-200">
          
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Status:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                {booking.paymentMethod || 'Paid via UPI (Sandbox)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Transaction ID: <span className="font-semibold text-slate-700">{booking.idempotencyToken || 'TXN-99218204'}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-normal">
              Digital receipt generated automatically under Section 65B of Evidence Act.
            </div>
          </div>

          <div className="w-full sm:w-72 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
            <div className="text-xs text-slate-600 flex justify-between">
              <span>Base Fare:</span>
              <span className="font-semibold text-slate-800 tabular-nums">₹{booking.fareBreakdown?.baseFare || 50}</span>
            </div>
            {booking.fareBreakdown?.discount > 0 && (
              <div className="text-xs text-emerald-600 font-semibold flex justify-between">
                <span>Applied Discount:</span>
                <span className="tabular-nums">-₹{booking.fareBreakdown?.discount}</span>
              </div>
            )}
            <div className="text-xs text-slate-600 flex justify-between">
              <span>Transit GST (5%):</span>
              <span className="font-semibold text-slate-800 tabular-nums">₹{booking.fareBreakdown?.gst || 3}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-xs font-bold text-slate-900 uppercase">Total Paid:</span>
              <span className="text-2xl font-bold text-[#075985] tabular-nums tracking-tight">
                ₹{booking.fareBreakdown?.total || 53}
              </span>
            </div>
          </div>

        </div>

        {/* BOARDING INSTRUCTIONS & PASSENGER ADVISORY */}
        <div className="p-6 bg-amber-50/60 text-slate-700 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold uppercase tracking-wider text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Important Commuter Boarding Instructions</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] font-medium leading-relaxed">
            <li>Please arrive at the boarding terminal at least <strong>15 minutes prior to departure</strong>.</li>
            <li>Passengers must present this digital E-ticket (or printed copy) along with a valid government photo ID upon request.</li>
            <li>Wheelchair-accessible ramps and dedicated luggage bays are available at Bay 3 for this low-floor service.</li>
            <li>Cancellation and full refunds are permitted up to 2 hours before scheduled departure via <strong>My Bookings</strong>.</li>
          </ul>
        </div>

      </article>

      {/* 4. Bottom Action Bar (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-6 print:hidden no-print">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-3 bg-[#075985] hover:bg-[#0C4A6E] active:scale-95 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print E-Ticket / Save PDF</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2"
          >
            <span>Book Another Journey</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

    </div>
  );
};

export default BookingConfirmationPage;
