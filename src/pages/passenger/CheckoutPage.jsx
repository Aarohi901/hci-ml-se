import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Clock, 
  Tag, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Lock, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  User, 
  Mail, 
  Phone,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import { bookSeatsForBus } from '../../services/inventoryService';
import { PassengerDetailsForm } from '../../components/passenger/PassengerDetailsForm';
import { calculatePriorityScore, isReservedPrioritySeat, TRIP_PURPOSES } from '../../utils/priorityScoring';
import { evaluateScheduleAllocation } from '../../utils/allocationEngine';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { announce } = useAccessibility();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { t } = useTranslation();

  // Load reservation data from sessionStorage or localStorage with reliable fallback
  const [reservationData, setReservationData] = useState(() => {
    try {
      const stored = sessionStorage.getItem('smartbus_current_reservation') || localStorage.getItem('smartbus_current_reservation');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading reservation:', e);
    }
    // Default safe fallback so the page never crashes if accessed directly
    return {
      bus: {
        id: 'SB-01',
        routeNumber: '101 BRTS Direct (Swargate - Station)',
        origin: 'Swargate Bus Stand',
        destination: 'Pune Central Railway Station',
        departureTime: '17:30',
        busPlate: 'MH 14 BT 3312',
        operator: 'SmartBus City Electric AC'
      },
      seats: [
        { id: 'L1', type: 'seater', deck: 'lower', fare: 25 },
        { id: 'L2', type: 'seater', deck: 'lower', fare: 25 }
      ],
      boarding: { name: 'Swargate - Main Terminal Bay 3', time: '17:30', landmark: 'Platform 3' },
      dropping: { name: 'Pune Station - Central Gate 1', time: '18:15', landmark: 'Main Gate' },
      totalBaseFare: 50
    };
  });

  // 10-minute server inventory hold countdown
  const [secondsRemaining, setSecondsRemaining] = useState(600);
  const [timerExpired, setTimerExpired] = useState(false);

  // Passenger details for each seat
  const [passengers, setPassengers] = useState([]);
  const [contactEmail, setContactEmail] = useState('alex.commuter@gmail.com');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');

  // Payment mode state
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('commuter@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [isProcessing, setIsProcessing] = useState(false);

  // Idempotency token per checkout session
  const [idempotencyToken] = useState(() => 
    `idemp_sb_live_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`
  );

  // Error message for backend 422 rejections
  const [errorMsg, setErrorMsg] = useState('');

  // Initialize passenger list based on reserved seats
  useEffect(() => {
    if (reservationData?.seats) {
      setPassengers(
        reservationData.seats.map((seat, index) => ({
          seatId: seat.id,
          deck: seat.deck || 'lower',
          name: index === 0 ? (user?.name || 'Alex Rivera') : `Passenger ${index + 1}`,
          age: index === 0 ? (reservationData?.passengerAge || 24) : 26,
          gender: index === 0 ? 'Female' : 'Male',
          tripPurpose: index === 0 ? (reservationData?.tripPurpose || 'GENERAL_LEISURE') : 'GENERAL_LEISURE',
          isDivyang: index === 0 ? Boolean(reservationData?.isDivyang) : false
        }))
      );
    }
  }, [reservationData, user]);

  // Contextual Trigger: Prompt authentication if user reaches checkout unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal({
        mode: 'login',
        prompt: 'Please log in or sign up to complete your ticket booking'
      });
    }
  }, [isAuthenticated, openAuthModal]);

  // Autofill contact email, phone, and primary passenger name from authenticated user profile
  useEffect(() => {
    if (user) {
      if (user.email) setContactEmail(user.email);
      if (user.phone) setContactPhone(user.phone);
      if (user.name) {
        setPassengers(prev => {
          if (!prev || prev.length === 0) return prev;
          const updated = [...prev];
          updated[0] = { ...updated[0], name: user.name };
          return updated;
        });
      }
    }
  }, [user]);

  // Run countdown timer for seat locking
  useEffect(() => {
    if (timerExpired) return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerExpired(true);
          announce('Your 10-minute seat inventory lock has expired.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerExpired, announce]);

  const { bus, seats, boarding, dropping, totalBaseFare } = reservationData;

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const updatePassenger = (index, field, value) => {
    setPassengers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleApplyPromo = (e) => {
    e.preventDefault();
    setPromoError('');
    const code = promoCode.trim().toUpperCase();

    if (code === 'FIRST') {
      setAppliedPromo({ code: 'FIRST', discount: Math.min(150, totalBaseFare) });
      announce('Promo code FIRST applied: 150 rupees discount');
    } else if (code === 'CAMPUS20') {
      const disc = Math.round(totalBaseFare * 0.20);
      setAppliedPromo({ code: 'CAMPUS20', discount: disc });
      announce('Promo code CAMPUS20 applied: 20 percent discount');
    } else {
      setPromoError('Invalid coupon code. Try FIRST or CAMPUS20.');
      announce('Invalid coupon code.');
    }
  };

  const discountAmount = appliedPromo ? appliedPromo.discount : 0;
  const taxableSubtotal = Math.max(0, totalBaseFare - discountAmount);
  const gstTax = Math.round(taxableSubtotal * 0.05); // 5% Transit GST
  const finalTotal = taxableSubtotal + gstTax;

  const handlePayment = async (e) => {
    e.preventDefault();
    if (timerExpired) return;

    if (!isAuthenticated) {
      openAuthModal({
        mode: 'login',
        prompt: 'Please log in or sign up to complete your ticket booking',
        onAuthenticated: () => {
          announce('Authentication verified. Please confirm your booking.');
        }
      });
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);
    announce('Processing simulated payment transaction...');

    const primaryPassenger = passengers[0] || {};
    const primaryAge = Number(primaryPassenger.age) || reservationData?.passengerAge || 24;
    const primaryPurpose = primaryPassenger.tripPurpose || reservationData?.tripPurpose || 'GENERAL_LEISURE';
    const primaryDivyang = Boolean(primaryPassenger.isDivyang ?? reservationData?.isDivyang);

    const priorityResult = calculatePriorityScore({
      age: primaryAge,
      tripPurpose: primaryPurpose,
      isDivyang: primaryDivyang
    });

    const hasPrioritySeat = seats.some(s => isReservedPrioritySeat(typeof s === 'string' ? s : s.id));

    const isFlexibleOptIn = Boolean(primaryPassenger.isFlexible);
    const flexibleWindow = Number(primaryPassenger.flexibleWindowMinutes) || (isFlexibleOptIn ? 30 : 0);
    const flexDirection = primaryPassenger.flexibilityDirection || 'ANY';

    const flexibilityResult = evaluateScheduleAllocation({
      requestedTime: boarding?.time || bus.departureTime || '17:30',
      requestedSeat: typeof seats[0] === 'string' ? seats[0] : seats[0]?.id || '1C',
      isFullCapacity: Boolean(reservationData?.isFullCapacity || bus.availableSeats === 0),
      priorityScore: priorityResult.score,
      isHighPriority: priorityResult.isHighPriority,
      isFlexible: isFlexibleOptIn,
      flexibleWindowMinutes: flexibleWindow,
      flexibilityDirection: flexDirection
    });

    const pnrNumber = `SB-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const bookingRecord = {
      pnr: pnrNumber,
      userId: user?.id || 'usr_guest',
      userName: user?.name || passengers[0]?.name || 'Commuter',
      busId: bus.id,
      routeNumber: flexibilityResult.wasReallocated ? (flexibilityResult.assignedBusName || bus.routeNumber) : (bus?.tripId || bus.routeNumber || 'T7'),
      operator: 'IIIT Pune Campus Shuttle Service',
      origin: bus.origin,
      destination: bus.destination,
      boardingPoint: boarding?.name,
      boardingPointLandmark: boarding?.landmark || 'Platform 3',
      boardingTime: flexibilityResult.assignedBusTime || boarding?.time,
      droppingPoint: dropping?.name,
      droppingPointLandmark: dropping?.landmark || 'Central Station Gate',
      droppingTime: dropping?.time,
      seats: flexibilityResult.wasReallocated ? [flexibilityResult.assignedSeat || '2A'] : seats.map(s => (typeof s === 'string' ? s : s.id)),
      passengers,
      // Student MIS & Operational Profile fields
      misNumber: user?.misNumber || '112603001',
      hostel: user?.hostel || 'GODAVARI',
      roomNumber: user?.roomNumber || 'G-214',
      course: user?.course || 'B.Tech',
      batch: user?.batch || '2026-2030',
      branch: user?.branch || 'AIDS',
      canTravelStanding: passengers[0]?.canTravelStanding ?? (user?.canTravelStanding !== false),
      declaredAccessibilityNeed: Boolean(passengers[0]?.declaredAccessibilityNeed || passengers[0]?.isDivyang || user?.declaredAccessibilityNeed),
      tripId: bus?.tripId || bus?.id || 'T7',
      tripReason: primaryPurpose,
      tripPurpose: primaryPurpose,
      priorityScore: priorityResult.score,
      isPrioritySeat: hasPrioritySeat,
      isHighPriority: priorityResult.isHighPriority,
      priorityTier: priorityResult.tier,
      allocatedSpot: reservationData?.allocatedSpot || (seats[0] ? (typeof seats[0] === 'string' ? `Seat ${seats[0]}` : `Seat ${seats[0].id}`) : 'Seat 4D'),
      busPlate: bus?.plateNumber || bus?.busPlate || 'MH 14 BT 1001',
      busModel: bus?.model || bus?.busModel || 'Tata Starbus EV-52 (52-Seater)',
      fareDisplay: 'Free (Campus Pass Included)',
      category: 'UPCOMING',
      canCancel: true,
      departureTime: bus?.departureTime || boarding?.time || '08:00',
      arrivalTime: bus?.arrivalTime || dropping?.time || '08:50',
      journeyDate: bus?.journeyDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      route: `${boarding?.name || bus?.origin || 'IIIT Pune Campus'} ➔ ${dropping?.name || bus?.destination || 'Godavari Boys Hostel'}`,
      // Schedule Flexibility fields
      isFlexible: isFlexibleOptIn,
      flexibleWindowMinutes: flexibleWindow,
      acceptableWindowMinutes: flexibleWindow,
      flexibilityDirection: flexDirection,
      wasReallocated: flexibilityResult.wasReallocated,
      reallocationReason: flexibilityResult.reallocationReason,
      originalBusTime: flexibilityResult.originalBusTime,
      assignedBusTime: flexibilityResult.assignedBusTime,
      assignedBusName: flexibilityResult.assignedBusName,
      contactEmail,
      contactPhone,
      fareBreakdown: {
        baseFare: 0,
        discount: 0,
        gst: 0,
        total: 0
      },
      paymentMethod: 'Institute Student ID Card (Free Transport)',
      idempotencyToken,
      bookingDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'CONFIRMED',
      statusPillText: 'Confirmed',
      statusPillColor: 'EMERALD',
      evaluation: reservationData?.evaluationResult || reservationData?.evaluation || {
        isFeasible: true,
        status: 'ALLOCATED',
        allocationType: 'SEAT',
        allocatedSpot: reservationData?.allocatedSpot || (seats[0] ? (typeof seats[0] === 'string' ? `Seat ${seats[0]}` : `Seat ${seats[0].id}`) : 'Seat 4D'),
        explanation: {
          level1Headline: `Seat Confirmed (${reservationData?.allocatedSpot || 'Seat 4D'})`,
          level2Reason: `Your seat is confirmed on the ${bus?.departureTime || '08:00'} IIIT Pune Campus Shuttle. Transport is free under student services with your MIS ID.`,
          level3Audit: {
            exactCounterfactual: 'Your reservation is confirmed. Releasing your seat will allow waiting students to be promoted.',
            policyDecisionTrace: {
              rule1: 'Student ID: Verified (MIS ID)',
              rule2: `Travel Purpose: ${primaryPurpose || 'Campus Commute'}`,
              rule3: `Allocated Place: ${reservationData?.allocatedSpot || 'Seat 4D'}`,
              rule4: 'Fare: ₹0 (Free Campus Student Pass)',
              rule5: `Reporting: Please be at the shuttle stop 5 minutes prior to departure`
            }
          }
        }
      }
    };

    try {
      // Backend confirmation attempt
      await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingRecord)
      });
    } catch (err) {
      console.warn('[SmartBus] Confirmation error caught:', err);
    }

    // Mutate dynamic seat inventory and persist to localStorage
    const bookedSeatIds = seats.map(s => (typeof s === 'string' ? s : s.id));
    bookSeatsForBus(bus.id, bookedSeatIds);

    // Persist to localStorage for My Trips (strictly clean campus history)
    const existing = JSON.parse(localStorage.getItem('smartbus_my_trips') || '[]');
    const cleanedExisting = existing.filter(t => !t.pnr?.startsWith('PMPML') && !(t.totalPrice > 0));
    localStorage.setItem('smartbus_my_trips', JSON.stringify([bookingRecord, ...cleanedExisting]));
    localStorage.setItem('iiit_campus_trip_history', JSON.stringify([bookingRecord, ...cleanedExisting]));
    sessionStorage.setItem('smartbus_last_booking', JSON.stringify(bookingRecord));

    setTimeout(() => {
      setIsProcessing(false);
      navigate('/booking-confirmation');
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Back button and navigation breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075985] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('Back to Seat Map') || 'Back to Seat Map'}</span>
        </button>

        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {t('checkout.step')}
        </span>
      </div>

      <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#075985] bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
              SECURE CHECKOUT & RESERVATION
            </span>
            <h1 className="text-xl sm:text-2xl font-semibold font-heading text-slate-900 tracking-[-0.015em] mt-1">
              {t('checkout.title')}
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {bus.routeNumber} • Seats: <span className="tabular-nums font-semibold">{seats.map(s => s.id).join(', ')}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>{t('checkout.locked_badge')}</span>
          </div>
        </div>

        {/* 10-Minute Hold Safeguard Banner */}
        <div className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
          timerExpired 
            ? 'bg-red-50 border-red-300 text-red-900' 
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <span className="font-semibold text-xs block">
                {timerExpired ? t('checkout.timer_expired') : t('checkout.timer_msg')}
              </span>
              <span className="text-[11px] font-medium text-slate-600">
                {timerExpired 
                  ? 'Your seat reservation hold has timed out. Please go back to re-select seats.' 
                  : 'Seats are locked exclusively for you to prevent concurrent double bookings.'}
              </span>
            </div>
          </div>
          <span className="font-bold text-lg tabular-nums text-amber-900 bg-white px-3 py-1 rounded-xl border border-amber-300">
            {formattedTimer}
          </span>
        </div>

        {errorMsg && (
          <div 
            id="checkout-error-banner"
            className="p-4 bg-red-50 border-2 border-red-400 text-red-900 rounded-2xl flex items-center gap-3 animate-in fade-in"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="font-bold text-xs block">Priority Seating Allocation Rejection (HTTP 422)</span>
              <span className="text-xs font-medium">{errorMsg}</span>
            </div>
          </div>
        )}

        {timerExpired ? (
          <div className="text-center py-8 space-y-3">
            <button
              type="button"
              onClick={() => navigate('/find-bus')}
              className="px-6 py-3 bg-[#075985] text-white font-semibold text-xs uppercase tracking-wider rounded-xl shadow-sm"
            >
              Return to Bus Schedules
            </button>
          </div>
        ) : (
          <form onSubmit={handlePayment} className="space-y-6">
            
            {/* 1. Passenger Details Capture */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-[#075985]" />
                <span data-i18n="passengerDetails">{t('passengerDetails')}</span>
              </h2>

              {/* Authentication Status & Autofill Strip */}
              {isAuthenticated ? (
                <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('checkout.autofilled_from')} <strong>{user?.name}</strong></span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                    {t('checkout.profile_linked')}
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between text-xs text-slate-700">
                  <div className="flex items-center gap-2 text-[#075985]">
                    <User className="w-4 h-4 shrink-0" />
                    <span>{t('checkout.have_account')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuthModal({ mode: 'login', prompt: 'Please log in or sign up to complete your ticket booking' })}
                    className="text-xs font-semibold text-[#075985] hover:underline cursor-pointer"
                  >
                    {t('loginSignup')}
                  </button>
                </div>
              )}

              {/* Passenger Multi-Factor Details & Purpose Forms */}
              <div className="space-y-4">
                {passengers.map((p, idx) => (
                  <PassengerDetailsForm
                    key={p.seatId || idx}
                    passengerIndex={idx}
                    passenger={p}
                    studentProfile={user}
                    selectedTrip={reservationData?.bus}
                    onChange={(updated) => {
                      setPassengers(prev => {
                        const copy = [...prev];
                        copy[idx] = updated;
                        return copy;
                      });
                    }}
                  />
                ))}
              </div>

              {/* Contact info row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 uppercase tracking-wide block mb-1" data-i18n="emailAddress">
                    {t('emailAddress')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-normal text-slate-900 focus:outline-none focus:border-[#075985]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 uppercase tracking-wide block mb-1" data-i18n="mobileNumber">
                    {t('mobileNumber')}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-normal tabular-nums text-slate-900 focus:outline-none focus:border-[#075985]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Promo Code & Dynamic Fare Breakdown */}
            <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#075985]" />
                  <span>2. {t('checkout.apply_promo')}</span>
                </span>
                
                {/* Promo input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="FIRST / CAMPUS20"
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium uppercase text-slate-900 focus:outline-none focus:border-[#075985]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-1.5 bg-[#075985] text-white text-xs font-semibold rounded-xl hover:bg-[#0C4A6E]"
                  >
                    {t('checkout.apply_btn')}
                  </button>
                </div>
              </div>

              {promoError && (
                <p className="text-xs text-red-600 font-medium">{promoError}</p>
              )}

              {appliedPromo && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-800 tabular-nums">
                  <span>Coupon {appliedPromo.code} Applied</span>
                  <span>-₹{appliedPromo.discount}</span>
                </div>
              )}

              {/* Dynamic Fare Calculation Table */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{t('checkout.base_fare')} ({seats.length} seats)</span>
                  <span className="tabular-nums font-semibold text-slate-900">₹{totalBaseFare}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>{t('checkout.promo_discount')}</span>
                    <span className="tabular-nums">-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{t('checkout.transit_gst')}</span>
                  <span className="tabular-nums font-semibold text-slate-900">₹{gstTax}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-slate-900 pt-2 border-t border-slate-200">
                  <span>{t('checkout.total_payable')}</span>
                  <span className="text-xl font-bold text-[#075985] tabular-nums tracking-[-0.01em]">₹{finalTotal}</span>
                </div>
              </div>
            </div>

            {/* 3. Payment Sandbox with Idempotency Token */}
            <div className="p-5 bg-sky-50/70 rounded-2xl border-2 border-sky-300 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#075985]" />
                  <span className="text-xs font-semibold text-[#075985] uppercase tracking-wider">
                    {t('checkout.payment_method')}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-white border border-sky-300 rounded text-slate-600 tabular-nums">
                  IDEMP: {idempotencyToken.substring(0, 18)}...
                </span>
              </div>

              {/* Payment Methods Tabs */}
              <div className="flex bg-white p-1 rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'upi' ? 'bg-[#075985] text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'card' ? 'bg-[#075985] text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('netbanking')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'netbanking' ? 'bg-[#075985] text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Net Banking</span>
                </button>
              </div>

              {/* Payment input display */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-medium">
                {paymentMethod === 'upi' ? (
                  <div className="flex items-center justify-between">
                    <span>Virtual UPI Address:</span>
                    <span className="font-mono font-semibold text-[#075985]">{upiId}</span>
                  </div>
                ) : paymentMethod === 'card' ? (
                  <div className="flex items-center justify-between">
                    <span>Test Card Sandbox:</span>
                    <span className="font-mono font-semibold text-[#075985]">{cardNumber}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>Preferred Bank:</span>
                    <span className="font-semibold text-[#075985]">HDFC NetBanking Sandbox</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pay Button */}
            <button
              type="submit"
              id="checkout-pay-btn"
              disabled={isProcessing}
              className="w-full py-4 bg-[#075985] hover:bg-[#0C4A6E] active:scale-[0.99] text-white font-semibold text-sm uppercase tracking-wide rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('checkout.processing')}</span>
                </>
              ) : (
                <>
                  <span data-i18n="payAndConfirm">{t('payAndConfirm')} <span className="tabular-nums font-bold">₹{finalTotal}</span></span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
  );
};
