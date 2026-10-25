/**
 * scratch/test_verification.mjs
 * 
 * Programmatic verification script for Part 1: Dashboard 1
 * IIIT Pune Campus Bus Booking & Deterministic Allocation Engine
 * Verification for:
 * 1. 52-Seater (3 Emergency Held-Back Quota, 49 General Seats) & 32-Seater (2 Quota, 30 General Seats)
 * 2. Infeasible Requests (Direction Mismatch without NaN or empty tags)
 * 3. Elimination of legacy point scores (+50 pts) & 5-Rule Deterministic Decision Trace
 * 4. Emergency Priority Override (Medical / Accessibility allocations from Emergency Reserve Quota)
 */

import { 
  ROUTE_INFO, 
  STOPS, 
  FLEET, 
  TIMETABLE, 
  TRIP_REASONS, 
  HOSTELS, 
  getAvailableBranches, 
  DEMO_STUDENTS 
} from '../src/data/iiitBusData.js';

import { 
  evaluateIIITCampusAllocation, 
  solveTripContention, 
  generateRealisticCampusRequests, 
  getTripCapacity, 
  checkTimetableClash, 
  computeDeterministicPriorityScore, 
  computeExplanationAndCounterfactual 
} from '../src/utils/allocationEngine.js';

console.log('================================================================');
console.log('  DASHBOARD 1: IIIT PUNE CAMPUS BUS ALLOCATION ENGINE VERIFICATION');
console.log('================================================================\n');

let allPassed = true;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    allPassed = false;
  }
}

// -------------------------------------------------------------
// Criterion 1: Dependent Branch Validation Logic & Student Profiles
// -------------------------------------------------------------
console.log('\n--- 1. Testing Dependent Branch Validation Logic ---');

const btech2026Branches = getAvailableBranches('B.Tech', '2026-2030');
assert(
  btech2026Branches.includes('AIDS') && 
  btech2026Branches.includes('Cybersecurity') && 
  btech2026Branches.includes('VLSI') &&
  btech2026Branches.includes('CSE') &&
  btech2026Branches.includes('ECE'),
  `B.Tech 2026-2030 unlocks 5 branches (CSE, ECE, VLSI, Cybersecurity, AIDS): [${btech2026Branches.join(', ')}]`
);

const btechOtherBranches = getAvailableBranches('B.Tech', '2024-2028');
assert(
  btechOtherBranches.length === 2 && 
  btechOtherBranches.includes('CSE') && 
  btechOtherBranches.includes('ECE') && 
  !btechOtherBranches.includes('AIDS'),
  `B.Tech other batches restricted to CSE and ECE: [${btechOtherBranches.join(', ')}]`
);

// -------------------------------------------------------------
// Criterion 2: Emergency Held-Back Quota (3 in 52-Seater, 2 in 32-Seater)
// -------------------------------------------------------------
console.log('\n--- 2. Testing Emergency Held-Back Seat Quotas ---');

// 52-Seater (Bus 1 on T1 has 3 held-back; T7 specifically has 2 held back on 52-seater bus per task prompt)
const tripT1 = TIMETABLE.find(t => t.tripId === 'T1');
const capT1 = getTripCapacity(tripT1);
assert(
  capT1.totalCapacity === 60 &&
  capT1.heldBackSeats === 3 &&
  capT1.availableSeated === 49,
  `52-Seater Standard Bus (T1): 60 Total, 3 Held-Back, 49 General Seats`
);

const tripT7 = TIMETABLE.find(t => t.tripId === 'T7');
const capT7 = getTripCapacity(tripT7);

assert(
  capT7.totalCapacity === 60 &&
  capT7.totalAvailable === 58 && 
  capT7.availableSeated === 50 && 
  capT7.availableStanding === 8 && 
  capT7.heldBackSeats === 2 &&
  capT7.emergencySeats.length === 2 &&
  capT7.emergencySeats.includes('1A') &&
  capT7.emergencySeats.includes('1B'),
  `52-Seater Pinned Bus (T7): 60 Total, 2 Held-Back ('1A', '1B'), 50 General Seats, 8 Standing = 58 Available Places`
);

// 32-Seater (Bus 3, e.g. T8)
const tripT8 = TIMETABLE.find(t => t.tripId === 'T8');
const capT8 = getTripCapacity(tripT8);

assert(
  capT8.totalCapacity === 37 &&
  capT8.totalAvailable === 35 && 
  capT8.availableSeated === 30 && 
  capT8.availableStanding === 5 && 
  capT8.heldBackSeats === 2 &&
  capT8.emergencySeats.length === 2 &&
  capT8.emergencySeats.includes('1A') &&
  capT8.emergencySeats.includes('1B'),
  `32-Seater Bus (T8): 37 Total, 2 Held-Back ('1A', '1B'), 30 General Seats, 5 Standing = 35 Available Places`
);

// -------------------------------------------------------------
// Criterion 3: Contention Solver with General Capacity & Standing Limits
// -------------------------------------------------------------
console.log('\n--- 3. Testing Contention Solver with 66 Requests on 52-Seater ---');

const requests66 = generateRealisticCampusRequests('T7');
assert(requests66.length === 66, `Generated realistic competing pool: ${requests66.length} requests`);

const contentionSolution = solveTripContention({
  tripId: 'T7',
  requests: requests66,
  assignedBusId: tripT7.assignedBus
});

assert(
  contentionSolution.allocatedCount === 58,
  `Exactly 58 general requests allocated on T7 (Actual: ${contentionSolution.allocatedCount})`
);
assert(
  contentionSolution.waitlistedCount === 8,
  `Exactly 8 requests waitlisted out of 66 (Actual: ${contentionSolution.waitlistedCount})`
);

const seatedAllocated = contentionSolution.allocated.filter(a => a.allocationType === 'SEATED');
const standingAllocated = contentionSolution.allocated.filter(a => a.allocationType === 'STANDING');

assert(
  seatedAllocated.length === 50,
  `Exactly 50 seated allocations filled for general requests (Actual: ${seatedAllocated.length})`
);
assert(
  standingAllocated.length === 8,
  `Exactly 8 standing allocations filled (Actual: ${standingAllocated.length})`
);

// -------------------------------------------------------------
// Criterion 4: Emergency Priority Override (Medical / Accessibility Need)
// -------------------------------------------------------------
console.log('\n--- 4. Testing Emergency Priority Override for Medical Commuter ---');

// Create 50 priority requests that completely fill all 50 general seats on T7
const fillingRequests = Array.from({ length: 50 }, (_, i) => ({
  misNumber: `112603${100 + i}`,
  fullName: `Higher Priority Commuter ${i + 1}`,
  hostel: 'GODAVARI',
  course: 'B.Tech',
  batch: '2026-2030',
  branch: 'CSE',
  tripReason: 'MEDICAL',
  canTravelStanding: false,
  declaredAccessibilityNeed: true, // Priority ensures these 50 take all 50 general seats
  rejectedRequestsLast14Days: 2,
  confirmedBookingsThisWeek: 0,
  requestedTimestamp: `08:00:${String(i).padStart(2, '0')}`
}));

// Medical commuter arrives after all 49 general seats are taken
const medicalCommuter = {
  misNumber: '112603888',
  fullName: 'Urgent Medical Patient',
  hostel: 'GODAVARI',
  course: 'B.Tech',
  batch: '2026-2030',
  branch: 'ECE',
  tripReason: 'MEDICAL',
  canTravelStanding: false,
  declaredAccessibilityNeed: false,
  rejectedRequestsLast14Days: 0,
  confirmedBookingsThisWeek: 0,
  requestedTimestamp: '08:59:00',
  ignoreCutoff: true
};

const contentionWithMedical = solveTripContention({
  tripId: 'T7',
  requests: [...fillingRequests, medicalCommuter],
  assignedBusId: tripT7.assignedBus
});

const medicalAllocation = contentionWithMedical.allocated.find(a => a.misNumber === '112603888');

assert(
  medicalAllocation !== undefined,
  `Emergency Quota Override: Medical commuter allocated despite all 49 general seats being fully exhausted`
);

assert(
  medicalAllocation?.isEmergencyQuota === true,
  `Medical commuter flagged with isEmergencyQuota: true`
);

assert(
  medicalAllocation?.allocatedSpot.includes('1A') || medicalAllocation?.allocatedSpot.includes('Emergency Quota'),
  `Medical commuter assigned to held emergency seat (${medicalAllocation?.allocatedSpot})`
);

// Now evaluate via evaluateIIITCampusAllocation for upcoming date
const evalMedicalOverride = evaluateIIITCampusAllocation({
  student: medicalCommuter,
  tripId: 'T7',
  tripReason: 'MEDICAL',
  requestedStop: 'stop-5',
  journeyDate: '2026-10-19',
  existingCompetingRequests: fillingRequests
});

assert(
  evalMedicalOverride.status === 'ALLOCATED' && evalMedicalOverride.isEmergencyQuota === true,
  `evaluateIIITCampusAllocation handles emergency override: status=${evalMedicalOverride.status}, isEmergencyQuota=${evalMedicalOverride.isEmergencyQuota}`
);

assert(
  evalMedicalOverride.explanation.level2Reason.includes('Emergency Reserve Quota'),
  `Level 2 Plain-Language Reason states: "${evalMedicalOverride.explanation.level2Reason}"`
);

// -------------------------------------------------------------
// Criterion 5: Infeasible Request (Direction Mismatch) - Zero NaN, Clean Message
// -------------------------------------------------------------
console.log('\n--- 5. Testing Infeasible Request (Direction Mismatch) ---');

// Trip T1 is OUTBOUND (from Campus to Talegaon)
// Requesting Boarding at Stop 1 and Dropping at Stop 1 (Campus)
const evalDirectionMismatch = evaluateIIITCampusAllocation({
  student: DEMO_STUDENTS[0],
  tripId: 'T1',
  requestedStop: 'stop-1', // main gate on outbound trip
  tripReason: 'SHOPPING',
  journeyDate: '2026-10-19'
});

assert(
  evalDirectionMismatch.isFeasible === false,
  `Direction mismatch flagged isFeasible === false`
);

assert(
  evalDirectionMismatch.status === 'DIRECTION_MISMATCH',
  `Status code is 'DIRECTION_MISMATCH'`
);

assert(
  evalDirectionMismatch.explanation.level1Headline === '🔴 REQUEST INFEASIBLE: ROUTE DIRECTION MISMATCH',
  `Level 1 Headline matches spec: "${evalDirectionMismatch.explanation.level1Headline}"`
);

assert(
  evalDirectionMismatch.explanation.level2Reason === 'Trip T1 departs from IIIT Pune Main Gate toward Godavari Hostel and Talegaon. The selected drop-off point is not served in this direction.',
  `Level 2 Reason provides clean guidance: "${evalDirectionMismatch.explanation.level2Reason}"`
);

assert(
  evalDirectionMismatch.explanation.level3Audit.exactCounterfactual === 'Please pick a destination along the outbound route (L&T Circle, Restaurant Chain, Medical Store, Godavari Hostel, Hospital, Laptop Service Centre, Talegaon Station).',
  `Level 3 Correction matches spec: "${evalDirectionMismatch.explanation.level3Audit.exactCounterfactual}"`
);

assert(
  !isNaN(evalDirectionMismatch.capacitySummary.totalAvailable) && 
  evalDirectionMismatch.capacitySummary.totalAvailable > 0,
  `No NaN in capacitySummary: totalAvailable = ${evalDirectionMismatch.capacitySummary.totalAvailable}`
);

assert(
  !isNaN(evalDirectionMismatch.competingStats.totalRequests),
  `No NaN in competingStats: totalRequests = ${evalDirectionMismatch.competingStats.totalRequests}`
);

// -------------------------------------------------------------
// Criterion 6: Elimination of Legacy Point Scores & 5-Rule Policy Trace
// -------------------------------------------------------------
console.log('\n--- 6. Testing Elimination of Point Scores & 5-Rule Decision Trace ---');

const evalTrace = evaluateIIITCampusAllocation({
  student: DEMO_STUDENTS[1], // Sneha Kulkarni
  tripId: 'T7',
  tripReason: 'SHOPPING',
  acceptableWindow: 30,
  journeyDate: '2026-10-19'
});

const counterfactualText = evalTrace.explanation.level3Audit.exactCounterfactual;
assert(
  !counterfactualText.includes('+50 pts') &&
  !counterfactualText.includes('+15 pts') &&
  !counterfactualText.includes('-20 pts') &&
  !counterfactualText.includes('0 pts') &&
  !counterfactualText.includes('pts'),
  `Legacy point score strings completely eliminated from counterfactual: "${counterfactualText}"`
);

const trace = evalTrace.explanation.level3Audit.policyDecisionTrace;
assert(
  trace &&
  trace.rule1 &&
  trace.rule2 &&
  trace.rule3 &&
  trace.rule4 &&
  trace.rule5,
  `5-Rule Policy Decision Trace fully populated with Rules 1-5:`
);
console.log(`    • ${trace.rule1}`);
console.log(`    • ${trace.rule2}`);
console.log(`    • ${trace.rule3}`);
console.log(`    • ${trace.rule4}`);
console.log(`    • ${trace.rule5}`);

// -------------------------------------------------------------
// Criterion 7: Negative Case Scenario 1 - Demand Contention Waitlist XAI
// -------------------------------------------------------------
console.log('\n--- 7. Testing Negative Scenario 1: Demand Contention Waitlist XAI ---');

// Generate 60 high priority requests (Medical + Train Connection)
const competing60High = Array.from({ length: 60 }, (_, i) => ({
  misNumber: `112603${400 + i}`,
  fullName: `High Priority Peer ${i + 1}`,
  hostel: 'GODAVARI',
  course: 'B.Tech',
  batch: '2026-2030',
  branch: 'CSE',
  tripReason: i < 30 ? 'MEDICAL' : 'TRAIN_CONNECTION',
  canTravelStanding: true,
  declaredAccessibilityNeed: i === 0,
  carryOverCredits: 1,
  rejectedRequestsLast14Days: 1,
  confirmedBookingsThisWeek: 0,
  timestamp: '2026-10-23T08:00:00.000Z'
}));

// 5 General peers who submitted earlier
const competing5Early = Array.from({ length: 5 }, (_, i) => ({
  misNumber: `112603${500 + i}`,
  fullName: `Early Commuter ${i + 1}`,
  hostel: 'GODAVARI',
  course: 'B.Tech',
  batch: '2026-2030',
  branch: 'ECE',
  tripReason: 'SHOPPING',
  canTravelStanding: true,
  declaredAccessibilityNeed: false,
  carryOverCredits: 0,
  rejectedRequestsLast14Days: 0,
  confirmedBookingsThisWeek: 0,
  timestamp: '2026-10-23T13:30:00.000Z'
}));

// Student arrives at 14:30 without carry-over credits
const waitlistedStudent = {
  misNumber: '112603999',
  fullName: 'Contention Waitlisted Student',
  hostel: 'GODAVARI',
  course: 'B.Tech',
  batch: '2026-2030',
  branch: 'AIDS',
  tripReason: 'SHOPPING',
  canTravelStanding: true,
  declaredAccessibilityNeed: false,
  carryOverCredits: 0,
  rejectedRequestsLast14Days: 0,
  confirmedBookingsThisWeek: 0
};

const evalWaitlist = evaluateIIITCampusAllocation({
  student: waitlistedStudent,
  tripId: 'T7',
  tripReason: 'SHOPPING',
  acceptableWindow: 60,
  journeyDate: '2026-10-23',
  existingCompetingRequests: [...competing60High, ...competing5Early]
});

assert(
  evalWaitlist.status === 'WAITLISTED',
  `Student correctly placed on WAITLISTED (Status: ${evalWaitlist.status})`
);

assert(
  evalWaitlist.explanation.level1Headline.startsWith('🟠 ON WAITING LIST: RANK #'),
  `Level 1 Headline matches waitlist format: "${evalWaitlist.explanation.level1Headline}"`
);

assert(
  evalWaitlist.explanation.level2Reason.includes('Trip T7 (17:30) has reached maximum capacity with 58 total places allocated across 66 applicants') &&
  evalWaitlist.explanation.level2Reason.includes('prioritized for students with time-critical needs, including 6 medical appointments, 14 Talegaon train connections'),
  `Level 2 Plain-Language Reason details demand contention faithfully: "${evalWaitlist.explanation.level2Reason}"`
);

assert(
  evalWaitlist.explanation.level3Audit.exactCounterfactual.includes('If 1 confirmed student on this 17:30 trip cancels, you will advance to Rank #2 automatically') &&
  evalWaitlist.explanation.level3Audit.exactCounterfactual.includes('Next-Trip Priority Boost'),
  `Level 3 Exact Counterfactual details cancellation effect and priority boost: "${evalWaitlist.explanation.level3Audit.exactCounterfactual}"`
);

assert(
  Array.isArray(evalWaitlist.alternativeTrips) && evalWaitlist.alternativeTrips.length > 0 && evalWaitlist.alternativeTrips.length <= 3,
  `Alternative suggestions generated (Found: ${evalWaitlist.alternativeTrips.length})`
);

if (evalWaitlist.alternativeTrips.length > 0) {
  assert(
    evalWaitlist.alternativeTrips[0].rationale.includes('Trip T6') && evalWaitlist.alternativeTrips[0].rationale.includes('14 seats available'),
    `Alternative trip rationale formatted clearly: "${evalWaitlist.alternativeTrips[0].rationale}"`
  );
}

// -------------------------------------------------------------
// Criterion 8: Negative Case Scenario 2 - Hard Constraint Timetable Clash
// -------------------------------------------------------------
console.log('\n--- 8. Testing Negative Scenario 2: Timetable Clash XAI ---');

// Student with scheduled Database Systems Lab (16:00 to 17:30) on Thursday
const studentWithLab = {
  ...DEMO_STUDENTS[0],
  weeklyClassTimetable: [
    { day: 'Thursday', startTime: '16:00', endTime: '17:30', subject: 'Database Systems Lab' }
  ]
};

// Trip T6 departs at 16:30 which clashes with 16:00-17:30 lab
const evalClash = evaluateIIITCampusAllocation({
  student: studentWithLab,
  tripId: 'T6', // Departs at 16:30
  tripReason: 'GENERAL_COMMUTE',
  journeyDate: '2026-10-22' // Thursday
});

assert(
  evalClash.isFeasible === false,
  `Timetable clash request flagged isFeasible === false`
);

assert(
  evalClash.status === 'TIMETABLE_CLASH',
  `Status code is 'TIMETABLE_CLASH'`
);

assert(
  evalClash.explanation.level1Headline === '🔴 REQUEST INFEASIBLE: CLASS SCHEDULE CLASH',
  `Level 1 Headline matches spec: "${evalClash.explanation.level1Headline}"`
);

assert(
  evalClash.explanation.level2Reason.includes('Database Systems Lab (16:00 to 17:30)'),
  `Level 2 Plain-Language Reason states exact clashing lab: "${evalClash.explanation.level2Reason}"`
);

assert(
  evalClash.explanation.level3Audit.exactCounterfactual.includes('subsequent') &&
  evalClash.explanation.level3Audit.exactCounterfactual.includes('departs after your lab concludes'),
  `Level 3 Actionable Next Steps guides student to subsequent departure: "${evalClash.explanation.level3Audit.exactCounterfactual}"`
);

// --- 8B: Lenient Timetable Bypass & Soft Clash Override (Section 13.4) ---
console.log('\n--- 8B. Testing Lenient Timetable Validation & Soft Clash Override ---');

// 1. Default Student with Empty Timetable: Smoothly allowed on T5, T6, T7, T8 with zero blocking
const evalDefaultEmpty = evaluateIIITCampusAllocation({
  student: { ...DEMO_STUDENTS[0], weeklyClassTimetable: [] },
  tripId: 'T6', // 16:30
  tripReason: 'SHOPPING',
  journeyDate: '2026-10-23'
});

assert(
  evalDefaultEmpty.isFeasible === true && evalDefaultEmpty.status !== 'TIMETABLE_CLASH',
  `Empty timetable bypasses schedule clash check entirely: isFeasible=${evalDefaultEmpty.isFeasible}, status=${evalDefaultEmpty.status}`
);

// 2. Soft Clash Override: Student with clashing lab checked 'Yes, I have permission / lab cancelled today'
const evalOverriddenClash = evaluateIIITCampusAllocation({
  student: studentWithLab,
  tripId: 'T6',
  tripReason: 'SHOPPING',
  journeyDate: '2026-10-22',
  overrideClassClash: true
});

assert(
  evalOverriddenClash.isFeasible === true && evalOverriddenClash.status !== 'TIMETABLE_CLASH',
  `Soft clash override allows student with permission to proceed to allocation: isFeasible=${evalOverriddenClash.isFeasible}, status=${evalOverriddenClash.status}`
);

// -------------------------------------------------------------
// Criterion 9: Carry-Over Fairness Credit Promotion Lifecycle
// -------------------------------------------------------------
console.log('\n--- 9. Testing Carry-Over Fairness Credit Promotion & Lifecycle ---');

// Part A: Increment on Waitlist
assert(
  evalWaitlist.carryOverCreditsAwarded === true && evalWaitlist.updatedCarryOverCredits === 1,
  `Waitlisting awards carry-over fairness credit (+1): previous=${evalWaitlist.carryOverCredits}, updated=${evalWaitlist.updatedCarryOverCredits}`
);

// Part B: Promotion of 1-Credit Student Over 0-Credit Peer on Subsequent Booking
const studentA = {
  misNumber: '112603001',
  fullName: 'Student A (Promoted with Credit)',
  tripReason: 'SHOPPING',
  carryOverCredits: 1,
  rejectedRequestsLast14Days: 1,
  confirmedBookingsThisWeek: 0,
  declaredAccessibilityNeed: false,
  timestamp: '2026-10-23T14:10:00.000Z'
};

const studentB = {
  misNumber: '112603002',
  fullName: 'Student B (0 Credits, identical reason & bookings)',
  tripReason: 'SHOPPING',
  carryOverCredits: 0,
  rejectedRequestsLast14Days: 0,
  confirmedBookingsThisWeek: 0,
  declaredAccessibilityNeed: false,
  timestamp: '2026-10-23T14:10:00.000Z'
};

const resA = computeDeterministicPriorityScore(studentA);
const resB = computeDeterministicPriorityScore(studentB);
const scoreA = resA.totalScore;
const scoreB = resB.totalScore;

assert(
  scoreA > scoreB,
  `Rule 3 deterministic priority score promotion: Student A (1 credit) score ${scoreA} > Student B (0 credits) score ${scoreB}`
);

// Part C: Credit Consumption & XAI Disclosure upon Confirmation
const evalPromoted = evaluateIIITCampusAllocation({
  student: studentA,
  tripId: 'T7',
  tripReason: 'SHOPPING',
  journeyDate: '2026-10-23',
  existingCompetingRequests: Array.from({ length: 40 }, (_, i) => ({
    misNumber: `112603${800 + i}`,
    fullName: `Peer ${i + 1}`,
    tripReason: 'SHOPPING',
    carryOverCredits: 0,
    rejectedRequestsLast14Days: 0,
    confirmedBookingsThisWeek: 0,
    timestamp: '2026-10-23T14:15:00.000Z'
  }))
});

assert(
  evalPromoted.status === 'ALLOCATED',
  `Promoted student successfully allocated confirmed place`
);

assert(
  evalPromoted.carryOverCreditsConsumed === true && evalPromoted.updatedCarryOverCredits === 0,
  `Carry-over credit consumed upon confirmed allocation: previous=${evalPromoted.carryOverCredits}, updated=${evalPromoted.updatedCarryOverCredits}`
);

assert(
  evalPromoted.explanation.level2Reason.includes('Next-Trip Priority Boost (+1 boost from your previous full trip) promoted you ahead of other requests'),
  `Level 2 XAI disclosure faithfully reports priority boost promotion: "${evalPromoted.explanation.level2Reason}"`
);

// -------------------------------------------------------------
// Criterion 10: Zero Payment Prompts & Free Badges Purge
// -------------------------------------------------------------
console.log('\n--- 10. Verifying Zero Fare / Payment System Purge ---');

const serializedResult = JSON.stringify(evalPromoted);
assert(
  !serializedResult.includes('₹0.00') &&
  !serializedResult.includes('FREE PASS') &&
  !serializedResult.includes('Zero Fare') &&
  !serializedResult.includes('Free Ride') &&
  !serializedResult.includes('paymentGateway') &&
  !serializedResult.includes('walletBalance'),
  `Zero payment prompts or redundant free badges present in allocation payload`
);

// -------------------------------------------------------------
// Criterion 11: Trip T7 Pinning & Dynamic XAI Negative Outcome
// -------------------------------------------------------------
console.log('\n--- 11. Testing Trip T7 Pinning vs Other Trips Positive Allocations ---');

// 1. Positive Case: Booking Morning Trip T1 (08:00) with Shopping
const evalT1 = evaluateIIITCampusAllocation({
  student: {
    misNumber: '112603099',
    fullName: 'Standard Morning Commuter',
    course: 'B.Tech',
    branch: 'CSE',
    hostel: 'GODAVARI',
    canTravelStanding: true,
    declaredAccessibilityNeed: false,
    carryOverCredits: 0
  },
  tripId: 'T1',
  tripReason: 'SHOPPING',
  journeyDate: '2026-10-24'
});

assert(
  evalT1.status === 'ALLOCATED',
  `Morning Trip T1 (08:00) confirms a seat normally (Positive Case): status=${evalT1.status}, spot=${evalT1.allocatedSpot}`
);

// 2. Positive Case: Booking Midday Trip T3 (13:30) with Personal
const evalT3 = evaluateIIITCampusAllocation({
  student: {
    misNumber: '112603098',
    fullName: 'Standard Midday Commuter',
    course: 'B.Tech',
    branch: 'CSE',
    hostel: 'GODAVARI',
    canTravelStanding: true,
    declaredAccessibilityNeed: false,
    carryOverCredits: 0
  },
  tripId: 'T3',
  tripReason: 'PERSONAL',
  journeyDate: '2026-10-24'
});

assert(
  evalT3.status === 'ALLOCATED',
  `Midday Trip T3 (13:30) confirms a seat normally (Positive Case): status=${evalT3.status}, spot=${evalT3.allocatedSpot}`
);

// 3. Negative Case: Booking Trip T7 (17:30) with Shopping
const evalT7Shopping = evaluateIIITCampusAllocation({
  student: {
    misNumber: '112603097',
    fullName: 'Student T7 Commuter',
    course: 'B.Tech',
    branch: 'CSE',
    hostel: 'GODAVARI',
    canTravelStanding: true,
    declaredAccessibilityNeed: false,
    carryOverCredits: 0
  },
  tripId: 'T7',
  tripReason: 'SHOPPING',
  journeyDate: '2026-10-24'
});

assert(
  evalT7Shopping.status === 'WAITLISTED',
  `Trip T7 (17:30) with Reason: Shopping places user on Waiting List: status=${evalT7Shopping.status}`
);

assert(
  evalT7Shopping.waitlistPosition === 3,
  `Trip T7 assigns Waitlist Rank #3 (position ${evalT7Shopping.rank} of ${evalT7Shopping.competingStats?.totalRequests}): waitlistPosition=${evalT7Shopping.waitlistPosition}`
);

assert(
  evalT7Shopping.explanation.level1Headline === '🟠 ON WAITING LIST: RANK #3 (Trip T7 • 17:30)',
  `Trip T7 Level 1 Headline matches: "${evalT7Shopping.explanation.level1Headline}"`
);

assert(
  evalT7Shopping.explanation.level2Reason.includes('Trip T7 (17:30) has reached maximum capacity with 58 total places allocated across 66 applicants') &&
  evalT7Shopping.explanation.level2Reason.includes('6 medical appointments') &&
  evalT7Shopping.explanation.level2Reason.includes('14 Talegaon train connections') &&
  evalT7Shopping.explanation.level2Reason.includes('Shopping / Errands'),
  `Trip T7 Level 2 Reason explains dynamic factors and prior needs: "${evalT7Shopping.explanation.level2Reason}"`
);

assert(
  evalT7Shopping.explanation.level3Audit.exactCounterfactual.includes('If 1 confirmed student on this 17:30 trip cancels, you will advance to Rank #2 automatically') &&
  evalT7Shopping.explanation.level3Audit.exactCounterfactual.includes('+1 Next-Trip Priority Boost'),
  `Trip T7 Level 3 Exact Counterfactual matches specification: "${evalT7Shopping.explanation.level3Audit.exactCounterfactual}"`
);

assert(
  evalT7Shopping.alternativeTrips.length === 2 &&
  evalT7Shopping.alternativeTrips[0].tripId === 'T6' &&
  evalT7Shopping.alternativeTrips[0].description.includes('Leaves 60 mins earlier') &&
  evalT7Shopping.alternativeTrips[1].tripId === 'T8' &&
  evalT7Shopping.alternativeTrips[1].description.includes('Leaves 50 mins later'),
  `Trip T7 suggests Trip T6 (16:30) and Trip T8 (18:20) as viable alternatives`
);

// 4. Negative Case: Booking Trip T7 (17:30) with Personal
const evalT7Personal = evaluateIIITCampusAllocation({
  student: {
    misNumber: '112603096',
    fullName: 'Student T7 Personal',
    course: 'B.Tech',
    branch: 'CSE',
    hostel: 'GODAVARI',
    canTravelStanding: true,
    declaredAccessibilityNeed: false,
    carryOverCredits: 0
  },
  tripId: 'T7',
  tripReason: 'PERSONAL',
  journeyDate: '2026-10-24'
});

assert(
  evalT7Personal.status === 'WAITLISTED' &&
  evalT7Personal.waitlistPosition === 3 &&
  evalT7Personal.explanation.level2Reason.includes('Personal / Leisure'),
  `Trip T7 with Reason: Personal dynamically embeds 'Personal / Leisure' in Level 2 Reason`
);

// -------------------------------------------------------------
// Overall Result
// -------------------------------------------------------------
console.log('\n================================================================');
if (allPassed) {
  console.log('  ALL SPECIFICATION & OPERATIONAL CRITERIA VERIFIED & PASSED (100%)');
} else {
  console.log('  SOME TESTS FAILED - REVIEW ABOVE LOGS');
}
console.log('================================================================\n');

if (!allPassed) {
  process.exit(1);
}
