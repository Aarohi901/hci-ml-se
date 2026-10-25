import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';

/**
 * CheckoutPage - PURGED & BYPASSED
 * Per Section 2.3 of the IIIT Pune BusMate specification:
 * Payments and checkout gateways are completely OUT OF SCOPE.
 * Once a trip request is submitted or a seat is confirmed, the system moves directly
 * to Booking Confirmation / Digital Boarding Pass with zero payment intermediate screens.
 */
export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { announce } = useAccessibility();

  useEffect(() => {
    // Check if there is an active reservation to convert into confirmed booking
    try {
      const stored = sessionStorage.getItem('smartbus_current_reservation') || localStorage.getItem('smartbus_current_reservation');
      let reservation = stored ? JSON.parse(stored) : null;
      
      const pnr = reservation?.pnr || `IIITP-${Math.floor(100000 + Math.random() * 900000)}`;
      const departureTime = reservation?.boardingTime || reservation?.bus?.departureTime || '17:30';
      const arrivalTime = reservation?.droppingTime || reservation?.bus?.arrivalTime || '18:20';
      const tripId = reservation?.tripId || 'T7';

      const confirmedBookingRecord = {
        ...(reservation || {}),
        pnr,
        bookingId: `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        status: reservation?.status === 'WAITLISTED' ? 'Waitlisted' : 'Confirmed',
        routeNumber: `Trip ${tripId} (${departureTime} Departure)`,
        operator: 'IIIT Pune Transport Department',
        busClass: reservation?.busModel || 'Tata Starbus EV-52 (MH 14 BT 1001)',
        busPlate: reservation?.busPlate || 'MH 14 BT 1001',
        origin: reservation?.boardingPoint || 'IIIT Pune Campus (Main Gate)',
        destination: reservation?.droppingPoint || 'Talegaon Station',
        boardingPoint: reservation?.boardingPoint || 'IIIT Pune Campus (Main Gate)',
        boardingTime: departureTime,
        droppingPoint: reservation?.droppingPoint || 'Talegaon Station',
        droppingTime: arrivalTime,
        bookingDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        bookingTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST',
        journeyDate: reservation?.journeyDate || new Date().toISOString().split('T')[0],
        misNumber: user?.misNumber || reservation?.misNumber || '112603001',
        passengerName: user?.fullName || reservation?.passengerName || 'Aditya Verma',
        studentProfile: user || reservation?.studentProfile,
        passengers: reservation?.passengers || [
          {
            name: user?.fullName || 'Aditya Verma',
            misNumber: user?.misNumber || '112603001',
            seatId: reservation?.selectedSeatId || 'Seat 1A',
            gender: 'Student',
            age: 20
          }
        ]
      };

      // Store in session and local history
      sessionStorage.setItem('smartbus_last_booking', JSON.stringify(confirmedBookingRecord));
      localStorage.setItem('smartbus_last_booking', JSON.stringify(confirmedBookingRecord));

      const existingTrips = JSON.parse(localStorage.getItem('smartbus_my_trips') || '[]');
      const updatedTrips = [confirmedBookingRecord, ...existingTrips.filter(t => t.pnr !== pnr)];
      localStorage.setItem('smartbus_my_trips', JSON.stringify(updatedTrips));

      // Clean up temporary reservation hold
      sessionStorage.removeItem('smartbus_current_reservation');
      localStorage.removeItem('smartbus_current_reservation');

      announce(`Redirecting directly to confirmation for PNR ${pnr}`);
      navigate(`/booking-confirmation?pnr=${pnr}`, { replace: true });
    } catch (err) {
      console.warn('Redirecting from checkout:', err);
      navigate('/booking-confirmation', { replace: true });
    }
  }, [navigate, user, announce]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-md w-full space-y-4">
        <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h2 className="text-base font-bold text-slate-900">
          Confirming Campus Shuttle Pass...
        </h2>
        <p className="text-xs text-slate-500">
          Payments are out of scope. Generating your official IIIT Pune Digital Boarding Pass directly.
        </p>
      </div>
    </div>
  );
};

export default CheckoutPage;
