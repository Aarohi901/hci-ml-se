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
  RefreshCw, 
  Sparkles,
  HelpCircle,
  Accessibility,
  HeartPulse,
  Award,
  Users,
  Compass,
  Zap,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { 
  evaluateIIITCampusAllocation, 
  generateRealisticCampusRequests, 
  solveTripContention, 
  getTripCapacity 
} from '../../utils/allocationEngine';
import { TIMETABLE, FLEET, TRIP_REASONS } from '../../data/iiitBusData';

/**
 * Three-Level Faithful Explainability Panel for Dashboard 1 (IIIT Pune Campus Bus Shuttle)
 * Strictly rule-based, auditable, and transparent.
 * 
 * Levels:
 * Level 1: Outcome Chip (Seat Confirmed / Standing Allocated / Waitlisted Rank #X)
 * Level 2: Plain-Language Reason (1-2 faithful sentences explaining exact rule applied)
 * Level 3: Expandable Audit Details & Exact Computed Counterfactual ("What would change it?")
 * + Stage B Alternative Trip Suggestions (Assignment Optimization)
 */
export const BookingStatusExplanation = ({ 
  booking = {}, 
  evaluationResult: propsEvaluationResult = null,
  onAcceptReallocation = null,
  onRevertToWaitlist = null,
  showSimulatorControls = true 
}) => {
  const { t, currentLanguage } = useTranslation();
  const { announce } = useAccessibility();

  const [isAuditExpanded, setIsAuditExpanded] = useState(false);
  const [activeWindow, setActiveWindow] = useState(booking?.flexibleWindowMinutes ?? 30);
  const [simulatedContention, setSimulatedContention] = useState(false);

  // Extract student and trip context from booking
  const student = useMemo(() => ({
    misNumber: booking?.misNumber || booking?.userMis || '112603001',
    fullName: booking?.userName || booking?.passengers?.[0]?.name || 'Aditya Verma',
    hostel: booking?.hostel || 'GODAVARI',
    roomNumber: booking?.roomNumber || 'G-214',
    course: booking?.course || 'B.Tech',
    batch: booking?.batch || '2026-2030',
    branch: booking?.branch || 'AIDS',
    canTravelStanding: booking?.canTravelStanding !== false,
    declaredAccessibilityNeed: Boolean(booking?.declaredAccessibilityNeed || booking?.isDivyang),
    rejectedRequestsLast14Days: booking?.rejectedRequestsLast14Days ?? 1,
    confirmedBookingsThisWeek: booking?.confirmedBookingsThisWeek ?? 2,
    weeklyClassTimetable: booking?.weeklyClassTimetable || []
  }), [booking]);

  const tripId = booking?.tripId || 'T7';
  const tripReason = (booking?.tripPurpose || booking?.passengers?.[0]?.tripPurpose || 'TRAIN_CONNECTION').toUpperCase();
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

  const { explanation, status, allocationType, allocatedSpot, rank, waitlistPosition, capacitySummary, competingStats, alternativeTrips } = evaluationResult;

  // Language dictionary overrides for Level 1, 2, 3
  const localizedExplanations = useMemo(() => {
    if (currentLanguage === 'hi') {
      return {
        level1: status === 'ALLOCATED'
          ? (allocationType === 'STANDING' ? `खड़े होने का स्थान आवंटित (${allocatedSpot})` : `सीट सुनिश्चित (${allocatedSpot})`)
          : `प्रतीक्षा सूची में: क्रमांक #${waitlistPosition || 3}`,
        level2: status === 'ALLOCATED'
          ? `आपको ${evaluationResult.trip?.departureTime} बस पर स्थान आवंटित किया गया है। उच्च मांग में आपका कारण (${tripReason}) प्राथमिकता नियमों के तहत स्वीकृत हुआ।`
          : `इस बस में ${capacitySummary?.totalAvailable} स्थान और ${competingStats?.totalRequests} आवेदन हैं। उच्च प्राथमिकता या क्रेडिट के कारण आप प्रतीक्षा सूची में हैं।`,
        counterfactualTitle: 'परिणाम क्या बदल सकता है? (Exact Counterfactual)',
        auditTitle: 'ऑडिट विवरण एवं नियम पारदर्शिता (Rule Audit)',
        altTitle: 'वैकल्पिक बस सुझाव (Alternative Options)'
      };
    }
    if (currentLanguage === 'mr') {
      return {
        level1: status === 'ALLOCATED'
          ? (allocationType === 'STANDING' ? `उभे राहण्याची जागा मंजूर (${allocatedSpot})` : `आसन निश्चित (${allocatedSpot})`)
          : `प्रतीक्षा यादीत: क्रमांक #${waitlistPosition || 3}`,
        level2: status === 'ALLOCATED'
          ? `आपणास ${evaluationResult.trip?.departureTime} बसवर जागा मिळाली आहे. नियमांनुसार आपल्या प्रवासाच्या कारणास प्राधान्य मिळाले आहे.`
          : `या बसमध्ये ${capacitySummary?.totalAvailable} जागा व ${competingStats?.totalRequests} अर्ज आहेत. आपण प्रतीक्षा यादी क्रमांक #${waitlistPosition || 3} वर आहात.`,
        counterfactualTitle: 'निकालामध्ये काय बदल होऊ शकतो? (Exact Counterfactual)',
        auditTitle: 'ऑडिट तपशील व नियम पारदर्शकता (Rule Audit)',
        altTitle: 'पर्यायी बस शिफारसी (Alternative Options)'
      };
    }
    return {
      level1: explanation?.level1Headline || (status === 'ALLOCATED' ? `Seat Confirmed (${allocatedSpot})` : `On Waiting List: Rank #${waitlistPosition || 3}`),
      level2: explanation?.level2Reason || 'Your campus shuttle seat is confirmed under IIIT Pune transport guidelines.',
      counterfactualTitle: 'Status Information & Flexibility',
      auditTitle: 'Trip & Student Allocation Details',
      altTitle: 'Alternative Shuttle Options'
    };
  }, [currentLanguage, status, allocationType, allocatedSpot, waitlistPosition, explanation, evaluationResult, tripReason, capacitySummary, competingStats]);

  // Handle alternative trip selection
  const handleSelectAlternative = (altTrip) => {
    if (onAcceptReallocation) {
      onAcceptReallocation({
        assignedBusName: `Trip ${altTrip.tripId} (${altTrip.departureTime})`,
        assignedBusTime: altTrip.departureTime,
        assignedSeat: 'S-12',
        originalBusTime: evaluationResult.trip?.departureTime
      });
      announce(`Switched to Trip ${altTrip.tripId} departing at ${altTrip.departureTime}`);
    }
  };

  const isInfeasible = evaluationResult.isFeasible === false || status === 'INFEASIBLE' || status === 'DIRECTION_MISMATCH' || status === 'TIMETABLE_CLASH';

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden text-slate-900 transition-all space-y-0">
      
      {/* ========================================================
          LEVEL 1: HEADLINE OUTCOME CHIP & HEADER STRIP
          ======================================================== */}
      <div className={`p-5 sm:p-6 border-b transition-colors ${
        isInfeasible
          ? 'bg-rose-50/70 border-rose-200'
          : (status === 'ALLOCATED'
              ? (allocationType === 'STANDING' ? 'bg-amber-50/60 border-amber-200' : 'bg-emerald-50/60 border-emerald-200')
              : 'bg-amber-50/60 border-amber-200')
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isInfeasible
                ? 'bg-rose-600 text-white'
                : (status === 'ALLOCATED'
                    ? (allocationType === 'STANDING' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white')
                    : 'bg-amber-500 text-white')
            }`}>
              {isInfeasible ? (
                <AlertCircle className="w-6 h-6" />
              ) : status === 'ALLOCATED' ? (
                allocationType === 'STANDING' ? <Users className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isInfeasible
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : (status === 'ALLOCATED'
                        ? (allocationType === 'STANDING' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
                        : 'bg-amber-100 text-amber-800 border-amber-300')
                }`}>
                  Level 1 • Outcome
                </span>
                {evaluationResult.trip?.tripId && evaluationResult.trip?.departureTime ? (
                  <span className="text-xs font-mono text-slate-500">
                    {evaluationResult.trip.tripId} ({evaluationResult.trip.departureTime})
                  </span>
                ) : null}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1">
                {localizedExplanations.level1}
              </h2>
            </div>
          </div>

          {/* Student Profile Pill */}
          <div className="bg-white/90 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 shadow-2xs">
            <div className="font-semibold text-slate-800">{student.fullName} ({student.misNumber})</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{student.course} {student.branch}</span>
              <span>•</span>
              <span>Hostel: {student.hostel}</span>
            </div>
          </div>

        </div>

        {/* ========================================================
            LEVEL 2: PLAIN-LANGUAGE FAITHFUL REASON (1-2 SENTENCES)
            ======================================================== */}
        <div className="mt-4 pt-3 border-t border-slate-200/60">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-600" />
            <span>Level 2 • Plain-Language Reason</span>
          </div>
          <p className="text-sm font-medium text-slate-800 leading-relaxed">
            {localizedExplanations.level2}
          </p>
        </div>
      </div>

      {/* ========================================================
          LEVEL 3: EXPANDABLE AUDIT DETAILS & EXACT COUNTERFACTUAL
          ======================================================== */}
      <div className="p-5 sm:p-6 bg-white space-y-4">
        
        {/* Toggle Level 3 Details Button */}
        <button
          type="button"
          onClick={() => setIsAuditExpanded(!isAuditExpanded)}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-left transition-colors focus:ring-2 focus:ring-sky-500 cursor-pointer"
          aria-expanded={isAuditExpanded}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {localizedExplanations.auditTitle}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700">
            <span>{isAuditExpanded ? 'Hide Details' : 'View Allocation Details'}</span>
            {isAuditExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Collapsible Level 3 Body */}
        {isAuditExpanded && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-5 animate-fade-in text-xs">
            
            {/* 1. Operational Numbers Grid or Infeasible Notice Card */}
            {isInfeasible ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{explanation?.level1Headline || 'Constraint Failed: Trip Direction Mismatch'}</span>
                </div>
                <p className="text-xs text-rose-950 font-medium leading-relaxed">
                  {explanation?.level2Reason || 'Requested stop is incompatible with the trip direction.'}
                </p>
                <div className="p-3 bg-white rounded-lg border border-rose-200 text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-0.5">Resolution Guidance:</span>
                  <span>{explanation?.level3Audit?.exactCounterfactual || 'Trip T1 departs toward Godavari Hostel/Talegaon. Your destination must be a stop along this outbound path.'}</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Shuttle Journey & Vehicle Details
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Total Capacity</span>
                    <span className="text-base font-bold text-slate-900">{capacitySummary?.totalAvailable || 52} Places</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ({capacitySummary?.availableSeated || 49} seated, {capacitySummary?.availableStanding || 8} standing)
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Allocated Place</span>
                    <span className={`text-base font-bold ${status === 'ALLOCATED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {status === 'ALLOCATED' ? (allocatedSpot || 'Seat Confirmed') : `Waitlist #${waitlistPosition || 1}`}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {status === 'ALLOCATED' ? 'Guaranteed Place' : 'Pending Promotion'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Student Fare</span>
                    <span className="text-base font-bold text-emerald-700">₹0 (Free Pass)</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Institute Amenity
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Bus Vehicle Reg</span>
                    <span className="text-sm font-mono font-bold text-slate-900">{capacitySummary?.plateNumber || 'MH 14 BT 1001'}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{capacitySummary?.model || 'Tata Starbus EV-52'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Priority Rule Trace (5-Rule Policy Breakdown) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Campus Transit Policy & Student Record</span>
                <span className="text-[10px] font-semibold text-slate-500">Transparent Rule Record</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Accessibility Status:</span>
                  <span className={`font-bold ${student.declaredAccessibilityNeed ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {student.declaredAccessibilityNeed ? 'Declared (Priority Front Seating Reserved)' : 'Standard Seating'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Travel Purpose:</span>
                  <span className="font-bold text-sky-800">
                    {TRIP_REASONS[tripReason]?.label || tripReason}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Fairness Credit:</span>
                  <span className="font-bold text-purple-700">
                    {student.rejectedRequestsLast14Days || 0} carry-over credit(s) active
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Weekly Quota:</span>
                  <span className="font-bold text-slate-700">
                    {student.confirmedBookingsThisWeek || 0} trip(s) taken this week
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Reporting Guidance:</span>
                  <span className="font-bold text-slate-700">
                    Arrive at shuttle platform 5 minutes before departure
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Booking & Flexibility Notes */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{localizedExplanations.counterfactualTitle}</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-900 font-medium">
                {explanation?.level3Audit?.exactCounterfactual || 
                  'Your seat reservation is confirmed. If you ever cancel or switch departures, your seat will be automatically reassigned to waitlisted students.'}
              </p>
            </div>

          </div>
        )}

        {/* ========================================================
            STAGE B: ALTERNATIVE TRIP RECOMMENDATIONS (FOR WAITLISTED)
            ======================================================== */}
        {status === 'WAITLISTED' && alternativeTrips.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/50 border border-sky-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                  {localizedExplanations.altTitle}
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                Window: ±{activeWindow} mins
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Free capacity exists on neighboring trips in the same direction. One-click switch guarantees a seat:
            </p>

            <div className="space-y-2">
              {alternativeTrips.map(alt => (
                <div 
                  key={alt.tripId}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-mono font-bold text-xs">
                        {alt.tripId}
                      </span>
                      <strong className="text-sm text-slate-900 font-bold">{alt.departureTime} Departure</strong>
                      <span className="text-xs text-slate-500">• {alt.origin.split('(')[0]} ➔ {alt.destination.split('(')[0]}</span>
                    </div>
                    <div className="text-xs text-emerald-700 font-medium mt-1">
                      {alt.rationale}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectAlternative(alt)}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <span>Switch to {alt.tripId}</span>
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
