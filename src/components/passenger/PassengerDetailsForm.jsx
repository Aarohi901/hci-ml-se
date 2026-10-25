import React from 'react';
import { 
  HeartPulse, 
  Train, 
  GraduationCap, 
  ShoppingBag, 
  User, 
  MoreHorizontal, 
  Accessibility, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Compass, 
  Sparkles,
  Footprints,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { TRIP_REASONS } from '../../data/iiitBusData';
import { checkTimetableClash } from '../../utils/allocationEngine';

/**
 * Section 2: Trip Request Capture Form Component
 * Strictly captures Destination Stop, Reason for Trip (with mandatory note for Other),
 * Acceptable Window (±30m, ±60m), Accessibility Need, and Standing Travel Preference.
 */
export const PassengerDetailsForm = ({
  passengerIndex = 0,
  passenger = {},
  onChange = () => {},
  selectedTrip = null,
  studentProfile = {}
}) => {
  const currentReason = (passenger.tripReason || passenger.tripPurpose || 'TRAIN_CONNECTION').toUpperCase();
  const reasonNote = passenger.reasonNote || '';
  const isA11yNeed = Boolean(passenger.declaredAccessibilityNeed || passenger.isDivyang);
  const canTravelStanding = passenger.canTravelStanding ?? (studentProfile.canTravelStanding ?? true);
  const acceptableWindow = passenger.acceptableWindowMinutes ?? (passenger.isFlexible ? 30 : 0);

  // Check for timetable clash with student's schedule
  const clashResult = checkTimetableClash(
    studentProfile?.weeklyClassTimetable || passenger?.weeklyClassTimetable || [],
    selectedTrip
  );

  const handleReasonSelect = (key) => {
    onChange({
      ...passenger,
      tripReason: key,
      tripPurpose: key
    });
  };

  const handleNoteChange = (e) => {
    onChange({
      ...passenger,
      reasonNote: e.target.value
    });
  };

  const handleA11yToggle = (e) => {
    onChange({
      ...passenger,
      declaredAccessibilityNeed: e.target.checked,
      isDivyang: e.target.checked
    });
  };

  const handleStandingToggle = (e) => {
    onChange({
      ...passenger,
      canTravelStanding: e.target.checked
    });
  };

  const handleWindowChange = (mins) => {
    onChange({
      ...passenger,
      isFlexible: mins > 0,
      acceptableWindowMinutes: mins,
      flexibleWindowMinutes: mins
    });
  };

  const reasonList = [
    { key: 'MEDICAL', label: 'Medical Appointment', icon: HeartPulse, desc: 'Highest priority tier under high demand' },
    { key: 'TRAIN_CONNECTION', label: 'Train / Travel Connection', icon: Train, desc: 'Station catches with tight transfer times' },
    { key: 'EXAM', label: 'Exam / Academic Deadline', icon: GraduationCap, desc: 'Official coursework or examination' },
    { key: 'SHOPPING', label: 'Shopping / Errands', icon: ShoppingBag, desc: 'Grocery, pharmacy or market visits' },
    { key: 'PERSONAL', label: 'Personal / Leisure', icon: User, desc: 'General outings and campus departures' },
    { key: 'OTHER', label: 'Other Purpose', icon: MoreHorizontal, desc: 'Mandatory short explanatory note required' }
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm text-slate-900 transition-all">
      
      {/* 1. Student Context & Authenticated Profile Strip */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Student Trip Request & Travel Purpose</span>
            {passenger.seatId && (
              <span className="text-xs font-mono font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                Seat {passenger.seatId}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            MIS: <strong className="text-slate-800 font-mono">{studentProfile.misNumber || '112603001'}</strong> • 
            Hostel: <strong className="text-slate-800">{studentProfile.hostel || 'GODAVARI'} ({studentProfile.roomNumber || 'G-214'})</strong> • 
            Branch: <strong className="text-slate-800">{studentProfile.course || 'B.Tech'} {studentProfile.branch || 'AIDS'}</strong>
          </p>
        </div>

        {/* Priority Status Pill */}
        <div className="px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 bg-sky-50 border-sky-200 text-sky-900 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          <span className="font-semibold">Rule-Based Priority Scoring</span>
        </div>
      </div>

      {/* TIMETABLE CLASH WARNING WITH SOFT OVERRIDE (SECTION 13.4) */}
      {clashResult.hasClash && (
        <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-900 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold text-amber-950 block">⚠️ Class Schedule Conflict Warning</strong>
              <p>{clashResult.explanation}</p>
              <p className="text-[11px] text-amber-800">
                Warning: Trip {selectedTrip?.tripId || ''} ({selectedTrip?.departureTime || ''}) overlaps with your listed {clashResult.clashingSlot?.subject || 'Class'}. Do you still wish to request this shuttle?
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-200">
            <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-amber-950">
              <input
                type="checkbox"
                id="chk-passenger-override-clash"
                checked={Boolean(passenger.overrideClassClash)}
                onChange={(e) => onChange({ ...passenger, overrideClassClash: e.target.checked })}
                className="w-4 h-4 rounded text-amber-600 border-amber-300 focus:ring-amber-500 cursor-pointer"
              />
              <span>Yes, I have permission / lab is cancelled today</span>
            </label>
            <button
              type="button"
              onClick={() => {
                try {
                  const raw = localStorage.getItem('iiit_campus_student');
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    parsed.weeklyClassTimetable = [];
                    localStorage.setItem('iiit_campus_student', JSON.stringify(parsed));
                  }
                  const rawLegacy = localStorage.getItem('smartbus_auth_user');
                  if (rawLegacy) {
                    const parsed = JSON.parse(rawLegacy);
                    parsed.weeklyClassTimetable = [];
                    localStorage.setItem('smartbus_auth_user', JSON.stringify(parsed));
                  }
                } catch (e) {}
                onChange({ ...passenger, weeklyClassTimetable: [], overrideClassClash: true });
              }}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline self-start sm:self-auto cursor-pointer"
            >
              Clear All Class Clashes
            </button>
          </div>
        </div>
      )}

      {/* 2. REASON FOR TRIP SELECTION GRID */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>Reason for Trip (Deterministic Hierarchy) <span className="text-rose-500">*</span></span>
          <span className="text-[11px] font-normal text-slate-500">Evaluated strictly by Stage A Policy</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {reasonList.map((r) => {
            const Icon = r.icon;
            const isSelected = currentReason === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => handleReasonSelect(r.key)}
                className={`text-left p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200 text-sky-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{r.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{r.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mandatory Note for OTHER */}
        {currentReason === 'OTHER' && (
          <div className="pt-2 animate-fade-in">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Short Note for "Other" Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reasonNote}
              onChange={handleNoteChange}
              placeholder="e.g. Attending off-campus research symposium / official university errand..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
              required
            />
          </div>
        )}
      </div>

      {/* 3. ACCEPTABLE TIME WINDOW (SCHEDULE FLEXIBILITY) */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Acceptable Time Window (Stage B Alternative Suggestions)</span>
          </label>
          <span className="text-[11px] text-slate-500 font-medium">
            Active: {acceptableWindow > 0 ? `±${acceptableWindow} mins` : 'Exact trip only'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { mins: 0, label: 'Exact Trip Only', sub: 'No time flexibility' },
            { mins: 30, label: '±30 Minutes', sub: 'Adjacent trip' },
            { mins: 60, label: '±60 Minutes', sub: 'High availability' }
          ].map(opt => (
            <button
              key={opt.mins}
              type="button"
              onClick={() => handleWindowChange(opt.mins)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                acceptableWindow === opt.mins
                  ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-semibold">{opt.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. STANDING CAPACITY & ACCESSIBILITY TOGGLES */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
          <input
            type="checkbox"
            checked={canTravelStanding}
            onChange={handleStandingToggle}
            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 mt-0.5"
          />
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Can Travel Standing? (Standing Capacity Eligible)
            </span>
            <span className="text-[11px] text-slate-500 leading-snug">
              If unchecked, you will only be allocated seated spots (50/30). If seated places are full, you will be placed on the waitlist instead of standing.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
          <input
            type="checkbox"
            checked={isA11yNeed}
            onChange={handleA11yToggle}
            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 mt-0.5"
          />
          <div>
            <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
              <Accessibility className="w-3.5 h-3.5 text-sky-600" />
              <span>Accessibility / Reduced-Mobility Need (Rule 1 Top Priority)</span>
            </span>
            <span className="text-[11px] text-slate-500 leading-snug">
              Declare medical accessibility requirement for priority reservation on ramp-accessible shuttles (Bus 1 & Bus 2).
            </span>
          </div>
        </label>
      </div>

    </div>
  );
};
