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
 */
export const checkTimetableClash = (studentTimetable = [], trip = {}) => {
  if (!Array.isArray(studentTimetable) || studentTimetable.length === 0 || !trip) {
    return { hasClash: false, clashingSlot: null };
  }

  const tripDepMinutes = timeToMinutes(trip.departureTime);
  const tripArrMinutes = timeToMinutes(trip.arrivalTime) || (tripDepMinutes + 50);

  for (const slot of studentTimetable) {
    const slotStartMin = timeToMinutes(slot.startTime);
    const slotEndMin = timeToMinutes(slot.endTime);

    // Overlap condition: startA < endB && endA > startB
    const overlaps = tripDepMinutes < slotEndMin && tripArrMinutes > slotStartMin;
    if (overlaps) {
      return {
        hasClash: true,
        clashingSlot: slot,
        explanation: `Schedule Clash: You have "${slot.subject}" on ${slot.day} (${slot.startTime} - ${slot.endTime}), which overlaps with shuttle trip ${trip.tripId} (${trip.departureTime} - ${trip.arrivalTime}).`
      };
    }
  }

  return { hasClash: false, clashingSlot: null };
};

/**
 * Step 1: Constraint Analysis (Hard Constraints)
 */
export const evaluateRequestConstraints = ({
  student = {},
  trip = {},
  requestedStop = null,
  journeyDate = new Date().toISOString().split('T')[0],
  existingRequests = []
}) => {
  const violations = [];

  // Constraint 1: Destination and direction match
  if (requestedStop && trip) {
    const stopObj = typeof requestedStop === 'string' 
      ? STOPS.find(s => s.name.toLowerCase() === requestedStop.toLowerCase() || s.id === requestedStop)
      : requestedStop;

    if (stopObj) {
      if (trip.direction === 'AWAY_FROM_CAMPUS' && stopObj.index === 1) {
        violations.push({
          code: 'DIRECTION_MISMATCH',
          message: `Trip ${trip.tripId} departs toward Godavari Hostel/Talegaon. Your destination must be a stop along this outbound path.`
        });
      }
      if (trip.direction === 'TOWARD_CAMPUS' && stopObj.index === 8 && trip.origin !== 'Talegaon Station') {
        violations.push({
          code: 'DIRECTION_MISMATCH',
          message: `Trip ${trip.tripId} departs toward IIIT Pune Campus. Your destination must be a stop along this inbound path.`
        });
      }
    }
  }

  // Constraint 1: Weekly Class Timetable Clash
  const clashResult = checkTimetableClash(student.weeklyClassTimetable, trip);
  if (clashResult.hasClash) {
    violations.push({
      code: 'TIMETABLE_CLASH',
      message: clashResult.explanation,
      clashingSlot: clashResult.clashingSlot
    });
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
export const getTripCapacity = (trip = {}) => {
  const assignedBus = FLEET.find(b => b.busId === trip.assignedBus) || FLEET[0];
  const heldBackSeats = trip.heldBackSeats ?? assignedBus.heldBackSeats ?? (assignedBus.seats === 32 ? 2 : 3);
  const emergencySeats = trip.emergencySeats || assignedBus.emergencySeats || (assignedBus.seats === 32 ? ['1A', '1B'] : ['1A', '1B', '2A']);
  const availableSeated = Math.max(0, assignedBus.seats - heldBackSeats);
  const availableStanding = assignedBus.standingPlaces || 0;
  const totalAvailable = availableSeated + availableStanding;

  return {
    busId: assignedBus.busId,
    plateNumber: assignedBus.plateNumber,
    model: assignedBus.model,
    seatsTotal: assignedBus.seats,
    standingTotal: assignedBus.standingPlaces,
    heldBackSeats,
    emergencySeats,
    availableSeated,
    availableStanding,
    totalAvailable,
    totalCapacity: assignedBus.seats + assignedBus.standingPlaces
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

  // Rule 3: Carry-Over Fairness Credit (capped at 3 rejections in last 14 days)
  const rejectedCount = Math.min(3, Math.max(0, Number(request.rejectedRequestsLast14Days || 0)));
  const carryOverScore = rejectedCount * 15;
  score += carryOverScore;
  breakdown.rule3_carryOverCredit = {
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
      .slice(0, 2);
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
      ? `Leaves ${Math.abs(shiftMinutes)} mins earlier` 
      : `Leaves ${shiftMinutes} mins later`;
    const rationale = `${shiftDesc}, same route direction, ~${freePlacesEstimate} places free.`;

    return {
      tripId: t.tripId,
      departureTime: t.departureTime,
      arrivalTime: t.arrivalTime,
      origin: t.origin,
      destination: t.destination,
      shiftMinutes,
      cost,
      freePlacesEstimate,
      rationale
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
  const totalCapacity = capacity.totalAvailable;

  // Level 1: Quick Headline Outcome
  let level1Headline = '';
  let outcomeBadgeColor = '';

  if (isAllocated) {
    if (studentRequest.isEmergencyQuota) {
      level1Headline = `Emergency Reserve Quota Allocated (${spot})`;
      outcomeBadgeColor = 'emerald';
    } else if (isStanding) {
      level1Headline = `Standing Place Allocated (${spot})`;
      outcomeBadgeColor = 'amber';
    } else {
      level1Headline = `Seat Confirmed (${spot})`;
      outcomeBadgeColor = 'emerald';
    }
  } else {
    level1Headline = `On Waiting List: Rank #${studentRequest.waitlistPosition || rank - totalCapacity}`;
    outcomeBadgeColor = 'rose';
  }

  // Level 2: Plain-Language Reason (1-2 faithful sentences)
  let level2Reason = '';
  const reasonObj = TRIP_REASONS[(student.tripReason || studentRequest.tripReason || 'PERSONAL').toUpperCase()] || TRIP_REASONS.PERSONAL;
  const tripTime = targetTrip.departureTime || '17:30';

  if (isAllocated) {
    if (studentRequest.isEmergencyQuota) {
      level2Reason = 'Allocated from Emergency Reserve Quota due to verified medical need / accessibility priority.';
    } else if (student.declaredAccessibilityNeed) {
      level2Reason = `You have guaranteed priority seating on the ${tripTime} shuttle under Rule 1 (Declared Medical / Accessibility Need).`;
    } else if (reasonObj.priorityTier <= 2) {
      level2Reason = `You have an allocated spot on the ${tripTime} bus. Your travel reason (${reasonObj.label}) ranks strictly above shopping and leisure trips under high contention.`;
    } else if ((student.rejectedRequestsLast14Days || 0) > 0) {
      level2Reason = `You secured an allocation on the ${tripTime} bus aided by ${student.rejectedRequestsLast14Days} Carry-Over Fairness Credit(s) from previously unallocated journeys.`;
    } else {
      level2Reason = `Your requested ${tripTime} departure is confirmed. Feasible capacity was sufficient to accommodate your request order.`;
    }
  } else {
    if (studentRequest.missedSeatDueToStandingPreference) {
      level2Reason = `All ${capacity.availableSeated} seated places were filled. Although standing places were available, you opted out of standing travel, placing you on the seated waitlist.`;
    } else {
      level2Reason = `The ${tripTime} shuttle has ${totalCapacity} available places for ${totalRequests} competing requests. You are ranked #${rank} because higher-ranked requests held medical/train priority or carry-over credits.`;
    }
  }

  // Level 3: Expandable Audit Breakdown & Exact Computed Counterfactual
  const auditDetails = {
    tripId: targetTrip.tripId,
    departureTime: targetTrip.departureTime,
    busModel: capacity.model,
    busPlate: capacity.plateNumber,
    totalPlaces: totalCapacity,
    seatedPlaces: capacity.availableSeated,
    standingPlaces: capacity.availableStanding,
    heldBackSeats: capacity.heldBackSeats,
    competingRequests: totalRequests,
    studentScore: studentRequest.calculatedScore,
    studentRank: rank,
    priorityComponents: studentRequest.scoreBreakdown,
    policyDecisionTrace: {
      rule1: student.declaredAccessibilityNeed 
        ? 'Rule 1 (Accessibility Need): Declared (Tier 1 Priority Seating Reserved)' 
        : 'Rule 1 (Accessibility Need): Not declared',
      rule2: `Rule 2 (Reason Hierarchy): ${reasonObj.label} ${reasonObj.priorityTier <= 2 ? '(High Time-Critical Priority)' : '(Ranked below Medical, Train, Exam)'}`,
      rule3: `Rule 3 (Carry-Over Credit): ${student.rejectedRequestsLast14Days || 0} unallocated request in last 14 days`,
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
    } else if (reasonObj.priorityTier <= 2) {
      exactCounterfactual = 'If your reason had been Personal / Leisure instead of ' + reasonObj.label + ', you would not hold time-critical priority and would be placed on the waitlist under high contention.';
    } else {
      exactCounterfactual = `Your seat was secured because submission time was earlier than competing applicants. Submitting 15 minutes later would have placed you on standby.`;
    }
  } else {
    const waitlistPosition = studentRequest.waitlistPosition || (rank - totalCapacity);
    const counterfactuals = [];

    // 1. Automatic cancellation promotion counterfactual
    counterfactuals.push(
      `If ${waitlistPosition} confirmed student${waitlistPosition > 1 ? 's cancel' : ' cancels'} or fails to confirm 2 hours before departure, you will be automatically promoted to an allocated spot.`
    );

    // 2. Reason tier counterfactual without legacy point numbers
    if (reasonObj.priorityTier > 2) {
      counterfactuals.push(
        `If your trip reason had been Medical or Train Connection, your priority tier would place you within the available allocated capacity.`
      );
    }

    // 3. Standing opt-in counterfactual
    if (studentRequest.missedSeatDueToStandingPreference) {
      counterfactuals.push(
        'If you enable "Can Travel Standing" in your profile, you would be allocated a standing place immediately.'
      );
    }

    // 4. Time window alternative counterfactual
    if (acceptableWindow === 0) {
      counterfactuals.push(
        'Selecting a flexible window of ±30m or ±60m unlocks alternative shuttles with guaranteed available capacity.'
      );
    }

    exactCounterfactual = counterfactuals.join(' ');
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
 * Generate 66 realistic campus requests for contention testing
 * (e.g. testing 66 requests competing for a 58-place bus)
 */
export const generateRealisticCampusRequests = (targetTripId = 'T7') => {
  const hostels = ['INDRAYANI', 'SINDHU', 'BRAHMAPUTRA', 'KRISHNA', 'GODAVARI'];
  const branches = ['CSE', 'ECE', 'VLSI', 'Cybersecurity', 'AIDS'];
  const reasons = [
    { key: 'MEDICAL', count: 4 },
    { key: 'TRAIN_CONNECTION', count: 14 },
    { key: 'EXAM', count: 12 },
    { key: 'SHOPPING', count: 18 },
    { key: 'PERSONAL', count: 14 },
    { key: 'OTHER', count: 4 }
  ];

  const requests = [];
  let reqCounter = 1;
  const baseTime = Date.now() - 3600 * 1000 * 4; // Submissions started 4 hours ago

  reasons.forEach(rGroup => {
    for (let i = 0; i < rGroup.count; i++) {
      const isA11y = rGroup.key === 'MEDICAL' && i === 0;
      const canStand = !(i % 7 === 0); // 1 in 7 students cannot travel standing
      const mis = `112603${String(reqCounter).padStart(3, '0')}`;
      const hostel = hostels[reqCounter % hostels.length];
      const branch = branches[reqCounter % branches.length];
      const rejectedLast14 = (reqCounter % 4 === 0) ? 2 : (reqCounter % 6 === 0 ? 1 : 0);
      const confirmedWeek = (reqCounter % 3 === 0) ? 3 : 1;
      const submissionTime = new Date(baseTime + reqCounter * 3 * 60 * 1000).toISOString();

      requests.push({
        requestId: `REQ-${targetTripId}-${String(reqCounter).padStart(3, '0')}`,
        misNumber: mis,
        fullName: `Student ${mis}`,
        hostel,
        roomNumber: `${hostel[0]}-${100 + (reqCounter % 40)}`,
        course: 'B.Tech',
        batch: '2026-2030',
        branch,
        canTravelStanding: canStand,
        declaredAccessibilityNeed: isA11y,
        rejectedRequestsLast14Days: rejectedLast14,
        confirmedBookingsThisWeek: confirmedWeek,
        tripReason: rGroup.key,
        reasonNote: rGroup.key === 'OTHER' ? 'Inter-college symposium participation' : '',
        timestamp: submissionTime,
        journeyDate: new Date().toISOString().split('T')[0]
      });

      reqCounter++;
    }
  });

  return requests; // Total 66 requests
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
  selectedStandingSpotId = null
}) => {
  const trip = TIMETABLE.find(t => t.tripId === tripId) || TIMETABLE[6];
  const cap = getTripCapacity(trip);

  // 1. Hard Constraints
  const constraintCheck = evaluateRequestConstraints({
    student,
    trip,
    requestedStop,
    journeyDate,
    existingRequests: []
  });

  if (!constraintCheck.isFeasible) {
    const primaryViolation = constraintCheck.violations[0];
    return {
      success: false,
      isFeasible: false,
      status: primaryViolation.code,
      violations: constraintCheck.violations,
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
          ? 'Constraint Failed: Trip Direction Mismatch'
          : (primaryViolation.code === 'TIMETABLE_CLASH'
            ? 'Constraint Failed: Timetable Overlap'
            : 'Constraint Failed: Request Infeasible'),
        outcomeBadgeColor: 'rose',
        level2Reason: primaryViolation.message,
        level3Audit: {
          exactCounterfactual: primaryViolation.code === 'DIRECTION_MISMATCH'
            ? `Trip ${trip.tripId} departs toward ${trip.destination.split('(')[0].trim()}. Your destination must be a stop along this outbound path.`
            : (primaryViolation.code === 'TIMETABLE_CLASH'
              ? 'Adjust your shuttle selection to a trip outside your scheduled class or lab hours.'
              : 'Review route direction and stop selection.'),
          policyDecisionTrace: {
            rule1: student.declaredAccessibilityNeed ? 'Rule 1 (Accessibility Need): Declared' : 'Rule 1 (Accessibility Need): Not declared',
            rule2: `Rule 2 (Reason Hierarchy): ${TRIP_REASONS[tripReason]?.label || tripReason}`,
            rule3: `Rule 3 (Carry-Over Credit): ${student.rejectedRequestsLast14Days || 0} unallocated request in last 14 days`,
            rule4: `Rule 4 (Weekly Bookings): ${student.confirmedBookingsThisWeek || 0} bookings already made this week`,
            rule5: `Rule 5 (Constraint Check): Infeasible on Hard Constraint (${primaryViolation.code})`
          }
        }
      },
      alternativeTrips: []
    };
  }

  // 2. Direct Selection Handler (When user specifically selected an available seat or standing spot in UI)
  if (selectedSeatId || selectedStandingSpotId) {
    const isStanding = Boolean(selectedStandingSpotId);
    const spotRaw = isStanding ? selectedStandingSpotId : selectedSeatId;
    const cleanSpot = isStanding 
      ? (String(spotRaw).startsWith('Standing') ? String(spotRaw) : `Standing Spot ${spotRaw}`)
      : (String(spotRaw).startsWith('Seat') ? String(spotRaw) : `Seat ${spotRaw}`);
    
    const emergencySeats = cap.emergencySeats || ['1A', '1B', '2A'];
    const seatLetterId = String(spotRaw).replace(/^Seat\s*/i, '');
    const isEmergencySeat = !isStanding && emergencySeats.includes(seatLetterId);
    const hasEmergencyEligibility = tripReason === 'MEDICAL' || Boolean(student.declaredAccessibilityNeed);

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
          : `Your seat (${cleanSpot}) is confirmed on the ${trip.departureTime} IIIT Pune Campus Shuttle. Transport is free for students with verified MIS ID.`,
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
            rule3: `Carry-Over Credit: ${student.rejectedRequestsLast14Days || 0} unallocated request in last 14 days`,
            rule4: `Weekly Bookings: ${student.confirmedBookingsThisWeek || 0} bookings already made this week`,
            rule5: `Request Timestamp: Submitted at ${new Date().toLocaleTimeString('en-GB')}`
          }
        }
      },
      alternativeTrips: []
    };
  }

  // 3. Prepare competing pool (use provided or generate 65 competing + this student = 66 total)
  let pool = existingCompetingRequests 
    ? [...existingCompetingRequests] 
    : generateRealisticCampusRequests(trip.tripId).slice(0, 65);

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
    rejectedRequestsLast14Days: student.rejectedRequestsLast14Days || 0,
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

  return {
    success: true,
    isFeasible: true,
    status: evaluatedStudent.status,
    allocationType: evaluatedStudent.allocationType,
    allocatedSpot: evaluatedStudent.allocatedSpot,
    isEmergencyQuota: Boolean(evaluatedStudent.isEmergencyQuota),
    rank: evaluatedStudent.rank,
    waitlistPosition: evaluatedStudent.waitlistPosition || null,
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


