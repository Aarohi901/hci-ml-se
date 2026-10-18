import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Check, 
  ArrowRight, 
  Disc, 
  MapPin, 
  Clock, 
  AlertCircle, 
  Bus, 
  Award, 
  Accessibility, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  UserCheck, 
  Calendar, 
  Info, 
  CheckCircle2, 
  Users, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTranslation } from '../../context/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import { evaluateIIITCampusAllocation } from '../../utils/allocationEngine';
import { STOPS, FLEET, TIMETABLE, ROUTE_INFO, TRIP_REASONS } from '../../data/iiitBusData';
import { BookingStatusExplanation } from './BookingStatusExplanation';

/**
 * DeckSeatPicker - Part 1 IIIT Pune Request & Seat Allocation View
 * 
 * Clean, light-theme UI conforming to Part 1 of the IIIT Pune BusMate specification:
 * 1. Zero legacy city artifacts (No point scoring, no age input, no PMPML references)
 * 2. Authenticated Student Context Banner ([MIS: 112203045] Rahul Deshmukh • B.Tech (CSE) • Krishna Hostel)
 * 3. Official Trip Reasons Single-Select Grid (Medical, Train, Exam, Shopping, Personal, Other)
 * 4. Travel Capabilities (Accessibility Need, Standing Capability 60 vs 52, Schedule Flexibility ±30/60m)
 * 5. IIIT Pune Fleet Seat Maps (Bus 1 & 2: 52 Seats + 8 Standing = 60; Bus 3: 32 Seats + 5 Standing = 37)
 * 6. Campus Route Only (8 official shuttle stops)
 * 7. 3-Level Deterministic Fairness Explanation & Audit Counterfactual
 */
export const DeckSeatPicker = ({ bus, isOpen, onClose, onProceedToCheckout }) => {
  const navigate = useNavigate();
  const { announce } = useAccessibility();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Active student profile (authenticated via MIS)
  const student = useMemo(() => ({
    misNumber: user?.misNumber || '112203045',
    fullName: user?.fullName || 'Rahul Deshmukh',
    course: user?.course || 'B.Tech',
    branch: user?.branch || 'CSE',
    hostel: user?.hostel ? (user.hostel.includes('Hostel') ? user.hostel : `${user.hostel} Hostel`) : 'Krishna Hostel',
    roomNumber: user?.roomNumber || 'K-302',
    canTravelStanding: user?.canTravelStanding !== undefined ? user.canTravelStanding : true,
    declaredAccessibilityNeed: Boolean(user?.declaredAccessibilityNeed),
    rejectedRequestsLast14Days: user?.rejectedRequestsLast14Days || 0,
    confirmedBookingsThisWeek: user?.confirmedBookingsThisWeek || 1,
    weeklyClassTimetable: user?.weeklyClassTimetable || []
  }), [user]);

  // Trip and Fleet contextual parameters
  const tripId = bus?.tripId || bus?.id || 'T1';
  const timetableEntry = useMemo(() => TIMETABLE.find(t => t.tripId === tripId) || {}, [tripId]);
  
  const departureTime = bus?.departureTime || timetableEntry.departureTime || '08:00';
  const arrivalTime = bus?.arrivalTime || timetableEntry.arrivalTime || '08:50';
  const direction = bus?.direction || timetableEntry.direction || 'AWAY_FROM_CAMPUS';
  const assignedBusId = bus?.assignedBus || bus?.busId || timetableEntry.assignedBus || 'BUS-01';
  
  // Fleet sizing: Bus 3 = 32 seats + 5 standing (37 total); Bus 1 & 2 = 52 seats + 8 standing (60 total)
  const isBus3 = assignedBusId === 'BUS-03' || bus?.seatsTotal === 32 || bus?.seatsCapacity === 32 || tripId === 'T8';
  const seatsCapacity = isBus3 ? 32 : 52;
  const standingCapacity = isBus3 ? 5 : 8;
  const totalCapacity = isBus3 ? 37 : 60;
  
  // Emergency Held-Back Quota: 3 in 52-seater ('1A', '1B', '2A'), 2 in 32-seater ('1A', '1B')
  const emergencyHeldCount = isBus3 ? 2 : 3;
  const emergencySeats = isBus3 ? ['1A', '1B'] : ['1A', '1B', '2A'];
  const generalSeatsAvailable = seatsCapacity - emergencyHeldCount; // 30 in 32-seater, 49 in 52-seater
  const busModel = isBus3 ? 'Eicher Skyline-32 Compact' : (assignedBusId === 'BUS-02' ? 'Ashok Leyland Oyster-52' : 'Tata Starbus EV-52');
  const busPlate = bus?.busPlate || (isBus3 ? 'MH 14 BT 1003' : (assignedBusId === 'BUS-02' ? 'MH 14 BT 1002' : 'MH 14 BT 1001'));

  // Form State: Trip Reason & Preferences
  const [tripReason, setTripReason] = useState('TRAIN_CONNECTION');
  const [otherReasonText, setOtherReasonText] = useState('');
  const [declaredAccessibilityNeed, setDeclaredAccessibilityNeed] = useState(student.declaredAccessibilityNeed);
  const [canTravelStanding, setCanTravelStanding] = useState(student.canTravelStanding);
  const [isFlexible, setIsFlexible] = useState(false);
  const [flexibleWindowMinutes, setFlexibleWindowMinutes] = useState(30);

  // Emergency Quota Eligibility (Section 6.2 Priority Override)
  const isEmergencyEligible = tripReason === 'MEDICAL' || Boolean(declaredAccessibilityNeed);

  // Seat & Standing Selection State
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedStandingSpot, setSelectedStandingSpot] = useState(null);

  // Stop Selection State (Campus Route Only)
  const isOutbound = direction === 'AWAY_FROM_CAMPUS';

  // Boarding & Dropping options for Campus Route
  const outboundDroppingStops = [
    { id: 'stop-2', name: 'L&T Circle', time: '08:08', landmark: 'Industrial Highway Junction' },
    { id: 'stop-3', name: 'Restaurant Chain', time: '08:15', landmark: 'Student Food Plaza & Cafes' },
    { id: 'stop-4', name: 'Medical Store', time: '08:22', landmark: 'Pharmacy & Wellness Centre' },
    { id: 'stop-5', name: 'Godavari Boys Hostel (Off-Campus Terminus)', time: '08:30', landmark: 'Godavari Boys Off-Campus Residence' },
    { id: 'stop-6', name: 'Hospital', time: '08:38', landmark: 'General Health Care Hospital' },
    { id: 'stop-7', name: 'Laptop Service Centre', time: '08:44', landmark: 'Electronics & IT Hardware Hub' },
    { id: 'stop-8', name: 'Talegaon Station', time: '08:50', landmark: 'Talegaon Railway Station Central Platform' }
  ];

  const inboundBoardingStops = [
    { id: 'stop-8', name: 'Talegaon Station', time: departureTime, landmark: 'Talegaon Railway Station Central Platform' },
    { id: 'stop-7', name: 'Laptop Service Centre', time: departureTime, landmark: 'Electronics & IT Hardware Hub' },
    { id: 'stop-6', name: 'Hospital', time: departureTime, landmark: 'General Health Care Hospital' },
    { id: 'stop-5', name: 'Godavari Boys Hostel (Off-Campus Terminus)', time: departureTime, landmark: 'Godavari Boys Off-Campus Residence' },
    { id: 'stop-4', name: 'Medical Store', time: departureTime, landmark: 'Pharmacy & Wellness Centre' },
    { id: 'stop-3', name: 'Restaurant Chain', time: departureTime, landmark: 'Student Food Plaza & Cafes' },
    { id: 'stop-2', name: 'L&T Circle', time: departureTime, landmark: 'Industrial Highway Junction' }
  ];

  const [boardingPointId, setBoardingPointId] = useState(isOutbound ? 'stop-1' : 'stop-8');
  const [droppingPointId, setDroppingPointId] = useState(isOutbound ? 'stop-8' : 'stop-1');

  // Synchronize stop selections when route direction or trip changes
  useEffect(() => {
    if (isOutbound) {
      setBoardingPointId('stop-1');
      setDroppingPointId('stop-8');
    } else {
      setBoardingPointId('stop-8');
      setDroppingPointId('stop-1');
    }
  }, [isOutbound, tripId]);

  // Inline feedback messages
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Allocation Explanation Modal View State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allocationResult, setAllocationResult] = useState(null);
  const [showExplanationPanel, setShowExplanationPanel] = useState(false);
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);

  // Sync state if user accessibility preference changes
  useEffect(() => {
    setDeclaredAccessibilityNeed(Boolean(user?.declaredAccessibilityNeed));
    setCanTravelStanding(user?.canTravelStanding !== undefined ? user.canTravelStanding : true);
  }, [user]);

  if (!isOpen || !bus) return null;

  // Generate 2+2 rows for 52-seat (13 rows) or 32-seat (8 rows)
  const numRows = isBus3 ? 8 : 13;
  const cabinRows = Array.from({ length: numRows }, (_, i) => {
    const rowNum = i + 1;
    const isFrontRow = rowNum === 1; // Row 1 is reserved for declared accessibility needs
    return {
      row: rowNum,
      isAccessibilityRow: isFrontRow,
      seats: [
        { 
          id: `${rowNum}A`, 
          isAccessibilityReserved: isFrontRow,
          isEmergencyQuota: emergencySeats.includes(`${rowNum}A`),
          booked: (rowNum === 2 && !emergencySeats.includes(`${rowNum}A`)) || rowNum === 7 
        },
        { 
          id: `${rowNum}B`, 
          isAccessibilityReserved: isFrontRow,
          isEmergencyQuota: emergencySeats.includes(`${rowNum}B`),
          booked: (rowNum === 4 && !emergencySeats.includes(`${rowNum}B`)) || rowNum === 10 
        },
        { 
          id: `${rowNum}C`, 
          isAccessibilityReserved: isFrontRow,
          isEmergencyQuota: emergencySeats.includes(`${rowNum}C`),
          booked: rowNum === 3 || rowNum === 8 
        },
        { 
          id: `${rowNum}D`, 
          isAccessibilityReserved: isFrontRow,
          isEmergencyQuota: emergencySeats.includes(`${rowNum}D`),
          booked: rowNum === 5 || rowNum === 11 
        }
      ]
    };
  });

  // Standing capacity calculation
  const bookedStandingCount = isBus3 ? 2 : 3;
  const openStandingCount = Math.max(0, standingCapacity - bookedStandingCount);
  const standingSpots = Array.from({ length: standingCapacity }, (_, idx) => {
    const spotId = `S${idx + 1}`;
    const isBooked = idx >= openStandingCount;
    return { id: spotId, label: `Standing Spot ${idx + 1}`, isBooked };
  });

  // Seat toggle handler
  const handleToggleSeat = (seat) => {
    if (seat.booked) return;
    setErrorMsg('');
    setInfoMsg('');

    // If already selected, deselect
    if (selectedSeat?.id === seat.id) {
      setSelectedSeat(null);
      announce(`Deselected seat ${seat.id}`);
      return;
    }

    // Emergency Held-Back Quota check (3 in 52-seater: 1A, 1B, 2A; 2 in 32-seater: 1A, 1B)
    if (seat.isEmergencyQuota && !isEmergencyEligible) {
      setInfoMsg(`Seat ${seat.id} is held in Emergency Reserve Quota (${emergencyHeldCount} seats held for medical emergencies and staff priority). Select 'Medical' reason or declare accessibility need to unlock.`);
      announce(`Seat ${seat.id} is held in Emergency Reserve Quota.`);
      return;
    }

    // Front row accessibility enforcement
    if (seat.isAccessibilityReserved && !declaredAccessibilityNeed && !isEmergencyEligible) {
      setInfoMsg(`Seat ${seat.id} is held for declared reduced-mobility or medical accessibility needs. Please check the accessibility declaration in your preferences to select front-row seating.`);
      announce(`Seat ${seat.id} is held for declared accessibility needs.`);
      return;
    }

    setSelectedSeat(seat);
    setSelectedStandingSpot(null); // Clear standing if seat picked
    announce(`Selected seat ${seat.id}${seat.isEmergencyQuota ? ' (Emergency Quota)' : ''}`);
  };

  // Standing spot toggle handler
  const handleToggleStandingSpot = (spot) => {
    if (spot.isBooked) return;
    setErrorMsg('');
    setInfoMsg('');

    if (!canTravelStanding) {
      setInfoMsg('Your current preference requires a seated place. Switch your standing capability toggle to "Yes" to choose a standing spot.');
      return;
    }

    if (selectedStandingSpot?.id === spot.id) {
      setSelectedStandingSpot(null);
      announce(`Deselected ${spot.label}`);
      return;
    }

    setSelectedStandingSpot(spot);
    setSelectedSeat(null); // Clear seat if standing spot picked
    announce(`Selected ${spot.label}`);
  };

  // Submit trip request to Deterministic Fairness Allocation Policy
  const handleSubmitTripRequest = () => {
    setErrorMsg('');
    setInfoMsg('');

    if (tripReason === 'OTHER' && !otherReasonText.trim()) {
      setErrorMsg('Please enter a brief note for your travel purpose.');
      return;
    }

    setIsSubmitting(true);
    announce('Confirming campus shuttle seat reservation...');

    // Synchronize chosen destination stop based on direction
    const actualRequestedStop = isOutbound ? droppingPointId : 'stop-1';

    // Run Deterministic Priority Hierarchy Engine with selected seat
    try {
      const evaluation = evaluateIIITCampusAllocation({
        student: {
          ...student,
          canTravelStanding,
          declaredAccessibilityNeed
        },
        tripId,
        requestedStop: actualRequestedStop,
        tripReason,
        reasonNote: tripReason === 'OTHER' ? otherReasonText.trim() : '',
        acceptableWindow: isFlexible ? flexibleWindowMinutes : 0,
        journeyDate: bus?.journeyDate || new Date().toISOString().split('T')[0],
        selectedSeatId: selectedSeat?.id || null,
        selectedStandingSpotId: selectedStandingSpot?.id || null
      });

      setAllocationResult(evaluation);
      setShowExplanationPanel(true);
      announce(`Reservation confirmed: ${evaluation.allocatedSpot || 'Confirmed'}`);
    } catch (err) {
      console.error('Error evaluating trip allocation:', err);
      setErrorMsg('An error occurred while confirming allocation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Proceed from confirmation / explanation to checkout
  const handleProceedToConfirmation = () => {
    const chosenDropping = outboundDroppingStops.find(s => s.id === droppingPointId) || outboundDroppingStops[outboundDroppingStops.length - 1];
    const chosenBoarding = isOutbound
      ? { id: 'stop-1', name: 'IIIT Pune Campus (Main Gate)', time: departureTime, landmark: 'Main Gate Security & Admin Block' }
      : (inboundBoardingStops.find(s => s.id === boardingPointId) || inboundBoardingStops[0]);

    const allocatedSpotLabel = allocationResult?.allocatedSpot || (selectedSeat ? `Seat ${selectedSeat.id}` : (selectedStandingSpot ? selectedStandingSpot.label : 'Allocated Place'));

    const reservationPayload = {
      bus,
      busId: bus.id,
      tripId,
      assignedBus: assignedBusId,
      busPlate,
      busModel,
      seats: selectedSeat ? [selectedSeat] : [],
      selectedSeatId: selectedSeat?.id || (allocationResult?.allocationType === 'SEAT' ? allocationResult.allocatedSpot : null),
      selectedStandingSpot: selectedStandingSpot?.id || (allocationResult?.allocationType === 'STANDING' ? allocationResult.allocatedSpot : null),
      allocationType: allocationResult?.allocationType || (selectedStandingSpot ? 'STANDING' : 'SEAT'),
      status: allocationResult?.status || 'ALLOCATED',
      allocatedSpot: allocatedSpotLabel,
      boarding: chosenBoarding,
      boardingPoint: chosenBoarding.name,
      dropping: chosenDropping,
      droppingPoint: chosenDropping.name,
      totalBaseFare: 0,
      totalFare: 0,
      fareDisplay: 'Free (Campus Pass Included)',
      // Authenticated Student Details
      misNumber: student.misNumber,
      passengerName: student.fullName,
      studentProfile: student,
      tripReason,
      tripReasonLabel: TRIP_REASONS[tripReason]?.label || tripReason,
      reasonNote: otherReasonText,
      declaredAccessibilityNeed,
      canTravelStanding,
      isFlexible,
      flexibleWindowMinutes,
      explanation: allocationResult?.explanation,
      evaluationResult: allocationResult
    };

    // Store in session and local storage
    try {
      sessionStorage.setItem('smartbus_current_reservation', JSON.stringify(reservationPayload));
      localStorage.setItem('smartbus_current_reservation', JSON.stringify(reservationPayload));
    } catch (e) {
      console.warn('Storage warning:', e);
    }

    if (onProceedToCheckout) {
      onProceedToCheckout(reservationPayload);
    } else {
      onClose();
      navigate('/checkout');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="iiitTripPickerHeading"
    >
      <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full p-5 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto text-[#0f172a]">
        
        {/* Header Strip */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-50 text-[#0369a1] border border-sky-200">
                IIIT Pune Campus Shuttle
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                {ROUTE_INFO.routeName}
              </span>
            </div>
            <h2 id="iiitTripPickerHeading" className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Trip Request & Seat Allocation
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {isOutbound ? 'Outbound Campus Service' : 'Inbound Campus Service'} • {departureTime} Departure ➔ {arrivalTime} Arrival • {busModel} ({busPlate})
            </p>
          </div>

          <button
            type="button"
            data-a11y-engine="true"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Close allocation modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Inline Alerts */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 text-xs font-semibold rounded-2xl flex items-center gap-2.5 animate-in fade-in" role="alert">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3.5 bg-sky-50 border border-sky-200 text-[#0369a1] text-xs font-semibold rounded-2xl flex items-center gap-2.5 animate-in fade-in" role="status">
            <Info className="w-5 h-5 text-sky-600 shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* 2. REBUILT STUDENT TRIP DETAILS CARD (CLEAN LIGHT THEME) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5">
          
          {/* A. Student Context Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-[#0369a1] flex items-center justify-center font-bold text-sm shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">
                  <span className="font-mono text-[#0369a1] mr-1.5">[MIS: {student.misNumber}]</span>
                  {student.fullName} • {student.course} ({student.branch}) • {student.hostel}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Verified Student Profile • {student.roomNumber} • Carry-over Credits: {student.rejectedRequestsLast14Days} • Weekly Bookings: {student.confirmedBookingsThisWeek}
                </div>
              </div>
            </div>

            <div className="self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-[#0369a1] border border-sky-200">
                <Clock className="w-3.5 h-3.5" />
                Trip {tripId} ({departureTime} Departure)
              </span>
            </div>
          </div>

          {/* B. Reason for Travel (Single-Select Grid) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>Reason for Travel</span>
                <span className="text-[11px] font-normal text-slate-500 lowercase">(deterministic priority weight)</span>
              </label>
              <span className="text-[11px] font-medium text-slate-400">Section 5.3 Deterministic Policy</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { key: 'MEDICAL', label: '🏥 Medical', desc: 'High time-critical priority', badge: 'Tier 1 Priority' },
                { key: 'TRAIN_CONNECTION', label: '🚆 Train / Travel Connection', desc: 'Talegaon connection priority', badge: 'Tier 2 Priority' },
                { key: 'EXAM', label: '📝 Exam / Academic Deadline', desc: 'Academic priority', badge: 'Tier 3 Priority' },
                { key: 'SHOPPING', label: '🛍️ Shopping / Errands', desc: 'Stationery & personal errands', badge: 'General Transit' },
                { key: 'PERSONAL', label: '🏠 Hostel Transit / Personal', desc: 'Hostel commute & leisure', badge: 'Standard Transit' },
                { key: 'OTHER', label: '📌 Other', desc: 'Special circumstances (note below)', badge: 'Specific Purpose' }
              ].map((reasonItem) => {
                const isSelected = tripReason === reasonItem.key;
                return (
                  <button
                    key={reasonItem.key}
                    type="button"
                    id={`reason-btn-${reasonItem.key.toLowerCase()}`}
                    onClick={() => {
                      setTripReason(reasonItem.key);
                      setErrorMsg('');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-sky-50/90 border-[#0284c7] text-[#0369a1] shadow-xs ring-2 ring-sky-200'
                        : 'bg-slate-50/70 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 block truncate">{reasonItem.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#0284c7] shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{reasonItem.desc}</div>
                    <div className={`text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded inline-block ${
                      isSelected ? 'bg-sky-200/60 text-[#0369a1]' : 'bg-slate-200/70 text-slate-600'
                    }`}>
                      {reasonItem.badge}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Note input for "Other" */}
            {tripReason === 'OTHER' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 animate-in fade-in">
                <label htmlFor="other-reason-text" className="text-[11px] font-bold text-slate-700 block">
                  Please describe your specific travel reason:
                </label>
                <input
                  id="other-reason-text"
                  type="text"
                  value={otherReasonText}
                  onChange={(e) => setOtherReasonText(e.target.value)}
                  placeholder="e.g., Urgently collecting official family document / library archive visit"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}
          </div>

          {/* C. Student Travel Capabilities & Preferences */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
              Student Travel Capabilities & Preferences
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* 1. Accessibility Need Checkbox */}
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chk-accessibility-need"
                  checked={declaredAccessibilityNeed}
                  onChange={(e) => setDeclaredAccessibilityNeed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#0284c7] border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <label htmlFor="chk-accessibility-need" className="cursor-pointer select-none space-y-0.5 text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <Accessibility className="w-4 h-4 text-[#0284c7]" />
                    Declared reduced-mobility or medical accessibility need
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-relaxed">
                    Reserves front accessibility seating (Row 1) & unlocks highest Tier 1 deterministic allocation priority.
                  </span>
                </label>
              </div>

              {/* 2. Standing Capability Radio Toggle */}
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2">
                <span className="text-xs font-bold text-slate-900 block">
                  Can you travel standing for 45-50 mins if seats are full?
                </span>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="standingCapability"
                      checked={canTravelStanding === true}
                      onChange={() => setCanTravelStanding(true)}
                      className="text-[#0284c7] focus:ring-sky-500"
                    />
                    <span>Yes, can travel standing (Total capacity: {totalCapacity})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="standingCapability"
                      checked={canTravelStanding === false}
                      onChange={() => {
                        setCanTravelStanding(false);
                        setSelectedStandingSpot(null);
                      }}
                      className="text-[#0284c7] focus:ring-sky-500"
                    />
                    <span>No, I require a seated place only (Seats: {seatsCapacity})</span>
                  </label>
                </div>
              </div>

            </div>

            {/* 3. Schedule Flexibility Window */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chk-schedule-flexibility"
                  checked={isFlexible}
                  onChange={(e) => setIsFlexible(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#0284c7] border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <label htmlFor="chk-schedule-flexibility" className="cursor-pointer select-none text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#0284c7]" />
                    Flexible with departure time
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Allows Stage B alternative allocation within ±30 mins or ±60 mins if current shuttle is over-capacity.
                  </span>
                </label>
              </div>

              {isFlexible && (
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setFlexibleWindowMinutes(30)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                      flexibleWindowMinutes === 30
                        ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ±30 mins
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlexibleWindowMinutes(60)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                      flexibleWindowMinutes === 60
                        ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ±60 mins
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* 3 & 4. SEATING LAYOUT & BOARDING / DROPPING STOPS (2-COLUMNS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: IIIT Pune Bus Cabin & Standing Places Strip */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Bus Info Strip */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0284c7] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {busModel}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {seatsCapacity} Seats ({generalSeatsAvailable} General + {emergencyHeldCount} Emergency Quota) + {standingCapacity} Standing = {totalCapacity} Total Capacity
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#0369a1] bg-sky-100/80 px-2.5 py-1 rounded-full border border-sky-200">
                {assignedBusId}
              </span>
            </div>

            {/* Visual Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 text-xs font-medium text-slate-600 py-2 border-y border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border-2 border-slate-300 bg-white inline-block"></span>
                <span>Available ({generalSeatsAvailable})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border-2 border-dashed border-amber-400 bg-slate-100 text-[10px] text-amber-800 font-bold flex items-center justify-center">🛡️</span>
                <span>Emergency Quota ({emergencyHeldCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border-2 border-sky-400 bg-sky-50 text-[10px] text-[#0369a1] font-bold flex items-center justify-center">♿</span>
                <span>Accessibility</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-emerald-600 border border-emerald-700 inline-block"></span>
                <span className="font-bold text-emerald-800">Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-slate-300 inline-block"></span>
                <span className="text-slate-500">Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border-2 border-amber-400 bg-amber-50 text-[10px] text-amber-800 font-bold flex items-center justify-center">🚶</span>
                <span>Standing Strip</span>
              </div>
            </div>

            {/* Bus Cabin Canvas */}
            <div className="p-5 bg-slate-50/70 rounded-3xl border border-slate-200 space-y-4 max-w-sm mx-auto shadow-inner">
              
              {/* Front Driver & Boarding Step */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-slate-200 text-xs font-mono font-medium text-slate-400">
                <span className="uppercase text-[10px] font-bold tracking-wider text-slate-500">Front Entry Door</span>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  <Disc className="w-3.5 h-3.5 text-slate-600" />
                  <span>Driver</span>
                </div>
              </div>

              {/* Cabin Rows (13 rows for 52-seat or 8 rows for 32-seat) */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {cabinRows.map((rowObj) => (
                  <div key={rowObj.row} className="flex items-center justify-between">
                    
                    {/* Left 2 seats */}
                    <div className="flex gap-2">
                      {rowObj.seats.slice(0, 2).map((seat) => {
                        const isSelected = selectedSeat?.id === seat.id;
                        const isEmergencyLocked = seat.isEmergencyQuota && !isEmergencyEligible;
                        return (
                          <button
                            key={seat.id}
                            id={`seat-btn-${seat.id}`}
                            type="button"
                            disabled={seat.booked}
                            onClick={() => handleToggleSeat(seat)}
                            title={seat.isEmergencyQuota ? (isEmergencyLocked ? 'Reserved (Emergency/Admin Quota: Held for medical emergencies)' : 'Emergency Quota (Unlocked for Medical/Accessibility)') : undefined}
                            className={`w-9 h-9 rounded-xl text-xs font-bold tabular-nums transition-all flex flex-col items-center justify-center relative ${
                              seat.booked
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                                : isSelected
                                  ? 'bg-emerald-600 text-white border-2 border-emerald-700 shadow-sm ring-2 ring-emerald-200'
                                  : isEmergencyLocked
                                    ? 'bg-slate-100 text-slate-400 border-2 border-dashed border-amber-400 hover:bg-amber-50 cursor-pointer'
                                    : seat.isEmergencyQuota && isEmergencyEligible
                                      ? 'bg-amber-50 border-2 border-amber-500 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-300'
                                      : seat.isAccessibilityReserved
                                        ? 'bg-sky-50 border-2 border-sky-400 text-[#0369a1] hover:bg-sky-100'
                                        : 'bg-white border-2 border-slate-300 hover:border-[#0284c7] text-slate-800'
                            }`}
                            aria-label={`Seat ${seat.id} ${seat.isEmergencyQuota ? (isEmergencyLocked ? 'Reserved (Emergency/Admin Quota)' : 'Emergency Quota') : ''} ${seat.isAccessibilityReserved ? 'Accessibility Reserved' : ''} ${seat.booked ? 'Booked' : isSelected ? 'Selected' : 'Available'}`}
                          >
                            <span>{seat.id}</span>
                            {seat.isEmergencyQuota && !seat.booked && (
                              <span className={`absolute -top-1 -right-1 text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold ${
                                isEmergencyLocked ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                              }`}>
                                🛡️
                              </span>
                            )}
                            {seat.isAccessibilityReserved && !seat.isEmergencyQuota && !seat.booked && (
                              <span className="absolute -top-1 -right-1 text-[8px] bg-[#0284c7] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                                ♿
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Central Aisle */}
                    <span className="text-[9px] text-slate-400 font-mono tracking-widest font-bold">AISLE</span>

                    {/* Right 2 seats */}
                    <div className="flex gap-2">
                      {rowObj.seats.slice(2, 4).map((seat) => {
                        const isSelected = selectedSeat?.id === seat.id;
                        const isEmergencyLocked = seat.isEmergencyQuota && !isEmergencyEligible;
                        return (
                          <button
                            key={seat.id}
                            id={`seat-btn-${seat.id}`}
                            type="button"
                            disabled={seat.booked}
                            onClick={() => handleToggleSeat(seat)}
                            title={seat.isEmergencyQuota ? (isEmergencyLocked ? 'Reserved (Emergency/Admin Quota: Held for medical emergencies)' : 'Emergency Quota (Unlocked for Medical/Accessibility)') : undefined}
                            className={`w-9 h-9 rounded-xl text-xs font-bold tabular-nums transition-all flex flex-col items-center justify-center relative ${
                              seat.booked
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                                : isSelected
                                  ? 'bg-emerald-600 text-white border-2 border-emerald-700 shadow-sm ring-2 ring-emerald-200'
                                  : isEmergencyLocked
                                    ? 'bg-slate-100 text-slate-400 border-2 border-dashed border-amber-400 hover:bg-amber-50 cursor-pointer'
                                    : seat.isEmergencyQuota && isEmergencyEligible
                                      ? 'bg-amber-50 border-2 border-amber-500 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-300'
                                      : seat.isAccessibilityReserved
                                        ? 'bg-sky-50 border-2 border-sky-400 text-[#0369a1] hover:bg-sky-100'
                                        : 'bg-white border-2 border-slate-300 hover:border-[#0284c7] text-slate-800'
                            }`}
                            aria-label={`Seat ${seat.id} ${seat.isEmergencyQuota ? (isEmergencyLocked ? 'Reserved (Emergency/Admin Quota)' : 'Emergency Quota') : ''} ${seat.isAccessibilityReserved ? 'Accessibility Reserved' : ''} ${seat.booked ? 'Booked' : isSelected ? 'Selected' : 'Available'}`}
                          >
                            <span>{seat.id}</span>
                            {seat.isEmergencyQuota && !seat.booked && (
                              <span className={`absolute -top-1 -right-1 text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold ${
                                isEmergencyLocked ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                              }`}>
                                🛡️
                              </span>
                            )}
                            {seat.isAccessibilityReserved && !seat.isEmergencyQuota && !seat.booked && (
                              <span className="absolute -top-1 -right-1 text-[8px] bg-[#0284c7] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                                ♿
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>

              {/* Rear End Indicator */}
              <div className="text-center pt-2 border-t border-dashed border-slate-200 text-[10px] font-mono text-slate-400">
                REAR CABIN & EMERGENCY EXIT
              </div>

            </div>

            {/* Standing Places Strip */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="text-base">🚶</span>
                  <span>Standing Places Strip</span>
                </span>
                <span className="text-[11px] font-bold text-amber-800 font-mono bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                  {openStandingCount} of {standingCapacity} standing spots open
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                Designated standing zones along the aisle. If seats are full, passengers with standing capability travel standing for the 45-50 min runtime.
              </p>

              {/* Standing Spots Grid */}
              <div className="flex flex-wrap gap-2 pt-1">
                {standingSpots.map((spot) => {
                  const isSelected = selectedStandingSpot?.id === spot.id;
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      id={`standing-spot-btn-${spot.id.toLowerCase()}`}
                      disabled={spot.isBooked || !canTravelStanding}
                      onClick={() => handleToggleStandingSpot(spot)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                        spot.isBooked
                          ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                          : isSelected
                            ? 'bg-emerald-600 text-white border-2 border-emerald-700 shadow-xs'
                            : 'bg-white text-amber-900 border border-amber-300 hover:border-amber-500'
                      }`}
                    >
                      <span>🚶</span>
                      <span>{spot.id}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Boarding/Dropping Stops & Action CTA */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Boarding Point (Campus Route Only) */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#0284c7]" />
                <span>Boarding Point</span>
              </label>

              {isOutbound ? (
                <div className="p-3 bg-white rounded-xl border border-sky-300 shadow-2xs text-xs">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>IIIT Pune Campus (Main Gate)</span>
                    <span className="font-mono text-[#0284c7]">{departureTime}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Main Gate Security & Admin Office Platform
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {inboundBoardingStops.map((stop) => (
                    <label 
                      key={stop.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        boardingPointId === stop.id
                          ? 'bg-white border-[#0284c7] ring-1 ring-sky-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="inboundBoardingGroup"
                        checked={boardingPointId === stop.id}
                        onChange={() => setBoardingPointId(stop.id)}
                        className="mt-0.5 text-[#0284c7] focus:ring-sky-500"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-slate-900 block">{stop.name}</span>
                        <span className="text-[10px] text-slate-500">{stop.landmark}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Dropping Point (Campus Route Only) */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Dropping Point (8 Official Stops)</span>
              </label>

              {isOutbound ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {outboundDroppingStops.map((stop) => (
                    <label 
                      key={stop.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        droppingPointId === stop.id
                          ? 'bg-white border-[#0284c7] ring-1 ring-sky-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="outboundDroppingGroup"
                        checked={droppingPointId === stop.id}
                        onChange={() => setDroppingPointId(stop.id)}
                        className="mt-0.5 text-[#0284c7] focus:ring-sky-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{stop.name}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{stop.time}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">{stop.landmark}</span>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-2xs text-xs">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>IIIT Pune Campus (Main Gate)</span>
                    <span className="font-mono text-emerald-700">{arrivalTime}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Main Gate Security & Admin Office Platform
                  </div>
                </div>
              )}
            </div>

            {/* Selection Summary Card */}
            <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600">Selected Allocation:</span>
                <span className="font-bold text-slate-900">
                  {selectedSeat 
                    ? `Seat ${selectedSeat.id} ${selectedSeat.isAccessibilityReserved ? '(Accessibility Reserved)' : ''}`
                    : (selectedStandingSpot ? selectedStandingSpot.label : 'Auto-Allocate on Submit')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600">Fare Policy:</span>
                <span className="text-sm font-bold text-[#0369a1]">
                  Free (Institute Student Pass)
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              id="deck-submit-trip-btn"
              data-a11y-engine="true"
              onClick={handleSubmitTripRequest}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#0369a1] hover:bg-[#0284c7] active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 focus:ring-4 focus:ring-sky-200 cursor-pointer disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Evaluating Deterministic Fairness...</span>
                </>
              ) : (
                <>
                  <span>Submit Trip Request</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </div>

        </div>

        {/* 5. 3-LEVEL EXPLANATION PANEL MODAL / OVERLAY */}
        {showExplanationPanel && allocationResult && (
          <div 
            className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="explanationPanelHeading"
          >
            <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-[#0f172a]">
              
              {/* Outcome Header Strip */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                    allocationResult.status === 'ALLOCATED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : allocationResult.isFeasible === false || allocationResult.status === 'INFEASIBLE'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {allocationResult.status === 'ALLOCATED' ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : allocationResult.isFeasible === false || allocationResult.status === 'INFEASIBLE' ? (
                      <AlertCircle className="w-6 h-6" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 id="explanationPanelHeading" className="text-base sm:text-lg font-bold text-slate-900">
                      Campus Shuttle Request Decision & Audit Trace
                    </h3>
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      Deterministic 5-Rule Fairness Policy • Section 5.3 & 6.4 Specification
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExplanationPanel(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl"
                  aria-label="Close explanation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Render Unified 3-Level Explanation Engine */}
              <BookingStatusExplanation
                booking={{
                  misNumber: student.misNumber,
                  userName: student.fullName,
                  course: student.course,
                  branch: student.branch,
                  hostel: student.hostel,
                  roomNumber: student.roomNumber,
                  declaredAccessibilityNeed,
                  canTravelStanding,
                  rejectedRequestsLast14Days: student.rejectedRequestsLast14Days,
                  confirmedBookingsThisWeek: student.confirmedBookingsThisWeek,
                  tripId,
                  tripPurpose: tripReason,
                  reasonNote: tripReason === 'OTHER' ? otherReasonText.trim() : '',
                  droppingPoint: isOutbound ? (outboundDroppingStops.find(s => s.id === droppingPointId)?.name || 'Godavari Boys Hostel') : 'IIIT Pune Campus (Main Gate)',
                  boardingPoint: isOutbound ? 'IIIT Pune Campus (Main Gate)' : (inboundBoardingStops.find(s => s.id === boardingPointId)?.name || 'Talegaon Station'),
                  flexibleWindowMinutes: isFlexible ? flexibleWindowMinutes : 0,
                  journeyDate: bus?.journeyDate || new Date().toISOString().split('T')[0]
                }}
                evaluationResult={allocationResult}
                showSimulatorControls={false}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                {allocationResult.isFeasible !== false && allocationResult.status !== 'INFEASIBLE' && allocationResult.status !== 'DIRECTION_MISMATCH' && (
                  <button
                    type="button"
                    id="explanation-confirm-btn"
                    onClick={handleProceedToConfirmation}
                    className="flex-1 py-3 bg-[#0369a1] hover:bg-[#0284c7] text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{allocationResult.status === 'ALLOCATED' ? 'Proceed to Confirmation' : 'Accept Waitlist Position & Continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowExplanationPanel(false)}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
                >
                  Adjust Preferences
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
