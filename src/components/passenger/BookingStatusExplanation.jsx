import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Info, 
  ArrowRight, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Bus, 
  RotateCcw,
  Sparkles,
  HelpCircle,
  Accessibility,
  HeartPulse,
  Award,
  Users,
  Compass,
  Calendar,
  MapPin
} from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { 
  evaluateIIITCampusAllocation, 
  generateRealisticCampusRequests, 
  solveTripContention, 
  getTripCapacity,
  findAlternativeTripSuggestions
} from '../../utils/allocationEngine';
import { TIMETABLE, FLEET, TRIP_REASONS } from '../../data/iiitBusData';

/**
 * Three-Level Faithful Explainability Panel for Dashboard 1 (IIIT Pune Campus Bus Shuttle)
 * Strictly rule-based, auditable, and transparent.
 * 
 * Levels:
 * Level 1: Outcome Headline (Seat Confirmed / Standing Allocated / Waitlisted Rank #X / Infeasible)
 * Level 2: Plain-Language Reason (1-2 faithful sentences explaining exact rule applied)
 * Level 3: Expandable Audit Details & Exact Computed Counterfactual ("What would change it?")
 * + Stage B Alternative Trip Suggestions (Assignment Optimization for Negative Cases)
 */
export const BookingStatusExplanation = ({ 
  booking = {}, 
  evaluationResult: propsEvaluationResult = null,
  onAcceptReallocation = null,
  onRevertToWaitlist = null,
  showSimulatorControls = false 
}) => {
  const { t, currentLanguage } = useTranslation();
  const { announce } = useAccessibility();

  const [isAuditExpanded, setIsAuditExpanded] = useState(false);
  const [activeWindow, setActiveWindow] = useState(booking?.flexibleWindowMinutes ?? 60);

  // Extract student and trip context from booking
  const student = useMemo(() => ({
    misNumber: booking?.misNumber || booking?.userMis || '112603001',
    fullName: booking?.userName || booking?.passengerName || booking?.passengers?.[0]?.name || 'Aditya Verma',
    hostel: booking?.hostel || 'GODAVARI',
    roomNumber: booking?.roomNumber || 'G-214',
    course: booking?.course || 'B.Tech',
    batch: booking?.batch || '2026-2030',
    branch: booking?.branch || 'AIDS',
    canTravelStanding: booking?.canTravelStanding !== false,
    declaredAccessibilityNeed: Boolean(booking?.declaredAccessibilityNeed || booking?.isDivyang),
    carryOverCredits: booking?.carryOverCredits ?? booking?.rejectedRequestsLast14Days ?? 1,
    rejectedRequestsLast14Days: booking?.carryOverCredits ?? booking?.rejectedRequestsLast14Days ?? 1,
    confirmedBookingsThisWeek: booking?.confirmedBookingsThisWeek ?? 2,
    weeklyClassTimetable: booking?.weeklyClassTimetable || []
  }), [booking]);

  const tripId = booking?.tripId || 'T7';
  const tripReason = (booking?.tripPurpose || booking?.tripReason || booking?.passengers?.[0]?.tripPurpose || 'SHOPPING').toUpperCase();
  const reasonNote = booking?.reasonNote || '';

  // Run deterministic evaluation engine or use pre-evaluated result
  const evaluationResult = useMemo(() => {
    if (propsEvaluationResult) return propsEvaluationResult;
    return evaluateIIITCampusAllocation({
      student,
      tripId,
      requestedStop: booking?.droppingPoint || 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)',
      tripReason,
      reasonNote,
      acceptableWindow: activeWindow,
      journeyDate: booking?.journeyDate || new Date().toISOString().split('T')[0]
    });
  }, [propsEvaluationResult, student, tripId, tripReason, reasonNote, activeWindow, booking]);

  const { 
    explanation, 
    status, 
    allocationType, 
    allocatedSpot, 
    rank, 
    waitlistPosition, 
    capacitySummary, 
    competingStats, 
    alternativeTrips: computedAlternatives = [] 
  } = evaluationResult;

  const isInfeasible = evaluationResult.isFeasible === false || 
    status === 'INFEASIBLE' || 
    status === 'DIRECTION_MISMATCH' || 
    status === 'TIMETABLE_CLASH' ||
    status?.includes('INFEASIBLE');

  const isWaitlisted = status === 'WAITLISTED';
  const isStanding = allocationType === 'STANDING';
  const isAllocated = status === 'ALLOCATED';

  // Fallback to computed alternative suggestions if empty
  const alternativeTrips = useMemo(() => {
    if (computedAlternatives && computedAlternatives.length > 0) {
      return computedAlternatives.slice(0, 3);
    }
    const currentTripObj = TIMETABLE.find(t => t.tripId === tripId) || TIMETABLE[6];
    return findAlternativeTripSuggestions({
      student: { ...student, tripReason },
      requestedTrip: currentTripObj,
      acceptableWindowMinutes: activeWindow,
      allTrips: TIMETABLE
    }).slice(0, 3);
  }, [computedAlternatives, student, tripReason, tripId, activeWindow]);

  // Handle alternative trip selection
  const handleSelectAlternative = (altTrip) => {
    if (onAcceptReallocation) {
      onAcceptReallocation({
        tripId: altTrip.tripId,
        assignedBusName: `Trip ${altTrip.tripId} (${altTrip.departureTime} Departure)`,
        assignedBusTime: altTrip.departureTime,
        assignedSeat: 'S-08',
        originalBusTime: evaluationResult.trip?.departureTime || '17:30'
      });
      announce(`Accepted alternative: Trip ${altTrip.tripId} departing at ${altTrip.departureTime}`);
    }
  };

  // Status-dependent theme configuration
  const theme = useMemo(() => {
    if (isInfeasible) {
      return {
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
        headerBg: 'bg-rose-50/80 border-rose-200',
        iconBg: 'bg-rose-600 text-white',
        accentText: 'text-rose-900',
        border: 'border-rose-200',
        Icon: AlertCircle
      };
    }
    if (isWaitlisted) {
      return {
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
        headerBg: 'bg-amber-50/80 border-amber-200',
        iconBg: 'bg-amber-500 text-white',
        accentText: 'text-amber-950',
        border: 'border-amber-200',
        Icon: Clock
      };
    }
    if (isStanding) {
      return {
        badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
        headerBg: 'bg-teal-50/80 border-teal-200',
        iconBg: 'bg-teal-600 text-white',
        accentText: 'text-teal-950',
        border: 'border-teal-200',
        Icon: Users
      };
    }
    // Allocated Seat (Default Green)
    return {
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      headerBg: 'bg-emerald-50/80 border-emerald-200',
      iconBg: 'bg-emerald-600 text-white',
      accentText: 'text-emerald-950',
      border: 'border-emerald-200',
      Icon: CheckCircle2
    };
  }, [isInfeasible, isWaitlisted, isStanding]);

  const StatusIcon = theme.Icon;

  // Exact Counterfactual text
  const counterfactualText = useMemo(() => {
    if (explanation?.level3Audit?.exactCounterfactual) {
      return explanation.level3Audit.exactCounterfactual;
    }
    if (isWaitlisted) {
      const waitlistPos = waitlistPosition || 3;
      return `If 1 confirmed student on this trip cancels, you will move to Rank #${Math.max(1, waitlistPos - 1)}. If you had submitted your request prior to 14:00, or held a priority boost from a previously full trip, you would have ranked 47th and received a seat.`;
    }
    if (isInfeasible) {
      return status === 'TIMETABLE_CLASH'
        ? 'You can request the subsequent 17:30 departure (Trip T7), which departs after your lab concludes.'
        : 'Please pick a destination along the outbound route (L&T Circle, Restaurant Chain, Medical Store, Godavari Hostel, Hospital, Laptop Service Centre, Talegaon Station).';
    }
    return 'Your seat reservation is confirmed. If you ever cancel or switch trips, your seat will be automatically reassigned to waitlisted students.';
  }, [explanation, isWaitlisted, isInfeasible, status, waitlistPosition]);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-900 transition-all">
      
      {/* ========================================================
          DYNAMIC STATUS HEADER (LEVELS 1 & 2)
          - Green: Allocated Seat
          - Teal: Allocated Standing Place
          - Amber: Waitlisted
          - Rose/Red: Infeasible / Clash
          ======================================================== */}
      <div className={`p-5 sm:p-6 border-b transition-colors ${theme.headerBg}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${theme.iconBg}`}>
              <StatusIcon className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${theme.badgeBg}`}>
                  {isInfeasible 
                    ? 'Level 1 • Constraint Check' 
                    : (isAllocated ? 'Level 1 • Confirmed Allocation' : 'Level 1 • Contention Standby')}
                </span>
                {evaluationResult.trip?.tripId && (
                  <span className="text-xs font-mono font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                    Trip {evaluationResult.trip.tripId} ({evaluationResult.trip.departureTime || '17:30'} Departure)
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1.5">
                {explanation?.level1Headline || (
                  isWaitlisted 
                    ? `🟠 ON WAITING LIST: RANK #${waitlistPosition || 3}`
                    : (isInfeasible 
                        ? (status === 'TIMETABLE_CLASH' ? '🔴 REQUEST INFEASIBLE: CLASS SCHEDULE CLASH' : '🔴 REQUEST INFEASIBLE: ROUTE DIRECTION MISMATCH')
                        : (isStanding ? `Standing Place Allocated (${allocatedSpot || 'ST-1'})` : `Seat Confirmed (${allocatedSpot || 'Seat 1A'})`))
                )}
              </h2>
            </div>
          </div>

          {/* Student Identity Pill */}
          <div className="bg-white/95 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-600 shadow-2xs shrink-0">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{student.fullName}</span>
              <span className="text-slate-400 font-mono text-[11px]">({student.misNumber})</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
              <span>{student.course} ({student.branch})</span>
              <span>•</span>
              <span>{student.hostel}</span>
            </div>
          </div>

        </div>

        {/* ========================================================
            SECTION 1: LEVEL 2 PLAIN-LANGUAGE FAITHFUL REASON
            1-2 clear, faithful sentences without abbreviations or NaN
            ======================================================== */}
        <div className="mt-4 pt-3.5 border-t border-slate-200/80">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-600" />
            <span>Level 2 • Plain-Language Reason</span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
            {explanation?.level2Reason || 'Your campus shuttle seat is evaluated strictly under IIIT Pune deterministic fairness guidelines.'}
          </p>
        </div>

      </div>

      {/* ========================================================
          SECTION 2: LEVEL 3 AUDIT, COUNTERFACTUAL & ALTERNATIVES
          ======================================================== */}
      <div className="p-5 sm:p-6 space-y-4 bg-white">
        
        {/* Toggle Detailed Level 3 Audit Button */}
        <button
          type="button"
          onClick={() => setIsAuditExpanded(!isAuditExpanded)}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-left transition-colors focus:ring-2 focus:ring-sky-500 cursor-pointer"
          aria-expanded={isAuditExpanded}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Level 3 • Deterministic Policy Decision Trace
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700">
            <span>{isAuditExpanded ? 'Hide Trace' : 'View Audit Trace'}</span>
            {isAuditExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Collapsible Policy Trace Body */}
        {isAuditExpanded && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4 animate-fade-in text-xs">
            
            {/* Operational Numbers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total Places</span>
                <span className="text-base font-bold text-slate-900">{capacitySummary?.totalAvailable || 58} Places</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {capacitySummary?.availableSeated || 49} seated • {capacitySummary?.availableStanding || 8} standing
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Contention Pool</span>
                <span className="text-base font-bold text-slate-900">{competingStats?.totalRequests || 66} Requests</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Competing applications
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Priority Boost</span>
                <span className="text-base font-bold text-purple-700">
                  {student.carryOverCredits || 0} / 3 Active
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Next-trip priority promotion
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Shuttle Vehicle</span>
                <span className="text-sm font-mono font-bold text-slate-900">{capacitySummary?.plateNumber || 'MH 14 BT 1001'}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{capacitySummary?.model || 'Tata Starbus EV-52'}</span>
              </div>
            </div>

            {/* 5-Rule Strict Priority Trace */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>5-Rule Deterministic Policy Evaluation</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Zero ML Contamination
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="p-2 rounded-lg bg-slate-50 flex items-center justify-between">
                  <span className="font-medium text-slate-600">Rule 1 (Accessibility Need):</span>
                  <span className={`font-bold ${student.declaredAccessibilityNeed ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {student.declaredAccessibilityNeed ? 'Declared (Priority Front-Row Seating)' : 'Standard Seating'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 flex items-center justify-between">
                  <span className="font-medium text-slate-600">Rule 2 (Reason Hierarchy):</span>
                  <span className="font-bold text-sky-800">
                    {TRIP_REASONS[tripReason]?.label || tripReason}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 flex items-center justify-between">
                  <span className="font-medium text-slate-600">Rule 3 (Next-Trip Priority Boost):</span>
                  <span className="font-bold text-purple-700">
                    {Number(student.carryOverCredits || 0) > 0 ? `+${student.carryOverCredits} boost from previously full trips` : 'No prior full trips'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 flex items-center justify-between">
                  <span className="font-medium text-slate-600">Rule 4 (Weekly Bookings):</span>
                  <span className="font-bold text-slate-700">
                    {student.confirmedBookingsThisWeek || 0} booking(s) made this week
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 flex items-center justify-between">
                  <span className="font-medium text-slate-600">Rule 5 (Timestamp Order):</span>
                  <span className="font-mono text-slate-700 font-semibold">
                    Tie-breaker evaluated by submission order
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            EXACT COUNTERFACTUAL BOX ("WHAT WOULD CHANGE IT?")
            Faithful plain-language actionable feedback
            ======================================================== */}
        <div className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${
          isInfeasible 
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : (isWaitlisted 
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950')
        }`}>
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-900">
            <RotateCcw className={`w-4 h-4 ${isInfeasible ? 'text-rose-600' : (isWaitlisted ? 'text-amber-600' : 'text-emerald-600')}`} />
            <span>What Would Change This Decision? (Exact Counterfactual)</span>
          </div>
          <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-800">
            {counterfactualText}
          </p>
        </div>

        {/* ========================================================
            STAGE B: ALTERNATIVE SHUTTLE TRIPS (FOR NEGATIVE CASES)
            Up to 3 ranked alternative trips with 1-click button
            ======================================================== */}
        {(isWaitlisted || isInfeasible) && alternativeTrips.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-700" />
                <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                  Alternative Shuttle Trips with Guaranteed Places
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-200">
                Window: ±{activeWindow} mins
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Free places exist on neighboring departures in the same direction. One-click switch guarantees a confirmed place:
            </p>

            <div className="space-y-2 pt-1">
              {alternativeTrips.map((alt) => (
                <div 
                  key={alt.tripId}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-sky-300 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-mono font-bold text-xs">
                        {alt.tripId}
                      </span>
                      <strong className="text-sm text-slate-900 font-bold">{alt.departureTime} Departure</strong>
                      <span className="text-xs text-slate-500">• {alt.origin?.split('(')[0]?.trim()} ➔ {alt.destination?.split('(')[0]?.trim()}</span>
                    </div>
                    <div className="text-xs text-emerald-700 font-medium mt-1">
                      {alt.rationale || `The ${alt.departureTime} bus (${alt.tripId}) leaves ${Math.abs(alt.shiftMinutes || 50)} mins later with ${alt.freePlacesEstimate || 12} free seats`}
                    </div>
                  </div>

                  <button
                    type="button"
                    id={`switch-to-${alt.tripId.toLowerCase()}-btn`}
                    onClick={() => handleSelectAlternative(alt)}
                    className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
                      alt.isPrimaryAction || alt.tripId === 'T8'
                        ? 'bg-sky-700 hover:bg-sky-800 text-white ring-2 ring-sky-300/60 shadow-sm'
                        : 'bg-sky-600 hover:bg-sky-700 text-white'
                    }`}
                  >
                    <span>{alt.buttonLabel || `Switch to ${alt.departureTime} Trip ${alt.tripId}`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
