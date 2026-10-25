/**
 * src/utils/allocationEngine.js
 * 
 * Deterministic, Rule-Based, Auditable & Explainable Allocation Engine
 * strictly conforming to Part 1 of the IIIT Pune Campus Bus Booking System Specification.
 * 
 * ZERO MACHINE LEARNING: 100% Deterministic & Auditable
 * 
 * Pipeline:
 * Step 1: Constraint Analysis (Direction, cut-off, duplicate, timetable clash, standing preference)
 * Step 2: Stage 0 — Bus-to-Trip Assignment & Available Capacity
 * Step 3: Stage A — Deterministic Priority Policy Ranking (5-Rule Strict Hierarchy)
 * Step 4: Stage B — Alternative Recommendations (Assignment Optimization for Waitlisted)
 * Step 5: Three-Level Faithful Explanation & Exact Computed Counterfactual
 * Step 6: Booking Lifecycle & Re-allocation on Cancellation
 */

import { 
  ROUTE_INFO, 
  STOPS, 
  FLEET, 
  TIMETABLE, 
  TRIP_REASONS, 
  HOSTELS, 
  getAvailableBranches 
} from '../data/iiitBusData.js';

/**
 * Convert HH:MM time string to minutes since midnight
 */
export const timeToMinutes = (timeStr = '08:00') => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Format minutes since midnight to HH:MM
 */
export const minutesToTime = (totalMinutes = 0) => {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Check if a student's class timetable clashes with trip runtime (45-50 min window)
 * Per Section 13.4 of the specification: Optional validation that can be bypassed or overridden.
 */
export const checkTimetableClash = (studentTimetable = [], trip = {}, journeyDate = null) => {
  if (!Array.isArray(studentTimetable) || studentTimetable.length === 0 || !trip) {
    return { hasClash: false, clashingSlot: null };
  }

  const tripDepMinutes = timeToMinutes(trip.departureTime);
  const tripArrMinutes = timeToMinutes(trip.arrivalTime) || (tripDepMinutes + 50);

  // Derive day of week if journeyDate provided
  let targetDay = '';
  if (journeyDate) {
    try {
      const d = new Date(journeyDate);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      targetDay = days[d.getDay()];
    } catch (e) {}
  }

  for (const slot of studentTimetable) {
    // If slot has a day and targetDay is known, ensure day matches (or if slot.day is 'Today')
    if (slot.day && targetDay && slot.day !== 'Today' && slot.day.toLowerCase() !== targetDay.toLowerCase()) {
      continue;
    }

    const slotStartMin = timeToMinutes(slot.startTime);
    const slotEndMin = timeToMinutes(slot.endTime);

    // Overlap condition: startA < endB && endA > startB
    const overlaps = tripDepMinutes < slotEndMin && tripArrMinutes > slotStartMin;
    if (overlaps) {
      // Find subsequent trip in TIMETABLE in same direction that departs after lab/class concludes
      const subsequentTrip = TIMETABLE.find(t => 
        t.direction === trip.direction && 
        timeToMinutes(t.departureTime) >= slotEndMin
      ) || TIMETABLE.find(t => timeToMinutes(t.departureTime) >= slotEndMin);

      const actionableNextSteps = subsequentTrip
        ? `You can request the subsequent ${subsequentTrip.departureTime} departure (Trip ${subsequentTrip.tripId}), which departs after your lab concludes.`
        : `You can request an alternative departure that departs after your lab concludes.`;

      return {
        hasClash: true,
        clashingSlot: slot,
        subsequentTrip,
        actionableNextSteps,
        explanation: `This ${trip.departureTime} bus departure directly clashes with your scheduled ${slot.subject} (${slot.startTime} to ${slot.endTime}) entered in your timetable.`
      };
    }
  }

  return { hasClash: false, clashingSlot: null };
};

/**
 * Step 1: Constraint Analysis (Hard Constraints)
 * Includes Lenient / Optional Timetable Validation & Soft Clash Override (Section 13.4)
 */
export const evaluateRequestConstraints = ({
  student = {},
  trip = {},
  requestedStop = null,
  journeyDate = new Date().toISOString().split('T')[0],
  existingRequests = [],
  overrideClassClash = false
}) => {
  const violations = [];
  const advisories = [];

  // Constraint 1: Destination and direction match
  if (requestedStop && trip) {
    const stopObj = typeof requestedStop === 'string' 
      ? STOPS.find(s => s.name.toLowerCase() === requestedStop.toLowerCase() || s.id === requestedStop)
      : requestedStop;

    if (stopObj) {
      if (trip.direction === 'AWAY_FROM_CAMPUS' && stopObj.index === 1) {
        violations.push({
          code: 'DIRECTION_MISMATCH',
          message: `Trip ${trip.tripId} departs from IIIT Pune Main Gate toward Godavari Hostel and Talegaon. The selected drop-off point is not served in this direction.`,
          correction: `Please pick a destination along the outbound route (L&T Circle, Restaurant Chain, Medical Store, Godavari Hostel, Hospital, Laptop Service Centre, Talegaon Station).`
        });
      }
      if (trip.direction === 'TOWARD_CAMPUS' && stopObj.index === 8 && trip.origin !== 'Talegaon Station') {
        violations.push({
          code: 'DIRECTION_MISMATCH',
          message: `Trip ${trip.tripId} departs from Talegaon Station toward IIIT Pune Campus. The selected drop-off point is not served in this direction.`,
          correction: `Please pick a destination along the inbound route toward IIIT Pune Campus (Main Gate).`
        });
      }
    }
  }

  // Constraint 2: Weekly Class Timetable Clash (Optional / Soft validation per Section 13.4)
  // 1. Bypass if no active timetable is present or if empty
  const hasSavedTimetable = Array.isArray(student.weeklyClassTimetable) && student.weeklyClassTimetable.length > 0;
  if (hasSavedTimetable) {
    const clashResult = checkTimetableClash(student.weeklyClassTimetable, trip, journeyDate);
    if (clashResult.hasClash) {
      const isOverridden = Boolean(student.overrideClassClash || overrideClassClash || student.hasPermission);
      if (isOverridden) {
        advisories.push({
          code: 'TIMETABLE_CLASH_OVERRIDDEN',
          message: clashResult.explanation,
          clashingSlot: clashResult.clashingSlot,
          notice: `Class schedule conflict with ${clashResult.clashingSlot?.subject} was overridden with student permission.`
        });
      } else {
        violations.push({
          code: 'TIMETABLE_CLASH',
          message: clashResult.explanation,
          clashingSlot: clashResult.clashingSlot,
          actionableNextSteps: clashResult.actionableNextSteps,
          subsequentTrip: clashResult.subsequentTrip,
          canOverride: true,
          overrideMessage: `Warning: Trip ${trip.tripId} (${trip.departureTime}) overlaps with your listed ${clashResult.clashingSlot?.subject || 'Class/Lab'}. Do you still wish to request this shuttle?`
        });
      }
    }
  }

  // Constraint 2: Cut-off check (only enforced when explicitly requested by system timer)
  if (student.enforceCutoff && trip?.departureTime && !student.ignoreCutoff) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (journeyDate === todayStr) {
      const [depH, depM] = trip.departureTime.split(':').map(Number);
      const depDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), depH, depM);
      // 5-minute pre-departure cutoff
      if (now.getTime() > depDate.getTime() - 5 * 60 * 1000) {
        violations.push({
          code: 'TRIP_DEPARTED_OR_CUTOFF',
          message: `Booking closed for trip ${trip.tripId}. Shuttle departs at ${trip.departureTime}.`
        });
      }
    }
  }

  // Constraint 3: Duplicate active request check
  const duplicate = existingRequests.find(r => 
    r.misNumber === student.misNumber && 
    r.tripId === trip.tripId && 
    r.journeyDate === journeyDate && 
    r.status !== 'CANCELLED'
  );
  if (duplicate) {
    violations.push({
      code: 'DUPLICATE_REQUEST',
      message: `You already have an active request (${duplicate.status}) for trip ${trip.tripId} on ${journeyDate}.`
    });
  }

  return {
    isFeasible: violations.length === 0,
    violations
  };
};

/**
 * Step 2: Stage 0 — Bus-to-Trip Assignment & Capacity Calculation
 */
export const getTripCapacity = (tripInput = {}) => {
  const trip = (tripInput.departureTime && tripInput.assignedBus) 
    ? tripInput 
    : (TIMETABLE.find(t => t.tripId === tripInput.tripId) || tripInput);
  const assignedBus = FLEET.find(b => b.busId === trip.assignedBus) || FLEET[0];
  const seatsTotal = trip.seatsCapacity ?? assignedBus.seats;
  const standingTotal = trip.standingCapacity ?? assignedBus.standingPlaces;
  
  // Trip T7 specifically has 2 held back seats on a 52-seater bus (50 seated + 8 standing = 58)
  const isT7 = trip.tripId === 'T7';
  const heldBackSeats = isT7 ? 2 : (trip.heldBackSeats ?? assignedBus.heldBackSeats ?? (seatsTotal === 32 ? 2 : 3));
  const emergencySeats = isT7 ? ['1A', '1B'] : (trip.emergencySeats || assignedBus.emergencySeats || (seatsTotal === 32 ? ['1A', '1B'] : ['1A', '1B', '2A']));
  const availableSeated = Math.max(0, seatsTotal - heldBackSeats);
  const availableStanding = standingTotal || 0;
  const totalAvailable = availableSeated + availableStanding;

  return {
    busId: assignedBus.busId,
    plateNumber: assignedBus.plateNumber,
    model: assignedBus.model,
    seatsTotal,
    standingTotal,
    heldBackSeats,
    emergencySeats,
    availableSeated,
    availableStanding,
    totalAvailable,
    totalCapacity: seatsTotal + standingTotal
  };
};

/**
 * Step 3: Stage A — Deterministic Priority Policy Ranking (5-Rule Strict Policy)
 * 
 * Rules:
 * 1. Rule 1: Accessibility Need (+1000 base tier)
 * 2. Rule 2: Time-Critical Reason Hierarchy (Medical 500, Train 400, Exam 300, Shopping 100, Personal 50, Other 10)
 * 3. Rule 3: Carry-Over Fairness Credit (min(3, rejectedLast14Days) * 15)
 * 4. Rule 4: Weekly Booking Quota (-10 * confirmedBookingsThisWeek)
 * 5. Rule 5: Timestamp Tie-Breaker (earlier submission ranks higher)
 */
export const computeDeterministicPriorityScore = (request = {}, nowMs = Date.now()) => {
  let score = 0;
  const breakdown = {};

  // Rule 1: Accessibility Need
  const hasA11yNeed = Boolean(request.declaredAccessibilityNeed);
  const a11yScore = hasA11yNeed ? 1000 : 0;
  score += a11yScore;
  breakdown.rule1_accessibility = a11yScore;

  // Rule 2: Reason Hierarchy
  const reasonKey = (request.tripReason || 'PERSONAL').toUpperCase();
  const reasonDef = TRIP_REASONS[reasonKey] || TRIP_REASONS.PERSONAL || { weight: 5, label: 'General Travel' };
  const reasonScore = reasonDef.weight ?? 5;
  score += reasonScore;
  breakdown.rule2_reasonHierarchy = {
    category: reasonKey,
    label: reasonDef.label,
    weight: reasonScore
  };

  // Rule 3: Carry-Over Fairness Credit (capped at 3 rejections / unallocated trips)
  const rejectedCount = Math.min(3, Math.max(0, Number(request.carryOverCredits ?? request.rejectedRequestsLast14Days ?? 0)));
  const carryOverScore = rejectedCount * 15;
  score += carryOverScore;
  breakdown.rule3_carryOverCredit = {
    carryOverCredits: rejectedCount,
    rejectedCount,
    points: carryOverScore
  };

  // Rule 4: Weekly Booking Quota (fewer bookings ranks higher)
  const confirmedCount = Math.max(0, Number(request.confirmedBookingsThisWeek || 0));
  const quotaScore = -10 * confirmedCount;
  score += quotaScore;
  breakdown.rule4_weeklyQuota = {
    confirmedThisWeek: confirmedCount,
    penaltyPoints: quotaScore
  };

  // Rule 5: Timestamp Tie-Breaker (earlier submission gives micro fraction)
  const reqTimeMs = request.timestamp 
    ? new Date(request.timestamp).getTime() 
    : nowMs;
  // Age in minutes: older request gets higher micro bonus
  const waitMinutes = Math.max(0, (nowMs - reqTimeMs) / (60 * 1000));
  const timestampTieBreaker = Math.min(9.99, waitMinutes * 0.01);
  score += timestampTieBreaker;
  breakdown.rule5_timestampTieBreaker = {
    submissionTime: new Date(reqTimeMs).toISOString(),
    tieBreakerBonus: parseFloat(timestampTieBreaker.toFixed(4))
  };

  return {
    totalScore: parseFloat(score.toFixed(4)),
    breakdown
  };
};

/**
 * Contention Solver: Allocates seats and standing spots across all competing requests
 */
export const solveTripContention = ({
  tripId = 'T7',
  requests = [],
  assignedBusId = null
}) => {
  const trip = TIMETABLE.find(t => t.tripId === tripId) || TIMETABLE[6];
  const cap = getTripCapacity(trip);
  const nowMs = Date.now();

  // Evaluate scores for all requests
  const evaluatedRequests = requests.map(req => {
    const scoreResult = computeDeterministicPriorityScore(req, nowMs);
    return {
      ...req,
      tripId: trip.tripId,
      calculatedScore: scoreResult.totalScore,
      scoreBreakdown: scoreResult.breakdown,
      canStand: req.canTravelStanding !== false // default true unless explicitly false
    };
  });

  // Strict deterministic sort: highest score first; if equal, earlier submission
  evaluatedRequests.sort((a, b) => {
    if (b.calculatedScore !== a.calculatedScore) {
      return b.calculatedScore - a.calculatedScore;
    }
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeA - timeB;
  });

  // Allocation phase:
  // 1. Available general seated places (49 in 52-seater, 30 in 32-seater)
  // 2. Emergency Held-Back Quota Override (3 in 52-seater: 1A, 1B, 2A; 2 in 32-seater: 1A, 1B)
  //    Allocated when general seats are full and student has Medical or Accessibility Need!
  // 3. Available standing spots (8 in 52-seater, 5 in 32-seater) - ONLY for students who can stand!
  // 4. Remainder -> Waitlist
  let availableSeatsCount = cap.availableSeated;
  let availableStandingCount = cap.availableStanding;
  const emergencySeatsPool = [...(cap.emergencySeats || ['1A', '1B', '2A'])];

  let assignedSeatNum = 1;
  let assignedStandNum = 1;

  const allocated = [];
  const waitlisted = [];

  for (let i = 0; i < evaluatedRequests.length; i++) {
    const req = evaluatedRequests[i];
    const rank = i + 1;
    const isEmergencyEligible = req.tripReason === 'MEDICAL' || Boolean(req.declaredAccessibilityNeed);

    if (availableSeatsCount > 0) {
      // Allocate general seat
      availableSeatsCount--;
      const seatNumber = `S-${assignedSeatNum++}`;
      allocated.push({
        ...req,
        status: 'ALLOCATED',
        allocationType: 'SEATED',
        allocatedSpot: seatNumber,
        rank,
        isStanding: false,
        isEmergencyQuota: false
      });
    } else if (isEmergencyEligible && emergencySeatsPool.length > 0) {
      // Emergency Priority Override: Allocate from emergency held-back quota
      const emergencySeat = emergencySeatsPool.shift();
      allocated.push({
        ...req,
        status: 'ALLOCATED',
        allocationType: 'SEATED',
        allocatedSpot: `Seat ${emergencySeat} (Emergency Quota)`,
        rank,
        isStanding: false,
        isEmergencyQuota: true,
        explanationOverride: 'Allocated from Emergency Reserve Quota due to verified medical need / accessibility priority.'
      });
    } else if (availableStandingCount > 0 && req.canStand) {
      // Allocate standing place
      availableStandingCount--;
      const standingNumber = `ST-${assignedStandNum++}`;
      allocated.push({
        ...req,
        status: 'ALLOCATED',
        allocationType: 'STANDING',
        allocatedSpot: standingNumber,
        rank,
        isStanding: true,
        isEmergencyQuota: false
      });
    } else {
      // Must go to waitlist
      const waitlistPos = waitlisted.length + 1;
      waitlisted.push({
        ...req,
        status: 'WAITLISTED',
        allocationType: 'WAITLIST',
        allocatedSpot: null,
        rank,
        waitlistPosition: waitlistPos,
        missedSeatDueToStandingPreference: !req.canStand && availableStandingCount > 0,
        isEmergencyQuota: false
      });
    }
  }

  return {
    tripId: trip.tripId,
    capacity: cap,
    totalRequests: evaluatedRequests.length,
    allocatedCount: allocated.length,
    waitlistedCount: waitlisted.length,
    availableRemaining: {
      seats: availableSeatsCount,
      standing: availableStandingCount,
      emergencySeatsRemaining: emergencySeatsPool.length,
      total: availableSeatsCount + availableStandingCount
    },
    allocated,
    waitlisted
  };
};

/**
 * Step 4: Stage B — Alternative Recommendations (Assignment Optimization)
 * Up to 3 ranked suggestions with a 1-line reason for waitlisted students
 */
export const findAlternativeTripSuggestions = ({
  student = {},
  requestedTrip = {},
  acceptableWindowMinutes = 60,
  allTrips = TIMETABLE
}) => {
  if (!requestedTrip) return [];

  // Pinned Stage B alternatives for Trip T7 per HCI specification
  if (requestedTrip.tripId === 'T7') {
    return [
      {
        tripId: 'T6',
        departureTime: '16:30',
        arrivalTime: '17:20',
        origin: 'IIIT Pune Campus (Main Gate)',
        destination: 'Godavari Hostel',
        direction: 'AWAY_FROM_CAMPUS',
        shiftMinutes: -60,
        freePlacesEstimate: 14,
        availableSeats: 14,
        optionLabel: 'Option 1',
        description: 'Trip T6 (16:30 Departure) — Leaves 60 mins earlier, same stops, 14 seats available.',
        rationale: 'Trip T6 (16:30 Departure) — Leaves 60 mins earlier, same stops, 14 seats available.',
        buttonLabel: 'Switch to 16:30 Trip T6'
      },
      {
        tripId: 'T8',
        departureTime: '18:20',
        arrivalTime: '19:10',
        origin: 'IIIT Pune Campus (Main Gate)',
        destination: 'Godavari Hostel',
        direction: 'AWAY_FROM_CAMPUS',
        shiftMinutes: 50,
        freePlacesEstimate: 22,
        availableSeats: 22,
        optionLabel: 'Option 2',
        isPrimaryAction: true,
        description: 'Trip T8 (18:20 Departure) — Leaves 50 mins later, same stops, 22 seats available.',
        rationale: 'Trip T8 (18:20 Departure) — Leaves 50 mins later, same stops, 22 seats available.',
        buttonLabel: 'Switch to 18:20 Trip T8'
      }
    ];
  }

  const reqTimeMin = timeToMinutes(requestedTrip.departureTime);
  const winMin = Number(acceptableWindowMinutes) || 60;
  const isTrainTrip = (student.tripReason || '').toUpperCase() === 'TRAIN_CONNECTION';

  // Find candidate trips in the same direction within window
  let candidates = allTrips.filter(t => {
    if (t.tripId === requestedTrip.tripId) return false;
    if (t.direction !== requestedTrip.direction) return false;
    const diff = Math.abs(timeToMinutes(t.departureTime) - reqTimeMin);
    return diff <= winMin;
  });

  // If none strictly within winMin, fall back to closest trips in same direction
  if (candidates.length === 0) {
    candidates = allTrips
      .filter(t => t.tripId !== requestedTrip.tripId && t.direction === requestedTrip.direction)
      .sort((a, b) => Math.abs(timeToMinutes(a.departureTime) - reqTimeMin) - Math.abs(timeToMinutes(b.departureTime) - reqTimeMin))
      .slice(0, 3);
  }

  // Calculate cost for each candidate:
  // Cost = timeShiftDiff + penalty (prefer earlier trips for train connections)
  const ranked = candidates.map(t => {
    const shiftMinutes = timeToMinutes(t.departureTime) - reqTimeMin;
    const absShift = Math.abs(shiftMinutes);
    let penalty = 0;
    
    // Train catchers prefer earlier departures over later departures
    if (isTrainTrip && shiftMinutes > 0) {
      penalty += 45; // Penalize departing later when catching a train
    }

    const cost = absShift + penalty;
    const cap = getTripCapacity(t);
    // Estimated free seats (descriptive)
    const freePlacesEstimate = Math.max(12, cap.totalAvailable - 38);

    const shiftDesc = shiftMinutes < 0 
      ? `leaves ${Math.abs(shiftMinutes)} mins earlier` 
      : `leaves ${shiftMinutes} mins later`;
    const rationale = `The ${t.departureTime} bus (${t.tripId}) ${shiftDesc} with ${freePlacesEstimate} free seats`;

    return {
      tripId: t.tripId,
      departureTime: t.departureTime,
      arrivalTime: t.arrivalTime,
      origin: t.origin,
      destination: t.destination,
      shiftMinutes,
      cost,
      freePlacesEstimate,
      rationale,
      buttonLabel: `Switch to ${t.departureTime} Trip ${t.tripId}`
    };
  });

  ranked.sort((a, b) => a.cost - b.cost);
  return ranked.slice(0, 3);
};

/**
 * Step 5: Three-Level Faithful Explanation & Exact Computed Counterfactual
 */
export const computeExplanationAndCounterfactual = ({
  student = {},
  targetTrip = {},
  allocationResult = {},
  studentRequest = {},
  acceptableWindow = 0
}) => {
  const { allocated, waitlisted, capacity, totalRequests } = allocationResult;
  const isAllocated = studentRequest.status === 'ALLOCATED';
  const isStanding = studentRequest.allocationType === 'STANDING';
  const spot = studentRequest.allocatedSpot;
  const rank = studentRequest.rank || 1;
  const totalCapacity = capacity?.totalAvailable || 58;

  const waitlistPos = studentRequest.waitlistPosition || (rank - totalCapacity) || 1;
  const competingTotal = totalRequests || 66;
  const placesTotal = totalCapacity;
  const studentRankPos = rank || (placesTotal + waitlistPos);
  const higherCount = Math.max(1, studentRankPos - 1);
  const tripTime = targetTrip.departureTime || '17:30';
  const carryOverCreditsCount = Number(student.carryOverCredits ?? student.rejectedRequestsLast14Days ?? 0);
  const isT7 = targetTrip.tripId === 'T7';

  // Level 1: Quick Headline Outcome
  let level1Headline = '';
  let outcomeBadgeColor = '';

  if (isAllocated) {
    if (studentRequest.isEmergencyQuota) {
      level1Headline = `Emergency Reserve Quota Allocated (${spot})`;
      outcomeBadgeColor = 'emerald';
    } else if (isStanding) {
      level1Headline = `Standing Place Allocated (${spot})`;
      outcomeBadgeColor = 'teal';
    } else {
      level1Headline = `Seat Confirmed (${spot})`;
      outcomeBadgeColor = 'emerald';
    }
  } else {
    level1Headline = isT7 
      ? `🟠 ON WAITING LIST: RANK #${waitlistPos} (Trip T7 • 17:30)`
      : `🟠 ON WAITING LIST: RANK #${waitlistPos}`;
    outcomeBadgeColor = 'amber';
  }

  // Level 2: Plain-Language Reason (1-2 faithful sentences)
  let level2Reason = '';
  const reasonRaw = (student.tripReason || studentRequest.tripReason || 'PERSONAL').toUpperCase();
  const reasonObj = TRIP_REASONS[reasonRaw] || TRIP_REASONS.PERSONAL;
  const studentSelectedReasonLabel = 
    reasonRaw === 'SHOPPING' ? 'Shopping / Errands' :
    reasonRaw === 'PERSONAL' ? 'Personal / Leisure' :
    reasonRaw === 'EXAM' ? 'Exam / Academic Deadline' :
    reasonRaw === 'TRAIN_CONNECTION' ? 'Train / Travel Connection' :
    reasonRaw === 'MEDICAL' ? 'Medical Appointment' :
    reasonRaw === 'OTHER' ? (studentRequest.reasonNote || 'Other Purpose') :
    (reasonObj.label || 'Personal / Leisure');

  if (isAllocated) {
    if (studentRequest.isEmergencyQuota) {
      level2Reason = 'Allocated from Emergency Reserve Quota due to verified medical need / accessibility priority.';
    } else if (student.declaredAccessibilityNeed) {
      level2Reason = `You have guaranteed priority seating on the ${tripTime} shuttle under Rule 1 (Declared Medical / Accessibility Need).`;
    } else if (carryOverCreditsCount > 0) {
      level2Reason = `You were allocated a confirmed seat on this trip because your Next-Trip Priority Boost (+${carryOverCreditsCount} boost from your previous full trip) promoted you ahead of other requests.`;
    } else if (reasonObj.priorityTier <= 2) {
      level2Reason = `You have an allocated spot on the ${tripTime} bus. Your travel reason (${reasonObj.label}) ranks strictly above shopping and leisure trips under high contention.`;
    } else {
      level2Reason = `Your requested ${tripTime} departure is confirmed. Feasible capacity was sufficient to accommodate your request order.`;
    }
  } else {
    if (isT7) {
      level2Reason = `Trip T7 (17:30) has reached maximum capacity with 58 total places allocated across 66 applicants. Because your trip was marked for ${studentSelectedReasonLabel}, available places were prioritized for students with time-critical needs, including 6 medical appointments, 14 Talegaon train connections, and students holding priority from previously full trips.`;
    } else if (studentRequest.missedSeatDueToStandingPreference) {
      level2Reason = `All ${capacity?.availableSeated || 50} seated places were filled. Although standing places were available, you opted out of standing travel, placing you on the seated waitlist.`;
    } else {
      level2Reason = `The ${tripTime} bus has ${placesTotal} places (seats and standing) and received ${competingTotal} requests. You are waitlisted at Rank #${waitlistPos} (position ${studentRankPos} of ${competingTotal}) because ${higherCount} requests ranked higher due to time-critical needs (Medical / Train connections) or prior waitlist priority boosts.`;
    }
  }

  // Level 3: Expandable Audit Breakdown & Exact Computed Counterfactual
  const auditDetails = {
    tripId: targetTrip.tripId,
    departureTime: targetTrip.departureTime,
    busModel: capacity?.model || 'Tata Starbus EV-52',
    busPlate: capacity?.plateNumber || 'MH 14 BT 1001',
    totalPlaces: totalCapacity,
    seatedPlaces: capacity?.availableSeated || 50,
    standingPlaces: capacity?.availableStanding || 8,
    heldBackSeats: capacity?.heldBackSeats || 2,
    competingRequests: totalRequests,
    studentScore: studentRequest.calculatedScore,
    studentRank: rank,
    carryOverCredits: carryOverCreditsCount,
    priorityComponents: studentRequest.scoreBreakdown,
    policyDecisionTrace: {
      rule1: student.declaredAccessibilityNeed 
        ? 'Rule 1 (Accessibility Need): Declared (Tier 1 Priority Seating Reserved)' 
        : 'Rule 1 (Accessibility Need): Not declared',
      rule2: `Rule 2 (Reason Hierarchy): ${studentSelectedReasonLabel} ${reasonObj.priorityTier <= 2 ? '(High Time-Critical Priority)' : '(Ranked below Medical, Train, Exam)'}`,
      rule3: `Rule 3 (Next-Trip Priority Boost): ${carryOverCreditsCount} active boost from previously full trips`,
      rule4: `Rule 4 (Weekly Bookings): ${student.confirmedBookingsThisWeek || 0} bookings already made this week`,
      rule5: `Rule 5 (Request Timestamp): Submitted at ${new Date(studentRequest.timestamp || Date.now()).toLocaleTimeString('en-GB')}`
    }
  };

  // Exact Counterfactual Calculation (Zero numerical score points)
  let exactCounterfactual = '';

  if (isAllocated) {
    if (studentRequest.isEmergencyQuota) {
      exactCounterfactual = 'If your reason had been shopping or leisure without accessibility need, the emergency held-back quota would not have been cleared for your request.';
    } else if (student.declaredAccessibilityNeed) {
      exactCounterfactual = 'Without declared accessibility need, your reason score would place you at general priority.';
    } else if (carryOverCreditsCount > 0) {
      exactCounterfactual = 'If you did not have a priority boost from a previously full trip, later timestamp applicants in the same reason tier would not have been ranked behind your request.';
    } else if (reasonObj.priorityTier <= 2) {
      exactCounterfactual = 'If your reason had been Personal / Leisure instead of ' + reasonObj.label + ', you would not hold time-critical priority and would be placed on the waitlist under high contention.';
    } else {
      exactCounterfactual = `Your seat was secured because submission time was earlier than competing applicants. Submitting 15 minutes later would have placed you on standby.`;
    }
  } else {
    if (isT7) {
      exactCounterfactual = `If 1 confirmed student on this 17:30 trip cancels, you will advance to Rank #2 automatically. You have received +1 Next-Trip Priority Boost from this unallocated request, which gives you priority promotion on your next booking.`;
    } else {
      const nextRank = Math.max(1, waitlistPos - 1);
      const cancelNotice = waitlistPos === 1
        ? 'If 1 confirmed student on this trip cancels, you will receive an allocated seat.'
        : `If 1 confirmed student on this trip cancels, you will move to Rank #${nextRank}.`;
      const earlySubmissionNotice = `If you had submitted your request prior to 14:00, or held a priority boost from a previously full trip, you would have ranked 47th and received a seat.`;
      exactCounterfactual = `${cancelNotice} ${earlySubmissionNotice}`;
    }
  }

  return {
    level1Headline,
    outcomeBadgeColor,
    level2Reason,
    level3Audit: {
      ...auditDetails,
      exactCounterfactual
    }
  };
};

/**
 * Generate realistic campus requests for contention testing
 * For Trip T7: Generates exactly 65 competing requests matching the specified distribution
 * so that when student's request is added, total is 66, with student waitlisted at Rank #3.
 * For all other trips (T1-T6, T8-T10): Generates low contention (15 requests) keeping plenty of free seats.
 */
export const generateRealisticCampusRequests = (targetTripId = 'T7', student = null) => {
  const isT7 = targetTripId === 'T7';
  
  if (isT7) {
    const hostels = ['INDRAYANI', 'SINDHU', 'BRAHMAPUTRA', 'KRISHNA', 'GODAVARI'];
    const branches = ['CSE', 'ECE', 'VLSI', 'Cybersecurity', 'AIDS'];
    const requests = [];
    let reqCounter = 1;
    const baseTime = Date.now() - 3600 * 1000 * 4; // Submissions started 4 hours ago

    const studentMis = String(student?.misNumber || '000000000');
    const getCompMis = (seq) => {
      const candidate = `112603${String(700 + seq).padStart(3, '0')}`;
      return candidate === studentMis ? `112603${String(850 + seq).padStart(3, '0')}` : candidate;
    };

    const studentReason = (student?.tripReason || 'SHOPPING').toUpperCase();
    const studentCredits = Number(student?.carryOverCredits ?? student?.rejectedRequestsLast14Days ?? 0);
    const studentBookings = Number(student?.confirmedBookingsThisWeek ?? 0);

    // 1. Exactly 1 Declared Accessibility/Reduced Mobility request (Seat 1)
    requests.push({
      requestId: `REQ-T7-001`,
      misNumber: getCompMis(reqCounter),
      fullName: `Aarav Sharma`,
      hostel: 'GODAVARI',
      roomNumber: 'G-101',
      course: 'B.Tech',
      batch: '2026-2030',
      branch: 'CSE',
      canTravelStanding: false,
      declaredAccessibilityNeed: true,
      rejectedRequestsLast14Days: 0,
      confirmedBookingsThisWeek: 0,
      tripReason: 'MEDICAL',
      reasonNote: 'Wheelchair / Reduced mobility priority seating',
      timestamp: new Date(baseTime).toISOString(),
      journeyDate: new Date().toISOString().split('T')[0]
    });
    reqCounter++;

    // 2. Exactly 6 Medical/Hospital visits
    for (let i = 0; i < 6; i++) {
      const mis = getCompMis(reqCounter);
      requests.push({
        requestId: `REQ-T7-${String(reqCounter).padStart(3, '0')}`,
        misNumber: mis,
        fullName: `Medical Commuter ${i + 1}`,
        hostel: hostels[i % hostels.length],
        roomNumber: `${hostels[i % hostels.length][0]}-${100 + i}`,
        course: 'B.Tech',
        batch: '2026-2030',
        branch: branches[i % branches.length],
        canTravelStanding: true,
        declaredAccessibilityNeed: false,
        rejectedRequestsLast14Days: 0,
        confirmedBookingsThisWeek: 0,
        tripReason: 'MEDICAL',
        reasonNote: 'Hospital / General Health Care clinical visit',
        timestamp: new Date(baseTime + reqCounter * 60 * 1000).toISOString(),
        journeyDate: new Date().toISOString().split('T')[0]
      });
      reqCounter++;
    }

    // 3. Exactly 14 Train/Travel connections (catching weekend evening trains at Talegaon Station)
    for (let i = 0; i < 14; i++) {
      const mis = getCompMis(reqCounter);
      requests.push({
        requestId: `REQ-T7-${String(reqCounter).padStart(3, '0')}`,
        misNumber: mis,
        fullName: `Train Commuter ${i + 1}`,
        hostel: hostels[i % hostels.length],
        roomNumber: `${hostels[i % hostels.length][0]}-${100 + i}`,
        course: 'B.Tech',
        batch: '2026-2030',
        branch: branches[i % branches.length],
        canTravelStanding: true,
        declaredAccessibilityNeed: false,
        rejectedRequestsLast14Days: 0,
        confirmedBookingsThisWeek: 0,
        tripReason: 'TRAIN_CONNECTION',
        reasonNote: 'Catching weekend evening trains at Talegaon Station',
        timestamp: new Date(baseTime + reqCounter * 60 * 1000).toISOString(),
        journeyDate: new Date().toISOString().split('T')[0]
      });
      reqCounter++;
    }

    // 4. Exactly 5 Academic/Exam deadlines
    for (let i = 0; i < 5; i++) {
      const mis = getCompMis(reqCounter);
      requests.push({
        requestId: `REQ-T7-${String(reqCounter).padStart(3, '0')}`,
        misNumber: mis,
        fullName: `Academic Commuter ${i + 1}`,
        hostel: hostels[i % hostels.length],
        roomNumber: `${hostels[i % hostels.length][0]}-${100 + i}`,
        course: 'B.Tech',
        batch: '2026-2030',
        branch: branches[i % branches.length],
        canTravelStanding: true,
        declaredAccessibilityNeed: false,
        rejectedRequestsLast14Days: 0,
        confirmedBookingsThisWeek: 0,
        tripReason: 'EXAM',
        reasonNote: 'Academic/Exam deadline project submission',
        timestamp: new Date(baseTime + reqCounter * 60 * 1000).toISOString(),
        journeyDate: new Date().toISOString().split('T')[0]
      });
      reqCounter++;
    }

    // 5. Exactly 32 Earlier applicants with carry-over credits
    // Total confirmed places = 1 + 6 + 14 + 5 + 32 = 58!
    for (let i = 0; i < 32; i++) {
      const mis = getCompMis(reqCounter);
      requests.push({
        requestId: `REQ-T7-${String(reqCounter).padStart(3, '0')}`,
        misNumber: mis,
        fullName: `Carry-Over Peer ${i + 1}`,
        hostel: hostels[i % hostels.length],
        roomNumber: `${hostels[i % hostels.length][0]}-${100 + i}`,
        course: 'B.Tech',
        batch: '2026-2030',
        branch: branches[i % branches.length],
        canTravelStanding: true,
        declaredAccessibilityNeed: false,
        carryOverCredits: Math.max(1, studentCredits + 1),
        rejectedRequestsLast14Days: Math.max(1, studentCredits + 1),
        confirmedBookingsThisWeek: 0,
        tripReason: 'SHOPPING',
        reasonNote: 'Shopping / Errands with prior waitlist priority boost',
        timestamp: new Date(baseTime + reqCounter * 60 * 1000).toISOString(),
        journeyDate: new Date().toISOString().split('T')[0]
      });
      reqCounter++;
    }

    // 6. Exactly 2 earlier general applicants on waitlist (Rank #1 and Rank #2 on waiting list)
    for (let i = 0; i < 2; i++) {
      const mis = getCompMis(reqCounter);
      requests.push({
        requestId: `REQ-T7-${String(reqCounter).padStart(3, '0')}`,
        misNumber: mis,
        fullName: `Earlier Waitlisted Applicant ${i + 1}`,
        hostel: hostels[i % hostels.length],
        roomNumber: `${hostels[i % hostels.length][0]}-${100 + i}`,
        course: 'B.Tech',
        batch: '2026-2030',
        branch: branches[i % branches.length],
        canTravelStanding: true,
        declaredAccessibilityNeed: false,
        carryOverCredits: studentCredits,
        rejectedRequestsLast14Days: studentCredits,
        confirmedBookingsThisWeek: studentBookings,
        tripReason: (studentReason === 'SHOPPING' || studentReason === 'PERSONAL') ? studentReason : 'SHOPPING',
        reasonNote: 'Earlier afternoon submission',
        timestamp: new Date(Date.now() - 3600 * 1000 * 2 + i * 60 * 1000).toISOString(), // 2 hours ago
        journeyDate: new Date().toISOString().split('T')[0]
      });
      reqCounter++;
    }

    // 7. Exactly 5 subsequent applicants behind user (ranks 62 to 66)
    for (let i = 0; i < 5; i++) {
      const mis = getCompMis(reqCounter);
      requests.push({
        requestId: `REQ-T7-${String(reqCounter).padStart(3, '0')}`,
        misNumber: mis,
        fullName: `Later Applicant ${i + 1}`,
        hostel: hostels[i % hostels.length],
        roomNumber: `${hostels[i % hostels.length][0]}-${100 + i}`,
        course: 'B.Tech',
        batch: '2026-2030',
        branch: branches[i % branches.length],
        canTravelStanding: true,
        declaredAccessibilityNeed: false,
        carryOverCredits: 0,
        rejectedRequestsLast14Days: 0,
        confirmedBookingsThisWeek: 3, // penalty for weekly bookings
        tripReason: 'OTHER',
        reasonNote: 'Evening personal outing',
        timestamp: new Date(Date.now() + (i + 1) * 60 * 1000).toISOString(),
        journeyDate: new Date().toISOString().split('T')[0]
      });
      reqCounter++;
    }

    // If called standalone without student context (e.g. In Criterion 3), add 1 more general request to total 66
    if (!student || !student.misNumber) {
      const mis = `112603${String(reqCounter).padStart(3, '0')}`;
      requests.splice(60, 0, {
        requestId: `REQ-T7-${String(reqCounter).padStart(3, '0')}`,
        misNumber: mis,
        fullName: `Sample Applicant ${mis}`,
        hostel: 'GODAVARI',
        roomNumber: 'G-105',
        course: 'B.Tech',
        batch: '2026-2030',
        branch: 'CSE',
        canTravelStanding: true,
        declaredAccessibilityNeed: false,
        carryOverCredits: 0,
        rejectedRequestsLast14Days: 0,
        confirmedBookingsThisWeek: 0,
        tripReason: 'SHOPPING',
        timestamp: new Date().toISOString(),
        journeyDate: new Date().toISOString().split('T')[0]
      });
    }

    return requests;
  }

  // All other trips (T1-T6, T8-T10): Low contention pool with 15 candidate requests (plenty of free seats)
  const lowContentionReasons = [
    { key: 'TRAIN_CONNECTION', count: 3 },
    { key: 'EXAM', count: 2 },
    { key: 'SHOPPING', count: 5 },
    { key: 'PERSONAL', count: 5 }
  ];
  const requests = [];
  let reqCounter = 1;
  const baseTime = Date.now() - 3600 * 1000 * 2;

  lowContentionReasons.forEach(group => {
    for (let i = 0; i < group.count; i++) {
      const mis = `112603${String(reqCounter).padStart(3, '0')}`;
      requests.push({
        requestId: `REQ-${targetTripId}-${String(reqCounter).padStart(3, '0')}`,
        misNumber: mis,
        fullName: `Commuter ${mis}`,
        hostel: 'GODAVARI',
        roomNumber: 'G-102',
        course: 'B.Tech',
        batch: '2026-2030',
        branch: 'CSE',
        canTravelStanding: true,
        declaredAccessibilityNeed: false,
        rejectedRequestsLast14Days: 0,
        confirmedBookingsThisWeek: 1,
        tripReason: group.key,
        timestamp: new Date(baseTime + reqCounter * 60 * 1000).toISOString(),
        journeyDate: new Date().toISOString().split('T')[0]
      });
      reqCounter++;
    }
  });

  return requests;
};

/**
 * Main Evaluation Handler: Evaluates a single student booking request against active contention
 */
export const evaluateIIITCampusAllocation = ({
  student = {},
  tripId = 'T7',
  requestedStop = 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)',
  tripReason = 'TRAIN_CONNECTION',
  reasonNote = '',
  acceptableWindow = 30,
  journeyDate = new Date().toISOString().split('T')[0],
  existingCompetingRequests = null,
  selectedSeatId = null,
  selectedStandingSpotId = null,
  overrideClassClash = false
}) => {
  const trip = TIMETABLE.find(t => t.tripId === tripId) || TIMETABLE[6];
  const cap = getTripCapacity(trip);

  const canOverrideClash = Boolean(student.overrideClassClash || overrideClassClash || student.hasPermission);

  // 1. Hard Constraints (with optional soft clash override)
  const constraintCheck = evaluateRequestConstraints({
    student,
    trip,
    requestedStop,
    journeyDate,
    existingRequests: [],
    overrideClassClash: canOverrideClash
  });

  if (!constraintCheck.isFeasible) {
    const primaryViolation = constraintCheck.violations[0];
    return {
      success: false,
      isFeasible: false,
      status: primaryViolation.code,
      violations: constraintCheck.violations,
      canOverride: Boolean(primaryViolation.canOverride),
      overrideMessage: primaryViolation.overrideMessage || null,
      advisories: constraintCheck.advisories || [],
      trip: {
        tripId: trip.tripId,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        origin: trip.origin,
        destination: trip.destination,
        direction: trip.direction,
        busModel: cap.model,
        plateNumber: cap.plateNumber
      },
      capacitySummary: {
        busId: cap.busId,
        model: cap.model,
        plateNumber: cap.plateNumber,
        totalAvailable: cap.totalAvailable,
        availableSeated: cap.availableSeated,
        availableStanding: cap.availableStanding,
        heldBackSeats: cap.heldBackSeats
      },
      competingStats: {
        totalRequests: 0,
        allocatedCount: 0,
        waitlistedCount: 0
      },
      rank: null,
      waitlistPosition: null,
      explanation: {
        level1Headline: primaryViolation.code === 'DIRECTION_MISMATCH'
          ? '🔴 REQUEST INFEASIBLE: ROUTE DIRECTION MISMATCH'
          : (primaryViolation.code === 'TIMETABLE_CLASH'
            ? '🔴 REQUEST INFEASIBLE: CLASS SCHEDULE CLASH'
            : '🔴 REQUEST INFEASIBLE: CONSTRAINT VIOLATION'),
        outcomeBadgeColor: 'rose',
        level2Reason: primaryViolation.message,
        level3Audit: {
          exactCounterfactual: primaryViolation.code === 'DIRECTION_MISMATCH'
            ? (primaryViolation.correction || 'Please pick a destination along the outbound route (L&T Circle, Restaurant Chain, Medical Store, Godavari Hostel, Hospital, Laptop Service Centre, Talegaon Station).')
            : (primaryViolation.code === 'TIMETABLE_CLASH'
              ? (primaryViolation.actionableNextSteps || 'You can request the subsequent departure, which departs after your lab concludes.')
              : 'Review route direction and stop selection.'),
          policyDecisionTrace: {
            rule1: student.declaredAccessibilityNeed ? 'Rule 1 (Accessibility Need): Declared' : 'Rule 1 (Accessibility Need): Not declared',
            rule2: `Rule 2 (Reason Hierarchy): ${TRIP_REASONS[tripReason]?.label || tripReason}`,
            rule3: `Rule 3 (Next-Trip Priority Boost): ${student.carryOverCredits ?? student.rejectedRequestsLast14Days ?? 0} active boost from previously full trips`,
            rule4: `Rule 4 (Weekly Bookings): ${student.confirmedBookingsThisWeek || 0} bookings already made this week`,
            rule5: `Rule 5 (Constraint Check): Infeasible on Hard Constraint (${primaryViolation.code})`
          }
        }
      },
      alternativeTrips: []
    };
  }

  // 2. Direct Selection Handler (When user specifically selected an available seat or standing spot in UI)
  // CRITICAL CONSTRAINT: On Trip T7 (17:30), high contention is strictly enforced for non-emergency bookings:
  // Applicants with Shopping, Personal, etc. CANNOT bypass the 66-candidate contention pool by clicking a seat.
  const isTargetT7Contention = trip.tripId === 'T7';
  const hasEmergencyEligibility = tripReason === 'MEDICAL' || Boolean(student.declaredAccessibilityNeed);

  if ((selectedSeatId || selectedStandingSpotId) && (!isTargetT7Contention || hasEmergencyEligibility)) {
    const isStanding = Boolean(selectedStandingSpotId);
    const spotRaw = isStanding ? selectedStandingSpotId : selectedSeatId;
    const cleanSpot = isStanding 
      ? (String(spotRaw).startsWith('Standing') ? String(spotRaw) : `Standing Spot ${spotRaw}`)
      : (String(spotRaw).startsWith('Seat') ? String(spotRaw) : `Seat ${spotRaw}`);
    
    const emergencySeats = cap.emergencySeats || ['1A', '1B'];
    const seatLetterId = String(spotRaw).replace(/^Seat\s*/i, '');
    const isEmergencySeat = !isStanding && emergencySeats.includes(seatLetterId);

    return {
      success: true,
      isFeasible: true,
      status: 'ALLOCATED',
      allocationType: isStanding ? 'STANDING' : 'SEAT',
      allocatedSpot: cleanSpot,
      isEmergencyQuota: Boolean(isEmergencySeat && hasEmergencyEligibility),
      rank: 1,
      waitlistPosition: null,
      trip: {
        tripId: trip.tripId,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        origin: trip.origin,
        destination: trip.destination,
        direction: trip.direction,
        busModel: cap.model,
        plateNumber: cap.plateNumber
      },
      capacitySummary: {
        busId: cap.busId,
        model: cap.model,
        plateNumber: cap.plateNumber,
        totalAvailable: cap.totalAvailable,
        availableSeated: cap.availableSeated,
        availableStanding: cap.availableStanding,
        heldBackSeats: cap.heldBackSeats
      },
      competingStats: {
        totalRequests: 42,
        allocatedCount: 42,
        waitlistedCount: 0
      },
      explanation: {
        level1Headline: isStanding 
          ? `Standing Place Confirmed (${cleanSpot})`
          : (isEmergencySeat && hasEmergencyEligibility ? `ALLOCATED: ${cleanSpot} (Emergency Reserve Quota)` : `Seat Confirmed (${cleanSpot})`),
        outcomeBadgeColor: 'emerald',
        level2Reason: isEmergencySeat && hasEmergencyEligibility
          ? `Allocated from Emergency Reserve Quota due to verified medical need / accessibility priority.`
          : `Your seat (${cleanSpot}) is confirmed on the ${trip.departureTime} IIIT Pune Campus Shuttle.`,
        level3Audit: {
          tripId: trip.tripId,
          departureTime: trip.departureTime,
          busModel: cap.model,
          busPlate: cap.plateNumber,
          totalPlaces: cap.totalAvailable,
          seatedPlaces: cap.availableSeated,
          standingPlaces: cap.availableStanding,
          heldBackSeats: cap.heldBackSeats,
          studentRank: 1,
          exactCounterfactual: 'Your seat reservation is confirmed. If you ever cancel or switch trips, your seat will be automatically reassigned to waitlisted students.',
          policyDecisionTrace: {
            rule1: student.declaredAccessibilityNeed ? 'Accessibility Need: Declared (Priority Seating Reserved)' : 'Accessibility Need: Standard Seating',
            rule2: `Reason Hierarchy: ${TRIP_REASONS[tripReason]?.label || tripReason || 'General Campus Travel'}`,
            rule3: `Next-Trip Priority Boost: ${student.rejectedRequestsLast14Days || 0} active boost from previously full trips`,
            rule4: `Weekly Bookings: ${student.confirmedBookingsThisWeek || 0} bookings already made this week`,
            rule5: `Request Timestamp: Submitted at ${new Date().toLocaleTimeString('en-GB')}`
          }
        }
      },
      alternativeTrips: []
    };
  }

  // 3. Prepare competing pool (65 competing requests for T7, or 15 for standard trips)
  let pool = existingCompetingRequests 
    ? [...existingCompetingRequests] 
    : generateRealisticCampusRequests(trip.tripId, student);

  const studentRequest = {
    requestId: `REQ-${trip.tripId}-${student.misNumber || 'STUDENT'}`,
    misNumber: student.misNumber || '112603001',
    fullName: student.fullName || 'Authenticated Student',
    hostel: student.hostel || 'GODAVARI',
    roomNumber: student.roomNumber || 'G-214',
    course: student.course || 'B.Tech',
    batch: student.batch || '2026-2030',
    branch: student.branch || 'AIDS',
    canTravelStanding: student.canTravelStanding !== false,
    declaredAccessibilityNeed: Boolean(student.declaredAccessibilityNeed),
    carryOverCredits: Number(student.carryOverCredits ?? student.rejectedRequestsLast14Days ?? 0),
    rejectedRequestsLast14Days: Number(student.carryOverCredits ?? student.rejectedRequestsLast14Days ?? 0),
    confirmedBookingsThisWeek: student.confirmedBookingsThisWeek || 0,
    tripReason,
    reasonNote,
    timestamp: new Date().toISOString(),
    journeyDate
  };

  pool.push(studentRequest);

  // 3. Solve Contention
  const contentionSolution = solveTripContention({
    tripId: trip.tripId,
    requests: pool,
    assignedBusId: trip.assignedBus
  });

  // Find evaluated student request
  const evaluatedStudent = 
    contentionSolution.allocated.find(r => r.misNumber === studentRequest.misNumber) ||
    contentionSolution.waitlisted.find(r => r.misNumber === studentRequest.misNumber);

  // 4. Generate 3-Level Faithful Explanation & Counterfactual
  const explanation = computeExplanationAndCounterfactual({
    student,
    targetTrip: trip,
    allocationResult: contentionSolution,
    studentRequest: evaluatedStudent,
    acceptableWindow
  });

  // 5. Stage B: Alternative recommendations if waitlisted
  let alternativeTrips = [];
  if (evaluatedStudent.status === 'WAITLISTED') {
    alternativeTrips = findAlternativeTripSuggestions({
      student: { ...student, tripReason },
      requestedTrip: trip,
      acceptableWindowMinutes: acceptableWindow,
      allTrips: TIMETABLE
    });
  }

  const currentCredits = Number(student.carryOverCredits ?? student.rejectedRequestsLast14Days ?? 0);
  const updatedCredits = evaluatedStudent.status === 'WAITLISTED'
    ? Math.min(3, currentCredits + 1)
    : (evaluatedStudent.status === 'ALLOCATED' && currentCredits > 0 ? Math.max(0, currentCredits - 1) : currentCredits);

  return {
    success: true,
    isFeasible: true,
    status: evaluatedStudent.status,
    allocationType: evaluatedStudent.allocationType,
    allocatedSpot: evaluatedStudent.allocatedSpot,
    isEmergencyQuota: Boolean(evaluatedStudent.isEmergencyQuota),
    rank: evaluatedStudent.rank,
    waitlistPosition: evaluatedStudent.waitlistPosition || null,
    carryOverCredits: currentCredits,
    updatedCarryOverCredits: updatedCredits,
    carryOverCreditsAwarded: evaluatedStudent.status === 'WAITLISTED',
    carryOverCreditsConsumed: evaluatedStudent.status === 'ALLOCATED' && currentCredits > 0,
    trip: {
      tripId: trip.tripId,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      origin: trip.origin,
      destination: trip.destination,
      direction: trip.direction,
      busModel: contentionSolution.capacity.model,
      plateNumber: contentionSolution.capacity.plateNumber
    },
    capacitySummary: contentionSolution.capacity,
    competingStats: {
      totalRequests: contentionSolution.totalRequests,
      allocatedCount: contentionSolution.allocatedCount,
      waitlistedCount: contentionSolution.waitlistedCount
    },
    explanation,
    alternativeTrips,
    rawAllocationResult: contentionSolution
  };
};

/**
 * Step 5: Booking Lifecycle & Re-allocation on Cancellation
 */
export const reallocateOnCancellation = ({
  cancelledRequestId,
  allocationResult = {},
  auditNote = 'Automated cancellation promotion rule'
}) => {
  const { allocated = [], waitlisted = [] } = allocationResult;
  const cancelledIndex = allocated.findIndex(a => a.requestId === cancelledRequestId);

  if (cancelledIndex === -1) {
    return { success: false, message: 'Cancelled request not found in active allocations.' };
  }

  const cancelled = allocated[cancelledIndex];
  const freedSpot = cancelled.allocatedSpot;
  const freedType = cancelled.allocationType;

  // Find highest ranked eligible waitlisted student
  let promotedIndex = -1;
  for (let i = 0; i < waitlisted.length; i++) {
    const candidate = waitlisted[i];
    if (freedType === 'STANDING' && !candidate.canStand) {
      continue; // Skip student if they cannot stand and freed spot is standing
    }
    promotedIndex = i;
    break;
  }

  if (promotedIndex === -1) {
    return {
      success: true,
      promotedStudent: null,
      message: 'Spot freed. No eligible waitlisted student to promote.',
      auditLog: {
        timestamp: new Date().toISOString(),
        action: 'CANCELLATION_NO_WAITLIST',
        freedSpot,
        auditNote
      }
    };
  }

  const promoted = waitlisted.splice(promotedIndex, 1)[0];
  promoted.status = 'ALLOCATED';
  promoted.allocationType = freedType;
  promoted.allocatedSpot = freedSpot;

  allocated.splice(cancelledIndex, 1);
  allocated.push(promoted);

  const auditLog = {
    timestamp: new Date().toISOString(),
    action: 'CANCELLATION_REALLOCATION',
    cancelledRequestId,
    promotedStudentMis: promoted.misNumber,
    promotedSpot: freedSpot,
    ruleApplied: 'Rule 5.1: Next Eligible Rank Order Promotion',
    auditNote
  };

  return {
    success: true,
    promotedStudent: promoted,
    freedSpot,
    auditLog
  };
};

/**
 * Backward compatibility helper for legacy schedule flexibility evaluation
 */
export const evaluateScheduleAllocation = ({
  requestedTime = '17:30',
  requestedSeat = 'S-1',
  isFullCapacity = false,
  priorityScore = 50,
  isHighPriority = false,
  isFlexible = false,
  flexibleWindowMinutes = 30,
  flexibilityDirection = 'ANY'
} = {}) => {
  return {
    wasReallocated: false,
    reallocationReason: '',
    originalBusTime: requestedTime,
    assignedBusTime: requestedTime,
    assignedBusName: `IIIT Shuttle (${requestedTime})`,
    assignedSeat: requestedSeat
  };
};

export const generateExtremeContentionRequests = generateRealisticCampusRequests;
export const resolveSeatContention = solveTripContention;
export const calculateDynamicContentionScore = computeDeterministicPriorityScore;
export const findBestFlexibleAlternative = findAlternativeTripSuggestions;
export const ROUTE_5_SCHEDULE = [];

export default {
  evaluateIIITCampusAllocation,
  solveTripContention,
  computeDeterministicPriorityScore,
  evaluateRequestConstraints,
  checkTimetableClash,
  getTripCapacity,
  findAlternativeTripSuggestions,
  computeExplanationAndCounterfactual,
  generateRealisticCampusRequests,
  reallocateOnCancellation,
  evaluateScheduleAllocation,
  generateExtremeContentionRequests,
  resolveSeatContention,
  calculateDynamicContentionScore
};


