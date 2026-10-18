import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ticket, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  Printer, 
  RotateCcw, 
  MapPin, 
  Bus, 
  UserCheck, 
  Award, 
  ShieldCheck, 
  ArrowRight, 
  Info, 
  ChevronRight,
  Download,
  QrCode,
  Users,
  Compass
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import { BookingStatusExplanation } from '../../components/passenger/BookingStatusExplanation';
import { TRIP_REASONS } from '../../data/iiitBusData';

/**
 * "My History" Page - Dedicated Student Trip History & Allocation Audit
 * Conforms strictly to Part 1 IIIT Pune Campus Bus Booking System:
 * 
 * 1. Summary Stats Header:
 *    - Total Trips Requested | Confirmed & Travelled | Waitlisted / Transferred | Cancelled Trips | Carry-Over Credits (Active: X/3)
 * 2. Filterable Tabs:
 *    - [ All Trips ] [ Active / Upcoming ] [ Completed ] [ Waitlisted / Cancelled ]
 * 3. Historical Entry Cards:
 *    - Trip Badge (e.g. Trip T7 • 17:30 Departure, 18 Oct 2026)
 *    - Route & Stop (IIIT Pune Main Gate ➔ Godavari Hostel)
 *    - Reason Badge (Medical, Train, Exam, etc.)
 *    - Status Pill (Confirmed [Seat 4D], Confirmed [Standing Place], Waitlisted [Rank #3], Cancelled, Infeasible)
 *    - Actions: [ View Explanation & Audit Trace ], [ Cancel Request ], [ Download E-Ticket / Receipt ]
 */
export const MyTripsPage = () => {
  const { announce } = useAccessibility();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Active student profile (authenticated via MIS)
  const student = useMemo(() => ({
    misNumber: user?.misNumber || '112203045',
    fullName: user?.fullName || 'Rahul Deshmukh',
    course: user?.course || 'B.Tech',
    branch: user?.branch || 'CSE',
    hostel: user?.hostel ? (user.hostel.includes('Hostel') ? user.hostel : `${user.hostel} Hostel`) : 'Krishna Hostel',
    roomNumber: user?.roomNumber || 'K-302',
    carryOverCredits: user?.rejectedRequestsLast14Days ?? 1,
    weeklyBookings: user?.confirmedBookingsThisWeek ?? 2
  }), [user]);

  // Active Filter Tab: 'ALL' | 'UPCOMING' | 'COMPLETED' | 'WAITLISTED_CANCELLED'
  const [activeTab, setActiveTab] = useState('ALL');

  // Modals
  const [selectedTripForExplanation, setSelectedTripForExplanation] = useState(null);
  const [selectedTripForTicket, setSelectedTripForTicket] = useState(null);

  // Seed / LocalStorage History
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('smartbus_my_trips');
    let loadedTrips = [];
    if (saved) {
      try {
        loadedTrips = JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored trips:', e);
      }
    }

    // Default rich realistic history for authenticated student
    const defaultHistory = [
      {
        id: 'REQ-2026-1018-01',
        tripId: 'T7',
        departureTime: '17:30',
        arrivalTime: '18:20',
        journeyDate: '18 Oct 2026',
        category: 'UPCOMING',
        route: 'IIIT Pune Campus ➔ Godavari Boys Hostel',
        origin: 'IIIT Pune Campus (Main Gate)',
        destination: 'Godavari Boys Hostel (Off-Campus Terminus)',
        tripReason: 'MEDICAL',
        tripReasonLabel: '🏥 Medical (Emergency Quota)',
        priorityTier: 1,
        isEmergencyQuota: true,
        allocatedSpot: 'Seat 1A',
        allocationType: 'SEAT',
        status: 'CONFIRMED',
        statusPillText: 'Confirmed (Seat 1A - Emergency Quota)',
        statusPillColor: 'EMERALD',
        busPlate: 'MH 14 BT 1001',
        busModel: 'Tata Starbus EV-52 (52-Seater)',
        requestTimestamp: '14:22:10',
        bookingTime: '18 Oct 2026, 14:22',
        canCancel: true,
        evaluation: {
          isFeasible: true,
          status: 'ALLOCATED',
          allocationType: 'SEAT',
          allocatedSpot: 'Seat 1A',
          isEmergencyQuota: true,
          explanation: {
            level1Headline: 'ALLOCATED: Seat 1A (Emergency Reserve Quota)',
            level2Reason: 'Allocated from Emergency Reserve Quota due to verified medical need / accessibility priority.',
            level3Audit: {
              exactCounterfactual: 'Your request had Tier 1 Emergency Priority. General seats were constrained, but Emergency Quota allocated Seat 1A immediately.',
              policyDecisionTrace: {
                rule1: 'Accessibility Need: Not declared',
                rule2: 'Reason Hierarchy: Medical (Tier 1 Priority - Emergency Quota eligible)',
                rule3: 'Carry-Over Credit: 1 unallocated request in last 14 days',
                rule4: 'Weekly Bookings: 2 bookings already made this week',
                rule5: 'Request Timestamp: Submitted at 14:22:10'
              }
            }
          }
        }
      },
      {
        id: 'REQ-2026-1019-02',
        tripId: 'T3',
        departureTime: '12:00',
        arrivalTime: '12:50',
        journeyDate: '19 Oct 2026',
        category: 'UPCOMING',
        route: 'IIIT Pune Campus ➔ Talegaon Railway Station',
        origin: 'IIIT Pune Campus (Main Gate)',
        destination: 'Talegaon Station',
        tripReason: 'TRAIN_CONNECTION',
        tripReasonLabel: '🚆 Train / Travel Connection',
        priorityTier: 2,
        isEmergencyQuota: false,
        allocatedSpot: 'Standing Spot S2',
        allocationType: 'STANDING',
        status: 'CONFIRMED',
        statusPillText: 'Confirmed (Standing Spot S2)',
        statusPillColor: 'TEAL',
        busPlate: 'MH 14 BT 1001',
        busModel: 'Tata Starbus EV-52 (52-Seater)',
        requestTimestamp: '09:15:40',
        bookingTime: '18 Oct 2026, 09:15',
        canCancel: true,
        evaluation: {
          isFeasible: true,
          status: 'ALLOCATED',
          allocationType: 'STANDING',
          allocatedSpot: 'Standing Spot S2',
          explanation: {
            level1Headline: 'ALLOCATED: Standing Spot S2',
            level2Reason: 'All 49 general seated places were allocated to higher tiers; your declared standing capability permitted allocation of an open standing spot.',
            level3Audit: {
              exactCounterfactual: 'If a seated student cancels or shifts departure, your standing allocation will automatically upgrade to a seated place.',
              policyDecisionTrace: {
                rule1: 'Accessibility Need: Not declared',
                rule2: 'Reason Hierarchy: Train Connection (Tier 2 Priority)',
                rule3: 'Carry-Over Credit: 1 unallocated request in last 14 days',
                rule4: 'Weekly Bookings: 2 bookings already made this week',
                rule5: 'Request Timestamp: Submitted at 09:15:40'
              }
            }
          }
        }
      },
      {
        id: 'REQ-2026-1020-03',
        tripId: 'T1',
        departureTime: '08:00',
        arrivalTime: '08:50',
        journeyDate: '20 Oct 2026',
        category: 'UPCOMING',
        route: 'IIIT Pune Campus ➔ Restaurant Chain / Talegaon',
        origin: 'IIIT Pune Campus (Main Gate)',
        destination: 'Restaurant Chain',
        tripReason: 'SHOPPING',
        tripReasonLabel: '🛍️ Shopping / Errands',
        priorityTier: 4,
        isEmergencyQuota: false,
        allocatedSpot: 'Waitlist Pos #3',
        allocationType: 'WAITLIST',
        status: 'WAITLISTED',
        statusPillText: 'Waitlisted (Rank #3)',
        statusPillColor: 'AMBER',
        busPlate: 'MH 14 BT 1001',
        busModel: 'Tata Starbus EV-52 (52-Seater)',
        requestTimestamp: '15:10:02',
        bookingTime: '18 Oct 2026, 15:10',
        canCancel: true,
        evaluation: {
          isFeasible: true,
          status: 'WAITLISTED',
          rank: 3,
          waitlistPosition: 3,
          explanation: {
            level1Headline: 'WAITLISTED: Rank #3 on Trip T1',
            level2Reason: 'This morning shuttle is at full capacity (49 general seats + 8 standing spots) with 62 competing student requests. Shopping is ranked below time-critical medical/train reasons.',
            level3Audit: {
              exactCounterfactual: 'If 3 confirmed students cancel, or if you switch to Trip T2 (09:15) with 14 free places, you will receive an immediate allocation.',
              policyDecisionTrace: {
                rule1: 'Accessibility Need: Not declared',
                rule2: 'Reason Hierarchy: Shopping / Errands (Ranked below Medical, Train, Exam)',
                rule3: 'Carry-Over Credit: 1 unallocated request in last 14 days',
                rule4: 'Weekly Bookings: 2 bookings already made this week',
                rule5: 'Request Timestamp: Submitted at 15:10:02'
              }
            }
          }
        }
      },
      {
        id: 'REQ-2026-1016-04',
        tripId: 'T10',
        departureTime: '21:30',
        arrivalTime: '22:15',
        journeyDate: '16 Oct 2026',
        category: 'COMPLETED',
        route: 'Godavari Boys Hostel ➔ IIIT Pune Campus',
        origin: 'Godavari Boys Hostel (Off-Campus Terminus)',
        destination: 'IIIT Pune Campus (Main Gate)',
        tripReason: 'PERSONAL',
        tripReasonLabel: '🏠 Hostel Transit / Personal',
        priorityTier: 5,
        isEmergencyQuota: false,
        allocatedSpot: 'Seat 8C',
        allocationType: 'SEAT',
        status: 'COMPLETED',
        statusPillText: 'Confirmed (Seat 8C)',
        statusPillColor: 'EMERALD',
        busPlate: 'MH 14 BT 1002',
        busModel: 'Ashok Leyland Oyster-52',
        requestTimestamp: '18:45:12',
        bookingTime: '16 Oct 2026, 18:45',
        canCancel: false,
        evaluation: {
          isFeasible: true,
          status: 'ALLOCATED',
          allocationType: 'SEAT',
          allocatedSpot: 'Seat 8C',
          explanation: {
            level1Headline: 'COMPLETED: Seat 8C Travelled',
            level2Reason: 'Trip completed successfully. Night return shuttle had sufficient capacity for all hostel residents.',
            level3Audit: {
              exactCounterfactual: 'Completed trip record logged in campus transport ledger.',
              policyDecisionTrace: {
                rule1: 'Accessibility Need: Not declared',
                rule2: 'Reason Hierarchy: Hostel Transit / Personal',
                rule3: 'Carry-Over Credit: 0 active at time of booking',
                rule4: 'Weekly Bookings: 1 booking already made this week',
                rule5: 'Request Timestamp: Submitted at 18:45:12'
              }
            }
          }
        }
      },
      {
        id: 'REQ-2026-1014-05',
        tripId: 'T6',
        departureTime: '16:30',
        arrivalTime: '17:15',
        journeyDate: '14 Oct 2026',
        category: 'COMPLETED',
        route: 'IIIT Pune Campus ➔ L&T Circle',
        origin: 'IIIT Pune Campus (Main Gate)',
        destination: 'L&T Circle',
        tripReason: 'EXAM',
        tripReasonLabel: '📝 Exam / Academic Deadline',
        priorityTier: 3,
        isEmergencyQuota: false,
        allocatedSpot: 'Seat 3B',
        allocationType: 'SEAT',
        status: 'COMPLETED',
        statusPillText: 'Confirmed (Seat 3B)',
        statusPillColor: 'EMERALD',
        busPlate: 'MH 14 BT 1001',
        busModel: 'Tata Starbus EV-52',
        requestTimestamp: '11:05:00',
        bookingTime: '14 Oct 2026, 11:05',
        canCancel: false,
        evaluation: {
          isFeasible: true,
          status: 'ALLOCATED',
          allocationType: 'SEAT',
          allocatedSpot: 'Seat 3B',
          explanation: {
            level1Headline: 'COMPLETED: Seat 3B Travelled',
            level2Reason: 'Allocated under Tier 3 Academic/Exam Priority.',
            level3Audit: {
              exactCounterfactual: 'Completed trip record archived.',
              policyDecisionTrace: {
                rule1: 'Accessibility Need: Not declared',
                rule2: 'Reason Hierarchy: Exam / Academic (Tier 3 Priority)',
                rule3: 'Carry-Over Credit: 0 active at time of booking',
                rule4: 'Weekly Bookings: 0 bookings this week',
                rule5: 'Request Timestamp: Submitted at 11:05:00'
              }
            }
          }
        }
      },
      {
        id: 'REQ-2026-1012-06',
        tripId: 'T2',
        departureTime: '09:15',
        arrivalTime: '10:00',
        journeyDate: '12 Oct 2026',
        category: 'CANCELLED',
        route: 'Talegaon Station ➔ IIIT Pune Campus',
        origin: 'Talegaon Station',
        destination: 'IIIT Pune Campus (Main Gate)',
        tripReason: 'PERSONAL',
        tripReasonLabel: '🏠 Personal / Errands',
        priorityTier: 5,
        isEmergencyQuota: false,
        allocatedSpot: 'Released',
        allocationType: 'SEAT',
        status: 'CANCELLED',
        statusPillText: 'Cancelled',
        statusPillColor: 'GRAY',
        busPlate: 'MH 14 BT 1002',
        busModel: 'Ashok Leyland Oyster-52',
        requestTimestamp: '08:10:00',
        bookingTime: '12 Oct 2026, 08:10',
        canCancel: false,
        evaluation: {
          isFeasible: true,
          status: 'CANCELLED',
          explanation: {
            level1Headline: 'CANCELLED: Reservation Relinquished',
            level2Reason: 'Request voluntarily cancelled prior to 30-minute departure cutoff. Seat instantly reassigned to first waitlisted student.',
            level3Audit: {
              exactCounterfactual: 'Cancellation within cut-off preserves commuter reputation and releases seat to waitlisted students.',
              policyDecisionTrace: {
                rule1: 'Accessibility Need: Not declared',
                rule2: 'Reason Hierarchy: Personal',
                rule3: 'Carry-Over Credit: 0 used',
                rule4: 'Weekly Bookings: Quota restored upon timely cancellation',
                rule5: 'Request Timestamp: Cancelled at 08:35:00'
              }
            }
          }
        }
      },
      {
        id: 'REQ-2026-1011-07',
        tripId: 'T1',
        departureTime: '08:00',
        arrivalTime: '08:50',
        journeyDate: '11 Oct 2026',
        category: 'INFEASIBLE',
        route: 'Talegaon Station ➔ IIIT Pune Campus (Mismatch)',
        origin: 'Talegaon Station',
        destination: 'IIIT Pune Campus (Main Gate)',
        tripReason: 'SHOPPING',
        tripReasonLabel: '🛍️ Shopping / Personal',
        priorityTier: 5,
        isEmergencyQuota: false,
        allocatedSpot: 'None',
        allocationType: 'NONE',
        status: 'INFEASIBLE',
        statusPillText: 'Infeasible (Direction Mismatch)',
        statusPillColor: 'ROSE',
        busPlate: 'MH 14 BT 1001',
        busModel: 'Tata Starbus EV-52',
        requestTimestamp: '07:30:15',
        bookingTime: '11 Oct 2026, 07:30',
        canCancel: false,
        evaluation: {
          isFeasible: false,
          status: 'DIRECTION_MISMATCH',
          explanation: {
            level1Headline: 'Constraint Failed: Trip Direction Mismatch',
            level2Reason: 'Trip T1 departs toward Godavari Hostel/Talegaon (Outbound). Requested destination must be a stop along this outbound path.',
            level3Audit: {
              exactCounterfactual: 'Select an Inbound trip (e.g., T2 departing at 09:15 from Talegaon) to travel toward campus.',
              policyDecisionTrace: {
                rule1: 'Accessibility Need: Not declared',
                rule2: 'Reason Hierarchy: General / Leisure',
                rule3: 'Carry-Over Credit: Ineligible on hard constraint failure',
                rule4: 'Weekly Bookings: Not decremented',
                rule5: 'Request Timestamp: Submitted at 07:30:15'
              }
            }
          }
        }
      }
    ];

    // Strict filtering: purge any legacy PMPML / Pune city bus data
    const isLegacyPmpml = (item) => {
      if (!item) return true;
      const pnr = (item.pnr || item.id || '').toUpperCase();
      if (pnr.startsWith('PMPML') || pnr.startsWith('PMP-')) return true;
      if (item.totalPrice > 0 || (item.fareBreakdown && item.fareBreakdown.total > 0)) return true;
      const routeText = `${item.route || ''} ${item.origin || ''} ${item.destination || ''} ${item.busName || ''}`.toLowerCase();
      if (
        routeText.includes('swargate') ||
        routeText.includes('pmpml') ||
        routeText.includes('katraj') ||
        routeText.includes('hadapsar') ||
        routeText.includes('hinjawadi') ||
        routeText.includes('kothrud') ||
        routeText.includes('pune station') ||
        routeText.includes('sarasbaug') ||
        routeText.includes('nigdi') ||
        routeText.includes('bhosari')
      ) {
        return true;
      }
      const hasCampusTripId = item.tripId && /^T\d+$/i.test(item.tripId);
      const isCampusRoute = routeText.includes('iiit') || routeText.includes('godavari') || routeText.includes('talegaon');
      return !hasCampusTripId && !isCampusRoute;
    };

    const validCampusTrips = loadedTrips.filter(t => !isLegacyPmpml(t));

    // Ensure all campus trips have a complete evaluation object for audit view
    const sanitizedTrips = validCampusTrips.map(t => {
      if (!t.evaluation) {
        return {
          ...t,
          busPlate: t.busPlate || 'MH 14 BT 1001',
          busModel: t.busModel || 'Tata Starbus EV-52 (52-Seater)',
          evaluation: {
            isFeasible: true,
            status: t.status === 'CONFIRMED' ? 'ALLOCATED' : (t.status || 'ALLOCATED'),
            allocationType: t.allocationType || (t.allocatedSpot?.toLowerCase().includes('standing') ? 'STANDING' : 'SEAT'),
            allocatedSpot: t.allocatedSpot || 'Seat 4D',
            isEmergencyQuota: Boolean(t.isEmergencyQuota),
            explanation: {
              level1Headline: `Seat Confirmed (${t.allocatedSpot || 'Seat 4D'})`,
              level2Reason: `Your seat (${t.allocatedSpot || 'Seat 4D'}) is confirmed on the ${t.departureTime || '08:00'} IIIT Pune Campus Shuttle. Transport is free with your student MIS ID.`,
              level3Audit: {
                exactCounterfactual: 'Your reservation is confirmed under standard student transport guidelines.',
                policyDecisionTrace: {
                  rule1: 'Student ID: Verified (MIS ID)',
                  rule2: `Travel Purpose: ${t.tripReasonLabel || t.tripReason || 'Campus Commute'}`,
                  rule3: `Allocated Place: ${t.allocatedSpot || 'Seat 4D'}`,
                  rule4: 'Fare: ₹0 (Free Student Pass)',
                  rule5: `Reporting: Please arrive 5 minutes before scheduled departure`
                }
              }
            }
          }
        };
      }
      return t;
    });

    if (sanitizedTrips.length === 0) {
      setTrips(defaultHistory);
      localStorage.setItem('smartbus_my_trips', JSON.stringify(defaultHistory));
      localStorage.setItem('iiit_campus_trip_history', JSON.stringify(defaultHistory));
    } else {
      const existingIds = new Set(sanitizedTrips.map(t => t.id || t.pnr));
      const merged = [...sanitizedTrips];
      defaultHistory.forEach(item => {
        if (!existingIds.has(item.id)) {
          merged.push(item);
        }
      });
      setTrips(merged);
      localStorage.setItem('smartbus_my_trips', JSON.stringify(merged));
      localStorage.setItem('iiit_campus_trip_history', JSON.stringify(merged));
    }
  }, []);

  // Compute summary stats dynamically
  const stats = useMemo(() => {
    const total = trips.length;
    const confirmed = trips.filter(t => t.status === 'CONFIRMED' || t.status === 'COMPLETED').length;
    const waitlisted = trips.filter(t => t.status === 'WAITLISTED').length;
    const cancelled = trips.filter(t => t.status === 'CANCELLED').length;
    return {
      total,
      confirmed,
      waitlisted,
      cancelled,
      carryOverCredits: student.carryOverCredits
    };
  }, [trips, student]);

  // Filtered trips list based on active tab
  const filteredTrips = useMemo(() => {
    if (activeTab === 'UPCOMING') {
      return trips.filter(t => t.category === 'UPCOMING' || t.status === 'CONFIRMED' || t.status === 'WAITLISTED');
    }
    if (activeTab === 'COMPLETED') {
      return trips.filter(t => t.category === 'COMPLETED' || t.status === 'COMPLETED');
    }
    if (activeTab === 'WAITLISTED_CANCELLED') {
      return trips.filter(t => t.status === 'WAITLISTED' || t.status === 'CANCELLED' || t.status === 'INFEASIBLE');
    }
    return trips;
  }, [trips, activeTab]);

  // Cancel upcoming request handler
  const handleCancelRequest = (tripToCancel) => {
    const tripName = `Trip ${tripToCancel.tripId} (${tripToCancel.departureTime})`;
    if (window.confirm(`Are you sure you want to cancel ${tripName}? Releasing your place will immediately promote the highest-priority waitlisted commuter.`)) {
      const updated = trips.map(t => {
        if ((t.id || t.pnr) === (tripToCancel.id || tripToCancel.pnr)) {
          return {
            ...t,
            status: 'CANCELLED',
            category: 'CANCELLED',
            canCancel: false,
            statusPillText: 'Cancelled',
            statusPillColor: 'GRAY',
            evaluation: {
              ...t.evaluation,
              status: 'CANCELLED',
              explanation: {
                level1Headline: 'CANCELLED: Reservation Relinquished',
                level2Reason: 'Request voluntarily cancelled. Your weekly quota has been restored.',
                level3Audit: {
                  exactCounterfactual: 'Seat released to waiting list commuters.',
                  policyDecisionTrace: {
                    rule1: 'Accessibility Need: Preserved',
                    rule2: 'Reason Hierarchy: Cancelled',
                    rule3: 'Carry-Over Credit: Intact',
                    rule4: 'Weekly Bookings: Quota restored',
                    rule5: `Request Timestamp: Cancelled at ${new Date().toLocaleTimeString()}`
                  }
                }
              }
            }
          };
        }
        return t;
      });

      setTrips(updated);
      localStorage.setItem('smartbus_my_trips', JSON.stringify(updated));
      localStorage.setItem('iiit_campus_trip_history', JSON.stringify(updated));
      announce(`${tripName} cancelled successfully.`);
    }
  };

  // Helper for status pill styling
  const renderStatusPill = (trip) => {
    const pill = trip.statusPillColor || (
      trip.status === 'CONFIRMED' ? (trip.allocationType === 'STANDING' ? 'TEAL' : 'EMERALD') :
      trip.status === 'COMPLETED' ? 'EMERALD' :
      trip.status === 'WAITLISTED' ? 'AMBER' :
      trip.status === 'CANCELLED' ? 'GRAY' : 'ROSE'
    );

    const colorClasses = {
      EMERALD: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-200',
      TEAL: 'bg-teal-50 text-teal-800 border-teal-300 ring-1 ring-teal-200',
      AMBER: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-200',
      GRAY: 'bg-slate-100 text-slate-600 border-slate-300',
      ROSE: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-200'
    }[pill] || 'bg-slate-100 text-slate-700 border-slate-300';

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${colorClasses}`}>
        {trip.status === 'CONFIRMED' || trip.status === 'COMPLETED' ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : trip.status === 'WAITLISTED' ? (
          <Clock className="w-3.5 h-3.5" />
        ) : trip.status === 'CANCELLED' ? (
          <X className="w-3.5 h-3.5" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5" />
        )}
        <span>{trip.statusPillText || trip.status}</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#0f172a]">
      
      {/* 1. Header Banner & Student Context */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-[#0369a1]" />
            <h1 className="text-2xl sm:text-[2.25rem] font-bold font-heading text-slate-900 tracking-[-0.02em]">
              My History
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
            Complete auditable ledger of your IIIT Pune Campus Shuttle requests, allocations, and deterministic fairness traces.
          </p>
        </div>

        {/* Student Context Capsule */}
        <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0369a1] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-slate-900">
              <span className="font-mono text-[#0369a1] mr-1.5">[MIS: {student.misNumber}]</span>
              {student.fullName}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {student.course} ({student.branch}) • {student.hostel} ({student.roomNumber})
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUMMARY STATS HEADER (SECTION 3.A) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        {/* Total Trips Requested */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Requested
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
            {stats.total}
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">
            All semester submissions
          </span>
        </div>

        {/* Confirmed & Travelled */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
            Confirmed & Travelled
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
            {stats.confirmed}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium block">
            Seats & standing places
          </span>
        </div>

        {/* Waitlisted / Transferred */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/30 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
            Waitlisted
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 tabular-nums">
            {stats.waitlisted}
          </div>
          <span className="text-[10px] text-amber-600 font-medium block">
            Pending cut-off resolution
          </span>
        </div>

        {/* Cancelled Trips */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Cancelled Trips
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-700 tabular-nums">
            {stats.cancelled}
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">
            Voluntary releases
          </span>
        </div>

        {/* Carry-Over Credits (Active: X/3) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/40 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
              Carry-Over Credits
            </span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700 tabular-nums">
            Active: {stats.carryOverCredits}/3
          </div>
          <span className="text-[10px] text-purple-600 font-medium block leading-tight">
            Section 5.3: Prioritizes unserved peak requests
          </span>
        </div>

      </div>

      {/* 3. FILTERABLE TABS (SECTION 3.B) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { key: 'ALL', label: 'All Trips', count: trips.length },
          { key: 'UPCOMING', label: 'Active / Upcoming', count: trips.filter(t => t.category === 'UPCOMING' || t.status === 'CONFIRMED' || t.status === 'WAITLISTED').length },
          { key: 'COMPLETED', label: 'Completed', count: trips.filter(t => t.category === 'COMPLETED' || t.status === 'COMPLETED').length },
          { key: 'WAITLISTED_CANCELLED', label: 'Waitlisted / Cancelled', count: trips.filter(t => t.status === 'WAITLISTED' || t.status === 'CANCELLED' || t.status === 'INFEASIBLE').length }
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-[#0369a1] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. HISTORICAL ENTRY CARDS LIST */}
      <div className="space-y-4">
        {filteredTrips.length === 0 ? (
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-12 text-center space-y-3">
            <Ticket className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No requests in this view</h3>
            <p className="text-xs text-slate-500">Switch tabs or submit a new trip request from the home page.</p>
          </div>
        ) : (
          filteredTrips.map((entry) => (
            <div 
              key={entry.id || entry.pnr}
              className="bg-white border-2 border-slate-200 hover:border-sky-300 rounded-3xl p-5 sm:p-6 shadow-xs transition-all space-y-4"
            >
              {/* Card Header Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                
                {/* Trip Badge */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="px-3 py-1 rounded-xl text-xs font-bold font-mono bg-sky-50 text-[#0369a1] border border-sky-200">
                    Trip {entry.tripId} • {entry.departureTime} Departure
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {entry.journeyDate}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    (Ref: {entry.id || entry.pnr})
                  </span>
                </div>

                {/* Status Pill */}
                <div>
                  {renderStatusPill(entry)}
                </div>

              </div>

              {/* Route & Reason & Fleet Meta */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Route & Stop */}
                <div className="md:col-span-5 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Campus Route
                  </div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#0369a1] shrink-0" />
                    <span>{entry.origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{entry.destination}</span>
                  </div>
                  <div className="text-xs text-slate-500 pl-6">
                    Bus Plate: <span className="font-mono font-bold text-slate-700">{entry.busPlate}</span> ({entry.busModel})
                  </div>
                </div>

                {/* Reason Badge */}
                <div className="md:col-span-3 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Reason Hierarchy
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                    <span>{entry.tripReasonLabel || entry.tripReason}</span>
                  </div>
                  {entry.isEmergencyQuota && (
                    <div className="text-[10px] text-rose-700 font-bold flex items-center gap-1 mt-0.5">
                      <span>🚨 Allocated from Emergency Reserve Quota</span>
                    </div>
                  )}
                </div>

                {/* Allocated Place */}
                <div className="md:col-span-4 space-y-1 text-left md:text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Allocated Place
                  </div>
                  <div className="text-sm font-extrabold text-[#0369a1]">
                    {entry.allocatedSpot}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Fare: <span className="font-bold text-emerald-700">₹0 (Student Pass)</span>
                  </div>
                </div>

              </div>

              {/* Interactive Actions Strip */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                
                {/* View Explanation & Audit Trace */}
                <button
                  type="button"
                  id={`view-explanation-btn-${entry.id}`}
                  onClick={() => setSelectedTripForExplanation(entry)}
                  className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100/80 text-[#0369a1] border border-sky-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ShieldCheck className="w-4 h-4 text-[#0369a1]" />
                  <span>View Explanation & Audit Trace</span>
                </button>

                <div className="flex items-center gap-2">
                  
                  {/* Cancel Request (Upcoming only) */}
                  {entry.canCancel && entry.status !== 'CANCELLED' && entry.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      id={`cancel-request-btn-${entry.id}`}
                      onClick={() => handleCancelRequest(entry)}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel Request</span>
                    </button>
                  )}

                  {/* Download E-Ticket / Receipt (Confirmed bookings) */}
                  {(entry.status === 'CONFIRMED' || entry.status === 'COMPLETED') && (
                    <button
                      type="button"
                      id={`download-ticket-btn-${entry.id}`}
                      onClick={() => setSelectedTripForTicket(entry)}
                      className="px-3.5 py-2 rounded-xl bg-[#0369a1] hover:bg-[#0284c7] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download E-Ticket</span>
                    </button>
                  )}

                </div>

              </div>

            </div>
          ))
        )}
      </div>

      {/* ========================================================
          MODAL 1: 3-LEVEL EXPLANATION & AUDIT TRACE MODAL
          ======================================================== */}
      {selectedTripForExplanation && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="historyExplanationHeading"
        >
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-[#0f172a]">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-100 text-[#0369a1] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="historyExplanationHeading" className="text-base sm:text-lg font-bold text-slate-900">
                    Decision Explanation & Policy Audit Trace
                  </h3>
                  <span className="text-xs font-semibold text-slate-500 font-mono">
                    Trip {selectedTripForExplanation.tripId} ({selectedTripForExplanation.departureTime}) • Ref: {selectedTripForExplanation.id}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTripForExplanation(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Render BookingStatusExplanation with faithful pre-computed or generated result */}
            <BookingStatusExplanation
              booking={{
                misNumber: student.misNumber,
                userName: student.fullName,
                course: student.course,
                branch: student.branch,
                hostel: student.hostel,
                roomNumber: student.roomNumber,
                declaredAccessibilityNeed: selectedTripForExplanation.tripReason === 'MEDICAL',
                canTravelStanding: selectedTripForExplanation.allocationType === 'STANDING',
                rejectedRequestsLast14Days: student.carryOverCredits,
                confirmedBookingsThisWeek: student.weeklyBookings,
                tripId: selectedTripForExplanation.tripId,
                tripPurpose: selectedTripForExplanation.tripReason,
                droppingPoint: selectedTripForExplanation.destination,
                boardingPoint: selectedTripForExplanation.origin,
                journeyDate: selectedTripForExplanation.journeyDate
              }}
              evaluationResult={selectedTripForExplanation.evaluation}
              showSimulatorControls={false}
            />

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTripForExplanation(null)}
                className="py-2.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl transition-all"
              >
                Close Audit View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: PRINTABLE E-TICKET / BOARDING PASS RECEIPT
          ======================================================== */}
      {selectedTripForTicket && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="eTicketHeading"
        >
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6 text-[#0f172a] max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-[#0369a1] flex items-center justify-center font-bold">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="eTicketHeading" className="text-base font-bold text-slate-900">
                    IIIT Pune Campus Shuttle E-Pass
                  </h3>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    Pass Ref: {selectedTripForTicket.id || selectedTripForTicket.pnr}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTripForTicket(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl"
                aria-label="Close ticket"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Boarding Card Body */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              
              {/* Trip & Time */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Departure</span>
                  <span className="text-xl font-black text-slate-900 font-mono">{selectedTripForTicket.departureTime}</span>
                  <span className="text-xs text-slate-500 block">{selectedTripForTicket.journeyDate}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Allocated Place</span>
                  <span className="text-base font-extrabold text-[#0369a1] block">{selectedTripForTicket.allocatedSpot}</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    Free Student Pass
                  </span>
                </div>
              </div>

              {/* Commuter MIS */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Student Name</span>
                  <span className="font-bold text-slate-900">{student.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">MIS Number</span>
                  <span className="font-mono font-bold text-slate-900">{student.misNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Hostel & Room</span>
                  <span className="text-slate-700">{student.hostel} ({student.roomNumber})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Bus Plate</span>
                  <span className="font-mono font-bold text-slate-800">{selectedTripForTicket.busPlate}</span>
                </div>
              </div>

              {/* Route */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Route Stops</div>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span>{selectedTripForTicket.origin}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{selectedTripForTicket.destination}</span>
                </div>
              </div>

              {/* QR Verification Placeholder */}
              <div className="p-3 bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Boarding Verification</span>
                  <span className="text-xs text-slate-600 block">Present digital token to driver on embarkation</span>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center font-mono text-xs text-slate-700 font-bold border border-slate-200">
                  <QrCode className="w-8 h-8 text-slate-700" />
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#0369a1] hover:bg-[#0284c7] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save Pass (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTripForTicket(null)}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
