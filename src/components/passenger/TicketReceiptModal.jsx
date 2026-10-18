import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Printer, 
  Download, 
  MapPin, 
  Bus, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  ArrowRight, 
  User,
  Share2,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTranslation } from '../../context/TranslationContext';
import { TRIP_PURPOSES } from '../../utils/priorityScoring';
import { BookingStatusExplanation } from './BookingStatusExplanation';

export const TicketReceiptModal = ({ 
  booking, 
  isOpen, 
  onClose 
}) => {
  const navigate = useNavigate();
  const { announce } = useAccessibility();
  const { t } = useTranslation();

  if (!isOpen || !booking) return null;

  const tripPurposeKey = booking.tripPurpose || booking.passengers?.[0]?.tripPurpose || 'GENERAL_LEISURE';
  const purposeObj = TRIP_PURPOSES[tripPurposeKey] || {
    label: tripPurposeKey === 'MEDICAL' ? 'Medical / Doctor Visit' :
           tripPurposeKey === 'WORK_COMMUTE' ? 'Work / Office Commute' :
           tripPurposeKey === 'EDUCATION_EXAM' ? 'Student / College / Exam Travel' : 'General / Personal Trip',
    icon: tripPurposeKey === 'MEDICAL' ? '🏥' : (tripPurposeKey === 'EDUCATION_EXAM' ? '🎓' : (tripPurposeKey === 'WORK_COMMUTE' ? '💼' : '🚶'))
  };
  const isHighPriority = Boolean(booking.priorityScore >= 70 || booking.isHighPriority);
  const priorityScore = booking.priorityScore ?? (isHighPriority ? 75 : 15);

  const handlePrint = () => {
    announce('Opening print dialogue for bus ticket');
    window.print();
  };

  const handleDownload = () => {
    announce('Downloading E-Ticket confirmation receipt');
    const ticketText = `
========================================
       BUSMATE TRANSIT E-TICKET
========================================
PNR: ${booking.pnr}
Date: ${booking.bookingDate || new Date().toLocaleDateString()}
Status: Confirmed / Paid

PRIORITY ALLOCATION:
Travel Purpose: ${purposeObj.label}
Priority Status: ${isHighPriority ? 'High Priority Passenger' : 'Standard Commuter'} (Score: ${priorityScore} pts)

SERVICE DETAILS:
Route: ${booking.routeNumber}
Operator: ${booking.operator || 'BusMate Express Transit'}
Bus Plate: ${booking.busPlate || 'MH 14 BT 3312'}
From: ${booking.origin}
To: ${booking.destination}
Boarding Point: ${booking.boardingPoint || 'Main Terminal Bay'} (${booking.boardingTime || '17:30'})
Dropping Point: ${booking.droppingPoint || 'Central Station'} (${booking.droppingTime || '18:15'})

PASSENGERS:
${(booking.passengers || []).map((p, idx) => `Seat ${p.seatId}: ${p.name} (${p.age}y, ${p.gender})`).join('\n')}

FARE BREAKDOWN:
Base Fare: Rs. ${booking.fareBreakdown?.baseFare || 50}
Discount: Rs. ${booking.fareBreakdown?.discount || 0}
Transit GST (5%): Rs. ${booking.fareBreakdown?.gst || 2}
Total Paid: Rs. ${booking.fareBreakdown?.total || 52}

Idempotency Key: ${booking.idempotencyToken || 'N/A'}
Contact Email: ${booking.contactEmail || 'N/A'}
Contact Phone: ${booking.contactPhone || 'N/A'}
========================================
    Thank you for riding with BusMate!
========================================
`;
    const element = document.createElement('a');
    const file = new Blob([ticketText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `BusMate_Ticket_${booking.pnr}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleViewMyTrips = () => {
    onClose();
    navigate('/history');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticketReceiptHeading"
    >
      <div className="bg-white rounded-3xl border-2 border-slate-300 max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-4">
        
        {/* Header Ribbon & Close */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5" data-i18n="ticketConfirmed">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{t('ticketConfirmed')}</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              <span data-i18n="pnr">{t('pnr')}</span>: {booking.pnr}
            </span>
          </div>

          <button
            type="button"
            data-a11y-engine="true"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
            aria-label="Close ticket receipt"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* HCI Passenger-Facing Allocation Explanation & Evaluation Card */}
        <BookingStatusExplanation booking={booking} />

        {/* Ticket Header Banner */}
        <div className="bg-gradient-to-r from-[#075985] to-[#0F766E] text-white p-6 rounded-2xl shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-sky-200 block">
                OFFICIAL ELECTRONIC BOARDING PASS
              </span>
              <h2 id="ticketReceiptHeading" className="text-2xl font-black tracking-tight">
                {booking.routeNumber}
              </h2>
              <p className="text-xs font-semibold text-sky-100">
                {booking.operator || 'BusMate Express Transit'} • Vehicle: {booking.busPlate || 'MH 14 BT 3312'}
              </p>
            </div>

            {/* PNR Box */}
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/20 text-right sm:min-w-[130px]">
              <span className="text-[10px] font-mono text-sky-200 block uppercase">BOOKING PNR</span>
              <span className="font-mono text-lg font-black text-white tracking-wider block">{booking.pnr}</span>
              <span className="text-[10px] text-emerald-300 font-bold">100% Confirmed</span>
            </div>
          </div>
        </div>

        {/* Departure & Arrival Transit Timeline */}
        <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-4">
          <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
            <span>JOURNEY TIMELINE</span>
            <span>DATE: {booking.bookingDate || 'Today'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Origin & Boarding Point */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#075985]">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>BOARDING POINT</span>
              </div>
              <p className="text-sm font-black text-slate-900">
                {booking.boardingPoint || booking.origin}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Scheduled: {booking.boardingTime || '17:30'}</span>
              </div>
            </div>

            {/* Destination & Dropping Point */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#0F766E]">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>DROPPING POINT</span>
              </div>
              <p className="text-sm font-black text-slate-900">
                {booking.droppingPoint || booking.destination}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Estimated: {booking.droppingTime || '18:15'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Priority Status & Travel Purpose Field */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gradient-to-r from-sky-50 to-emerald-50 rounded-2xl border border-sky-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{purposeObj.icon || '🚌'}</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Travel Purpose</span>
              <span id="ticket-modal-travel-purpose" className="text-sm font-black text-slate-900">{purposeObj.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:justify-end">
            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Priority Status</span>
              <span id="ticket-modal-priority-status" className={`text-xs font-black px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
                isHighPriority
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {isHighPriority ? <Award className="w-3.5 h-3.5 text-emerald-700" /> : <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />}
                <span>{isHighPriority ? 'High Priority Passenger' : 'Standard Commuter'} ({priorityScore} pts)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Passenger & Seat Assignment Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#075985]" />
            <span>Passenger & Seat Manifest</span>
          </h3>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5">Seat No.</th>
                  <th className="px-3.5 py-2.5">Passenger Name</th>
                  <th className="px-3.5 py-2.5">Age</th>
                  <th className="px-3.5 py-2.5">Gender</th>
                  <th className="px-3.5 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {(booking.passengers || []).map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2.5 font-black text-[#075985]">
                      Seat {p.seatId}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold">
                      {p.name}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {p.age} yrs
                    </td>
                    <td className="px-3.5 py-2.5">
                      {p.gender}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-black text-emerald-700">
                      Confirmed
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fare Breakdown & Simulated QR Code */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
          
          {/* Simulated QR Code for Gate Scanner */}
          <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 text-center">
            <div className="w-24 h-24 bg-slate-900 p-2 rounded-lg flex items-center justify-center text-white">
              <QrCode className="w-20 h-20 text-white" />
            </div>
            <span className="text-[9px] font-mono text-slate-500 mt-1 uppercase">Scan at Boarding Gate</span>
            <span className="text-[9px] font-mono font-bold text-slate-800">ID: {booking.pnr}</span>
          </div>

          {/* Detailed Financial & Security Breakdown */}
          <div className="sm:col-span-8 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 font-semibold">
              <span>Base Fare:</span>
              <span>₹{booking.fareBreakdown?.baseFare || 50}</span>
            </div>
            {booking.fareBreakdown?.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Concession / Promo Discount:</span>
                <span>-₹{booking.fareBreakdown?.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 font-semibold">
              <span>Transit GST & Municipal Cess (5%):</span>
              <span>₹{booking.fareBreakdown?.gst || 2}</span>
            </div>
            <div className="flex justify-between font-black text-base text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Paid Amount:</span>
              <span className="text-[#075985]">₹{booking.fareBreakdown?.total || 52}</span>
            </div>

            <div className="pt-2 text-[10px] font-mono text-slate-400">
              <span>Idempotency Auth: </span>
              <span className="text-slate-600">{booking.idempotencyToken}</span>
            </div>
          </div>

        </div>

        {/* Action Buttons for Passenger */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              data-a11y-engine="true"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span data-i18n="printTicket">{t('printTicket')}</span>
            </button>

            <button
              type="button"
              data-a11y-engine="true"
              onClick={handleDownload}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Download PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              data-a11y-engine="true"
              onClick={handleViewMyTrips}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#075985] hover:bg-[#0C4A6E] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>{t('myHistory') || 'My History'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
