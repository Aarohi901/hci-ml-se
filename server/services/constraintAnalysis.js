/**
 * server/services/constraintAnalysis.js
 * 
 * Hard constraint validation service for IIIT Pune campus bus requests.
 * Evaluates route direction matching, cut-off windows, and class timetable clashes.
 * 
 * Per Section 13.4 of the BusMate specification:
 * 'Class timetable entry is tedious, so students skip it. Make it optional, start with a simple grid, 
 * say plainly what the system can and cannot check without it.'
 * 
 * 1. Bypasses schedule clash check entirely if no active timetable is saved.
 * 2. Supports soft clash override ('Proceed Anyway / Permission / Lab Cancelled Today').
 */

import { 
  checkTimetableClash, 
  evaluateRequestConstraints,
  evaluateIIITCampusAllocation 
} from '../../src/utils/allocationEngine.js';

export {
  checkTimetableClash,
  evaluateRequestConstraints,
  evaluateIIITCampusAllocation
};

export default {
  checkTimetableClash,
  evaluateRequestConstraints,
  evaluateIIITCampusAllocation
};
