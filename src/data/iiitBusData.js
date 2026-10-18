/**
 * src/data/iiitBusData.js
 * 
 * Domain Model & Operational Data for Dashboard 1:
 * IIIT Pune Campus Bus Booking & Deterministic Seat Allocation System
 * 
 * Strictly follows Part 1 specifications:
 * 1. Single Route: IIIT Pune Campus ⇄ Talegaon / Godavari (8 ordered stops, bi-directional)
 * 2. Fixed 10-Trip Daily Timetable (T1 to T10, 45-50 min runtime)
 * 3. 3-Bus Fleet (Bus 1: 52+8=60, Bus 2: 52+8=60, Bus 3: 32+5=37)
 * 4. Hostels, Academic Programs, Branches (with dependent validation rules)
 * 5. Trip Reasons with strict hierarchical ranking
 */

export const ROUTE_INFO = {
  routeId: 'IIITP-SHUTTLE-01',
  routeName: 'IIIT Pune Campus ⇄ Talegaon Station Shuttle',
  terminusA: 'IIIT Pune Campus (Main Gate)',
  terminusB: 'Talegaon Station',
  totalDistanceKm: 14.2,
  runtimeMinutes: 50,
  operatingAgency: 'IIIT Pune Transport Department',
  emergencyHelpline: '+91 20 2765 8900'
};

export const STOPS = [
  { id: 'stop-1', name: 'IIIT Pune Campus (Main Gate)', index: 1, isTerminus: true, landmark: 'Main Security Gate & Administrative Block' },
  { id: 'stop-2', name: 'L&T Circle', index: 2, isTerminus: false, landmark: 'Industrial Highway Junction' },
  { id: 'stop-3', name: 'Restaurant Chain', index: 3, isTerminus: false, landmark: 'Student Food Plaza & Cafes' },
  { id: 'stop-4', name: 'Medical Store', index: 4, isTerminus: false, landmark: 'Pharmacy & Wellness Centre' },
  { id: 'stop-5', name: 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)', index: 5, isTerminus: false, isHostelTerminus: true, landmark: 'Godavari Boys Off-Campus Residence' },
  { id: 'stop-6', name: 'Hospital', index: 6, isTerminus: false, landmark: 'General Health Care Hospital' },
  { id: 'stop-7', name: 'Laptop Service Centre', index: 7, isTerminus: false, landmark: 'Electronics & IT Hardware Hub' },
  { id: 'stop-8', name: 'Talegaon Station', index: 8, isTerminus: true, landmark: 'Talegaon Railway Station Central Platform' }
];

export const FLEET = [
  {
    busId: 'BUS-01',
    plateNumber: 'MH 14 BT 1001',
    model: 'Tata Starbus EV-52',
    seats: 52,
    standingPlaces: 8,
    totalCapacity: 60,
    heldBackSeats: 3, // Emergency Quota: 1A, 1B, 2A
    emergencySeats: ['1A', '1B', '2A'],
    generalSeatedPlaces: 49,
    availableCapacity: 57, // 49 seated + 8 standing
    driverName: 'Sanjay Patil',
    driverPhone: '+91 98231 44501',
    isAC: true,
    hasRamp: true
  },
  {
    busId: 'BUS-02',
    plateNumber: 'MH 14 BT 1002',
    model: 'Ashok Leyland Oyster-52',
    seats: 52,
    standingPlaces: 8,
    totalCapacity: 60,
    heldBackSeats: 3, // Emergency Quota: 1A, 1B, 2A
    emergencySeats: ['1A', '1B', '2A'],
    generalSeatedPlaces: 49,
    availableCapacity: 57, // 49 seated + 8 standing
    driverName: 'Ramesh Pawar',
    driverPhone: '+91 98231 44502',
    isAC: true,
    hasRamp: true
  },
  {
    busId: 'BUS-03',
    plateNumber: 'MH 14 BT 1003',
    model: 'Eicher Skyline-32 Compact',
    seats: 32,
    standingPlaces: 5,
    totalCapacity: 37,
    heldBackSeats: 2, // Emergency Quota: 1A, 1B
    emergencySeats: ['1A', '1B'],
    generalSeatedPlaces: 30,
    availableCapacity: 35, // 30 seated + 5 standing
    driverName: 'Dattatray Shinde',
    driverPhone: '+91 98231 44503',
    isAC: true,
    hasRamp: false
  }
];

/**
 * Fixed 10-Trip Daily Timetable
 * Turnaround constraint: minimum 10 minutes required at terminus before next departure.
 */
export const TIMETABLE = [
  {
    tripId: 'T1',
    departureTime: '08:00',
    arrivalTime: '08:50',
    origin: 'IIIT Pune Campus (Main Gate)',
    destination: 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)',
    direction: 'AWAY_FROM_CAMPUS',
    runtimeMinutes: 50,
    defaultBusId: 'BUS-01',
    assignedBus: 'BUS-01',
    capacity: 60,
    seatsCapacity: 52,
    standingCapacity: 8,
    heldBackSeats: 3,
    emergencySeats: ['1A', '1B', '2A'],
    netBookableCapacity: 57,
    turnaroundBufferMinutes: 70 // Arrives 08:50, departs T2 at 10:00 -> 70m buffer (>=10m ok)
  },
  {
    tripId: 'T2',
    departureTime: '10:00',
    arrivalTime: '10:50',
    origin: 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)',
    destination: 'IIIT Pune Campus (Main Gate)',
    direction: 'TOWARD_CAMPUS',
    runtimeMinutes: 50,
    defaultBusId: 'BUS-01',
    assignedBus: 'BUS-01',
    capacity: 60,
    seatsCapacity: 52,
    standingCapacity: 8,
    heldBackSeats: 3,
    emergencySeats: ['1A', '1B', '2A'],
    netBookableCapacity: 57,
    turnaroundBufferMinutes: 160 // Arrives 10:50, next T3 is at 13:30 -> 160m buffer
  },
  {
    tripId: 'T3',
    departureTime: '13:30',
    arrivalTime: '14:20',
    origin: 'IIIT Pune Campus (Main Gate)',
    destination: 'Talegaon Station',
    direction: 'AWAY_FROM_CAMPUS',
    runtimeMinutes: 50,
    defaultBusId: 'BUS-01',
    assignedBus: 'BUS-01',
    capacity: 60,
    seatsCapacity: 52,
    standingCapacity: 8,
    heldBackSeats: 3,
    emergencySeats: ['1A', '1B', '2A'],
    netBookableCapacity: 57,
    turnaroundBufferMinutes: 10 // Arrives 14:20, T4 departs 14:30 -> exact 10m buffer!
  },
  {
    tripId: 'T4',
    departureTime: '14:30',
    arrivalTime: '15:20',
    origin: 'Talegaon Station',
    destination: 'IIIT Pune Campus (Main Gate)',
    direction: 'TOWARD_CAMPUS',
    runtimeMinutes: 50,
    defaultBusId: 'BUS-01',
    assignedBus: 'BUS-01',
    capacity: 60,
    seatsCapacity: 52,
    standingCapacity: 8,
    heldBackSeats: 3,
    emergencySeats: ['1A', '1B', '2A'],
    netBookableCapacity: 57,
    turnaroundBufferMinutes: 70 // Arrives 15:20, T6 departs 16:30 (BUS-02 can serve T5)
  },
  {
    tripId: 'T5',
    departureTime: '15:00',
    arrivalTime: '15:50',
    origin: 'IIIT Pune Campus (Main Gate)',
    destination: 'Talegaon Station',
    direction: 'AWAY_FROM_CAMPUS',
    runtimeMinutes: 50,
    defaultBusId: 'BUS-02', // Distinct bus from T4 to prevent overlap!
    assignedBus: 'BUS-02',
    capacity: 60,
    seatsCapacity: 52,
    standingCapacity: 8,
    heldBackSeats: 3,
    emergencySeats: ['1A', '1B', '2A'],
    netBookableCapacity: 57,
    turnaroundBufferMinutes: 40 // Arrives 15:50, departs T6 at 16:30
  },
  {
    tripId: 'T6',
    departureTime: '16:30',
    arrivalTime: '17:20',
    origin: 'Talegaon Station',
    destination: 'IIIT Pune Campus (Main Gate)',
    direction: 'TOWARD_CAMPUS',
    runtimeMinutes: 50,
    defaultBusId: 'BUS-02',
    assignedBus: 'BUS-02',
    capacity: 60,
    seatsCapacity: 52,
    standingCapacity: 8,
    heldBackSeats: 3,
    emergencySeats: ['1A', '1B', '2A'],
    netBookableCapacity: 57,
    turnaroundBufferMinutes: 10 // Arrives 17:20, T7 departs 17:30 -> 10m buffer
  },
  {
    tripId: 'T7',
    departureTime: '17:30',
    arrivalTime: '18:20',
    origin: 'IIIT Pune Campus (Main Gate)',
    destination: 'Talegaon Station',
    direction: 'AWAY_FROM_CAMPUS',
    runtimeMinutes: 50,
    defaultBusId: 'BUS-01',
    assignedBus: 'BUS-01',
    capacity: 60,
    seatsCapacity: 52,
    standingCapacity: 8,
    heldBackSeats: 3,
    emergencySeats: ['1A', '1B', '2A'],
    netBookableCapacity: 57,
    turnaroundBufferMinutes: 70
  },
  {
    tripId: 'T8',
    departureTime: '18:20',
    arrivalTime: '19:10',
    origin: 'Talegaon Station',
    destination: 'IIIT Pune Campus (Main Gate)',
    direction: 'TOWARD_CAMPUS',
    runtimeMinutes: 50,
    defaultBusId: 'BUS-03',
    assignedBus: 'BUS-03',
    capacity: 37,
    seatsCapacity: 32,
    standingCapacity: 5,
    heldBackSeats: 2,
    emergencySeats: ['1A', '1B'],
    netBookableCapacity: 35,
    turnaroundBufferMinutes: 30
  },
  {
    tripId: 'T9',
    departureTime: '19:40',
    arrivalTime: '20:30',
    origin: 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)',
    destination: 'IIIT Pune Campus (Main Gate)',
    direction: 'TOWARD_CAMPUS',
    runtimeMinutes: 50,
    defaultBusId: 'BUS-01',
    assignedBus: 'BUS-01',
    capacity: 60,
    seatsCapacity: 52,
    standingCapacity: 8,
    heldBackSeats: 3,
    emergencySeats: ['1A', '1B', '2A'],
    netBookableCapacity: 57,
    turnaroundBufferMinutes: 120
  },
  {
    tripId: 'T10',
    departureTime: '22:30',
    arrivalTime: '23:20',
    origin: 'IIIT Pune Campus (Main Gate)',
    destination: 'Talegaon Station',
    direction: 'AWAY_FROM_CAMPUS',
    runtimeMinutes: 50,
    defaultBusId: 'BUS-02',
    assignedBus: 'BUS-02',
    capacity: 60,
    seatsCapacity: 52,
    standingCapacity: 8,
    heldBackSeats: 3,
    emergencySeats: ['1A', '1B', '2A'],
    netBookableCapacity: 57,
    turnaroundBufferMinutes: 520
  }
];

export const HOSTELS = [
  { id: 'INDRAYANI', name: 'Indrayani Hostel', gender: 'Girls', type: 'In-Campus', block: 'Girls Quad A' },
  { id: 'SINDHU', name: 'Sindhu Hostel', gender: 'Girls', type: 'In-Campus', block: 'Girls Quad B' },
  { id: 'BRAHMAPUTRA', name: 'Brahmaputra Hostel', gender: 'Boys', type: 'In-Campus', block: 'Boys Tower 1' },
  { id: 'KRISHNA', name: 'Krishna Hostel', gender: 'Boys', type: 'In-Campus', block: 'Boys Tower 2' },
  { id: 'GODAVARI', name: 'Godavari Hostel', gender: 'Boys', type: 'Off-Campus', block: 'Off-Campus Terminus Wing' }
];

export const COURSES = ['B.Tech', 'M.Tech', 'PhD'];

export const BATCHES = [
  '2026-2030',
  '2025-2029',
  '2024-2028',
  '2023-2027',
  '2022-2026'
];

/**
 * Dependent Branch Rule:
 * - If B.Tech & Batch 2026-2030: CSE, ECE, VLSI, Cybersecurity, AI and Data Science (AIDS)
 * - If B.Tech & other batch: CSE, ECE
 * - If M.Tech or PhD: CSE, ECE
 */
export const getAvailableBranches = (course = 'B.Tech', batch = '2026-2030') => {
  if (course === 'B.Tech' && batch === '2026-2030') {
    return ['CSE', 'ECE', 'VLSI', 'Cybersecurity', 'AIDS'];
  }
  return ['CSE', 'ECE'];
};

const _BASE_TRIP_REASONS = {
  MEDICAL: {
    key: 'MEDICAL',
    label: 'Medical / Doctor Visit',
    priorityTier: 1,
    priorityRank: 1,
    weight: 50,
    icon: '🏥',
    description: 'Clinic, medical emergency, hospital, or pharmacy prescription visit.'
  },
  TRAIN_CONNECTION: {
    key: 'TRAIN_CONNECTION',
    label: 'Train / Travel Connection',
    priorityTier: 2,
    priorityRank: 2,
    weight: 40,
    icon: '🚆',
    description: 'Catching outbound railway reservation at Talegaon or Pune Station.'
  },
  EXAM: {
    key: 'EXAM',
    label: 'Exam / Academic Deadline',
    priorityTier: 3,
    priorityRank: 3,
    weight: 30,
    icon: '🎓',
    description: 'Competitive exam, university thesis defense, or official academic submission.'
  },
  SHOPPING: {
    key: 'SHOPPING',
    label: 'Shopping / Errands',
    priorityTier: 4,
    priorityRank: 4,
    weight: 10,
    icon: '🛍️',
    description: 'Groceries, stationery, laptop repairs, or bank errands.'
  },
  PERSONAL: {
    key: 'PERSONAL',
    label: 'Personal / Leisure',
    priorityTier: 5,
    priorityRank: 5,
    weight: 5,
    icon: '🚶',
    description: 'Recreation, restaurant outing, or general casual travel.'
  },
  OTHER: {
    key: 'OTHER',
    label: 'Other (With Mandatory Note)',
    priorityTier: 6,
    priorityRank: 6,
    weight: 5,
    icon: '📝',
    description: 'Special administrative or family circumstances (note required).'
  }
};

export const TRIP_REASONS = {
  ..._BASE_TRIP_REASONS,
  TRAIN_TRAVEL: _BASE_TRIP_REASONS.TRAIN_CONNECTION,
  EXAM_DEADLINE: _BASE_TRIP_REASONS.EXAM,
  SHOPPING_ERRANDS: _BASE_TRIP_REASONS.SHOPPING,
  PERSONAL_LEISURE: _BASE_TRIP_REASONS.PERSONAL
};

/**
 * Sample Demo Students for Testing & Evaluation
 */
export const DEMO_STUDENTS = [
  {
    misNumber: '112603001',
    fullName: 'Aditya Verma',
    hostel: 'GODAVARI',
    roomNumber: 'G-214',
    course: 'B.Tech',
    batch: '2026-2030',
    branch: 'AIDS',
    canTravelStanding: true,
    declaredAccessibilityNeed: false,
    rejectedRequestsLast14Days: 1,
    confirmedBookingsThisWeek: 2,
    weeklyClassTimetable: [
      { day: 'Monday', startTime: '09:00', endTime: '12:00', subject: 'Data Structures Lab' },
      { day: 'Wednesday', startTime: '13:00', endTime: '15:30', subject: 'Machine Learning Lab' },
      { day: 'Friday', startTime: '14:00', endTime: '16:00', subject: 'Discrete Mathematics' }
    ]
  },
  {
    misNumber: '112603042',
    fullName: 'Ananya Deshmukh',
    hostel: 'INDRAYANI',
    roomNumber: 'IN-102',
    course: 'B.Tech',
    batch: '2026-2030',
    branch: 'Cybersecurity',
    canTravelStanding: false, // Cannot stand! Must get seated or waitlisted
    declaredAccessibilityNeed: true, // Rule 1 Accessibility Priority!
    rejectedRequestsLast14Days: 2,
    confirmedBookingsThisWeek: 1,
    weeklyClassTimetable: [
      { day: 'Tuesday', startTime: '10:00', endTime: '12:00', subject: 'Network Security' },
      { day: 'Thursday', startTime: '14:00', endTime: '17:00', subject: 'Cryptography Lab' }
    ]
  },
  {
    misNumber: '112401018',
    fullName: 'Rohan Patil',
    hostel: 'KRISHNA',
    roomNumber: 'K-408',
    course: 'B.Tech',
    batch: '2024-2028',
    branch: 'CSE',
    canTravelStanding: true,
    declaredAccessibilityNeed: false,
    rejectedRequestsLast14Days: 0,
    confirmedBookingsThisWeek: 4,
    weeklyClassTimetable: [
      { day: 'Today', startTime: '13:00', endTime: '15:30', subject: 'Operating Systems Lab' }
    ]
  },
  {
    misNumber: '212502005',
    fullName: 'Pooja Kulkarni',
    hostel: 'SINDHU',
    roomNumber: 'S-312',
    course: 'M.Tech',
    batch: '2025-2027',
    branch: 'ECE',
    canTravelStanding: true,
    declaredAccessibilityNeed: false,
    rejectedRequestsLast14Days: 3, // Max carry-over credit
    confirmedBookingsThisWeek: 0,
    weeklyClassTimetable: [
      { day: 'Wednesday', startTime: '09:00', endTime: '12:00', subject: 'Advanced VLSI Systems' }
    ]
  }
];

/**
 * Descriptive 4-Week Average Demand for T1–T10 (Purely Descriptive Summary; Zero ML)
 */
export const DESCRIPTIVE_4WEEK_AVERAGES = {
  T1: { averageRequests: 54, peakWeekday: 'Monday', capacity: 58, typicalDemandRatio: 0.93, statusNote: 'High morning rush for off-campus hostel' },
  T2: { averageRequests: 59, peakWeekday: 'Monday', capacity: 58, typicalDemandRatio: 1.02, statusNote: 'Overcrowding risk; students coming for 11:00 classes' },
  T3: { averageRequests: 32, peakWeekday: 'Wednesday', capacity: 58, typicalDemandRatio: 0.55, statusNote: 'Low risk; midday Talegaon Station rail link' },
  T4: { averageRequests: 41, peakWeekday: 'Thursday', capacity: 58, typicalDemandRatio: 0.71, statusNote: 'Medium risk; Talegaon Station inbound campus return' },
  T5: { averageRequests: 48, peakWeekday: 'Friday', capacity: 58, typicalDemandRatio: 0.83, statusNote: 'Medium risk; afternoon Talegaon Station express' },
  T6: { averageRequests: 62, peakWeekday: 'Friday', capacity: 58, typicalDemandRatio: 1.07, statusNote: 'High risk; weekend return from Talegaon Station' },
  T7: { averageRequests: 66, peakWeekday: 'Friday', capacity: 58, typicalDemandRatio: 1.14, statusNote: 'Severe contention; peak evening transit to Talegaon Station' },
  T8: { averageRequests: 38, peakWeekday: 'Tuesday', capacity: 35, typicalDemandRatio: 1.09, statusNote: 'High risk on 32-seater; Talegaon Station passenger pickup' },
  T9: { averageRequests: 45, peakWeekday: 'Sunday', capacity: 58, typicalDemandRatio: 0.78, statusNote: 'Medium risk; dinner/hostel return' },
  T10: { averageRequests: 28, peakWeekday: 'Saturday', capacity: 58, typicalDemandRatio: 0.48, statusNote: 'Low risk; late night Talegaon Station express shuttle' }
};
