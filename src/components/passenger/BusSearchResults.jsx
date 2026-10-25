import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bus, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  Filter, 
  SlidersHorizontal, 
  Wifi, 
  Zap, 
  RotateCcw, 
  AlertCircle,
  ChevronDown,
  Sparkles,
  Info,
  Accessibility,
  Volume2,
  Wind,
  CheckCircle2,
  Users
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTranslation } from '../../context/TranslationContext';
import { TIMETABLE, FLEET, STOPS, ROUTE_INFO } from '../../data/iiitBusData';
import { getTripCapacity } from '../../utils/allocationEngine';

export const BusSearchResults = ({ 
  from = 'IIIT Pune Campus (Main Gate)', 
  to = 'Godavari Boys Hostel (Off-Campus Terminus & Railway Station Connection Point)', 
  date = new Date().toISOString().split('T')[0], 
  buses = [], 
  onSelectBus 
}) => {
  const { announce } = useAccessibility();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);

  // Facet Filters State
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]); // 'morning', 'afternoon', 'evening', 'night'
  const [selectedBusTypes, setSelectedBusTypes] = useState([]); // 'bus1', 'bus2', 'bus3'
  const [selectedAmenities, setSelectedAmenities] = useState([]); // 'ramp', 'ac', 'usb'
  const [sortBy, setSortBy] = useState('departure_asc'); // 'departure_asc', 'departure_desc', 'capacity_desc'
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Trigger a brief skeleton loader whenever core search terms change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [from, to, date]);

  // Derive search direction
  const fromStop = STOPS.find(s => s.name.toLowerCase() === from.toLowerCase()) || STOPS[0];
  const toStop = STOPS.find(s => s.name.toLowerCase() === to.toLowerCase()) || STOPS[4];
  const searchDirection = (toStop.index || 5) > (fromStop.index || 1) ? 'AWAY_FROM_CAMPUS' : 'TOWARD_CAMPUS';

  // Build the 10-Trip Daily Timetable list
  const enrichedBuses = useMemo(() => {
    return TIMETABLE.map((trip) => {
      const busInfo = FLEET.find(b => b.busId === trip.assignedBus) || FLEET[0];
      const cap = getTripCapacity(trip);
      const [h, m] = trip.departureTime.split(':').map(Number);

      let slot = 'night';
      if (h >= 6 && h < 12) slot = 'morning';
      else if (h >= 12 && h < 17) slot = 'afternoon';
      else if (h >= 17 && h < 22) slot = 'evening';

      const isDirectionMatch = trip.direction === searchDirection;

      return {
        id: trip.tripId,
        tripId: trip.tripId,
        busId: busInfo.busId,
        routeNumber: trip.tripId,
        operator: 'IIIT Pune Transport Department',
        busClass: `${busInfo.model} (${busInfo.seats} Seats + ${busInfo.standingPlaces} Standing)`,
        busPlate: busInfo.plateNumber,
        driverName: busInfo.driverName,
        origin: trip.origin,
        destination: trip.destination,
        boardingPointShort: trip.origin.split('(')[0].trim(),
        droppingPointShort: trip.destination.split('(')[0].trim(),
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        durationMins: trip.runtimeMinutes,
        durationFormatted: `${trip.runtimeMinutes}m`,
        direction: trip.direction,
        isDirectionMatch,
        timeSlot: slot,
        fare: 0,
        baseFare: 0,
        isAC: busInfo.isAC,
        hasRamp: busInfo.hasRamp,
        amenities: busInfo.hasRamp ? ['ramp', 'ac', 'usb', 'cctv'] : ['ac', 'usb', 'cctv'],
        totalCapacity: cap.seatsTotal + cap.standingTotal,
        availableSeats: cap.availableSeated,
        availableStanding: cap.availableStanding,
        totalAvailable: cap.totalAvailable,
        heldBackSeats: cap.heldBackSeats,
        turnaroundStatus: 'Verified (≥ 10m buffer at terminus)',
        status: 'On Schedule'
      };
    });
  }, [searchDirection]);

  // Apply Facet Filters
  const filteredBuses = useMemo(() => {
    return enrichedBuses.filter(bus => {
      // 1. Direction Filter: Prioritize matching direction
      // (show matching direction by default, or all if none found)
      if (searchDirection && bus.direction !== searchDirection) {
        return false;
      }

      // 2. Departure Time Slot Filter
      if (selectedTimeSlots.length > 0 && !selectedTimeSlots.includes(bus.timeSlot)) {
        return false;
      }

      // 3. Bus Fleet Filter
      if (selectedBusTypes.length > 0 && !selectedBusTypes.includes(bus.busId.toLowerCase())) {
        return false;
      }

      // 4. Amenities Filter
      if (selectedAmenities.length > 0) {
        const hasAll = selectedAmenities.every(a => bus.amenities.includes(a));
        if (!hasAll) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'departure_desc') return b.departureTime.localeCompare(a.departureTime);
      if (sortBy === 'capacity_desc') return b.totalAvailable - a.totalAvailable;
      return a.departureTime.localeCompare(b.departureTime); // default: departure_asc
    });
  }, [enrichedBuses, searchDirection, selectedTimeSlots, selectedBusTypes, selectedAmenities, sortBy]);

  const toggleTimeSlot = (slot) => {
    setSelectedTimeSlots(prev => 
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const toggleBusType = (type) => {
    setSelectedBusTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleAmenity = (amenity) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleResetFilters = () => {
    setSelectedTimeSlots([]);
    setSelectedBusTypes([]);
    setSelectedAmenities([]);
    setSortBy('departure_asc');
    announce('All filters cleared. Showing all 10 campus shuttle trips.');
  };

  const timeSlotOptions = [
    { id: 'morning', label: 'Morning (08:00 - 11:59)', icon: '🌅' },
    { id: 'afternoon', label: 'Afternoon (12:00 - 16:59)', icon: '☀️' },
    { id: 'evening', label: 'Evening (17:00 - 21:59)', icon: '🌆' },
    { id: 'night', label: 'Night (22:00+)', icon: '🌙' },
  ];

  const busTypeOptions = [
    { id: 'bus-01', label: 'Bus 1 (Tata EV 52+8)', cap: '60 Cap' },
    { id: 'bus-02', label: 'Bus 2 (Ashok Leyland 52+8)', cap: '60 Cap' },
    { id: 'bus-03', label: 'Bus 3 (Eicher 32+5)', cap: '37 Cap' }
  ];

  const amenityOptions = [
    { id: 'ramp', label: 'Wheelchair Ramp', icon: Accessibility },
    { id: 'ac', label: 'Air Conditioned (AC)', icon: Wind },
    { id: 'cctv', label: 'CCTV Monitored', icon: ShieldCheck }
  ];

  return (
    <section className="w-full max-w-7xl mx-auto space-y-6" aria-label="Campus Shuttle Timetable">
      
      {/* Route & Date Banner Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider block">
            IIIT Pune Shuttle Service • 10 Fixed Daily Trips
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            {from} ➔ {to}
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Date: <strong className="text-slate-800">{date}</strong></span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-medium text-sky-700">
              <Bus className="w-3.5 h-3.5" />
              <span>Direction: {searchDirection === 'AWAY_FROM_CAMPUS' ? 'Outbound (Away from Campus)' : 'Inbound (Toward Campus)'}</span>
            </span>
          </p>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Matching Feasible Trips</div>
            <div className="text-xl font-bold text-slate-900">{filteredBuses.length} Trips Available</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="md:hidden p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
            aria-label="Toggle Filters"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters + Trip Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* SIDEBAR FILTERS */}
        <aside className={`lg:block bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6 ${
          mobileFilterOpen ? 'block' : 'hidden'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-sky-600" />
              <span>Filter Timetable</span>
            </h3>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Time Slot Filter */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Departure Band
            </h4>
            <div className="space-y-1.5">
              {timeSlotOptions.map(slot => (
                <label 
                  key={slot.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                >
                  <span className="flex items-center gap-2 text-slate-700">
                    <span>{slot.icon}</span>
                    <span>{slot.label}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedTimeSlots.includes(slot.id)}
                    onChange={() => toggleTimeSlot(slot.id)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Fleet Filter */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Assigned Shuttle Bus
            </h4>
            <div className="space-y-1.5">
              {busTypeOptions.map(b => (
                <label 
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                >
                  <div>
                    <div className="text-slate-800 font-medium">{b.label}</div>
                    <div className="text-[10px] text-slate-500">{b.cap}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedBusTypes.includes(b.id)}
                    onChange={() => toggleBusType(b.id)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Amenities Filter */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Accessibility & Features
            </h4>
            <div className="space-y-1.5">
              {amenityOptions.map(a => {
                const IconComponent = a.icon;
                return (
                  <label 
                    key={a.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2 text-slate-700">
                      <IconComponent className="w-3.5 h-3.5 text-slate-500" />
                      <span>{a.label}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(a.id)}
                      onChange={() => toggleAmenity(a.id)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </aside>

        {/* BUS CARDS LIST */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Sorting Bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-xs flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing <strong className="text-slate-800">{filteredBuses.length}</strong> official shuttle trips
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:ring-2 focus:ring-sky-500"
              >
                <option value="departure_asc">Earliest Departure (08:00 ➔ 22:30)</option>
                <option value="departure_desc">Latest Departure</option>
                <option value="capacity_desc">Highest Available Capacity</option>
              </select>
            </div>
          </div>

          {/* Trip Cards */}
          {filteredBuses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <Bus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Shuttle Trips Match Your Filter</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No trips found in this time band or direction. Try resetting filters to view all 10 trips.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredBuses.map((bus) => (
              <div 
                key={bus.tripId}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-sky-300 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 relative group"
              >
                {/* Trip Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-800 font-mono font-bold text-xs border border-sky-200">
                      {bus.tripId}
                    </span>
                    {bus.tripId === 'T7' && (
                      <span 
                        id="trip-t7-oversubscribed-chip"
                        className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-bold text-[11px] shadow-2xs flex items-center gap-1.5"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Trip T7 (17:30) • High Demand (Oversubscribed)</span>
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-700">
                      {bus.busClass}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ({bus.busPlate})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{bus.status}</span>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 text-[11px] font-mono">{bus.turnaroundStatus}</span>
                  </div>
                </div>

                {/* Departure & Arrival Schedule Block */}
                <div className="grid grid-cols-1 md:grid-cols-[1.5fr,1fr,auto] gap-5 items-center">
                  
                  {/* Schedule Times */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div>
                      <div className="text-2xl font-black text-slate-900 tracking-tight">
                        {bus.departureTime}
                      </div>
                      <div className="text-xs font-medium text-slate-600 mt-0.5 max-w-[140px] truncate" title={bus.origin}>
                        {bus.boardingPointShort}
                      </div>
                    </div>

                    {/* Arrow / Duration */}
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-semibold text-slate-400 mb-1">
                        {bus.durationFormatted}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full border-2 border-sky-500 bg-white" />
                        <div className="w-12 sm:w-16 h-0.5 bg-sky-200" />
                        <ArrowRight className="w-3.5 h-3.5 text-sky-500 -ml-1" />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">Direct Shuttle</span>
                    </div>

                    <div>
                      <div className="text-2xl font-black text-slate-900 tracking-tight">
                        {bus.arrivalTime}
                      </div>
                      <div className="text-xs font-medium text-slate-600 mt-0.5 max-w-[140px] truncate" title={bus.destination}>
                        {bus.droppingPointShort}
                      </div>
                    </div>
                  </div>

                  {/* Capacity & Places Breakdown */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Available Places:</span>
                      <span className="font-bold text-slate-900">{bus.totalAvailable} / {bus.totalCapacity}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>• Seated: <strong>{bus.availableSeats}</strong> (2 held back)</span>
                      <span>• Standing: <strong>{bus.availableStanding}</strong></span>
                    </div>
                    {bus.hasRamp && (
                      <div className="text-[10px] text-sky-700 font-medium flex items-center gap-1 pt-0.5">
                        <Accessibility className="w-3 h-3" />
                        <span>Low-floor ramp equipped (Rule 1 priority accessible)</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="text-xs text-right">
                      <span className="font-bold text-slate-700 uppercase text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Trip {bus.tripId} ({bus.departureTime} Departure)
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">Rule-Based Allocation</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectBus && onSelectBus(bus)}
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-2 focus:ring-2 focus:ring-sky-400"
                    >
                      <span>Select Trip</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            ))
          )}

        </div>

      </div>
    </section>
  );
};
