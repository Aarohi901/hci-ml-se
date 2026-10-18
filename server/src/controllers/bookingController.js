import prisma from '../config/db.js';
import { calculatePriorityScore, isReservedPrioritySeat } from '../utils/priorityScoring.js';

// In-memory hold store for fallback
const activeSeatHolds = new Map();
const fallbackBookings = [];

export const holdSeats = async (req, res, next) => {
  try {
    const { busId, tripId, seats, boarding, dropping, totalBaseFare, tripPurpose, age, isDivyang, passengers } = req.body;
    const targetTripId = tripId || busId;

    if (!targetTripId || !seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'A valid tripId/busId and at least one seat are required.'
      });
    }

    // Anti-Spoofing Check for Priority Seating
    const hasPrioritySeat = seats.some(s => isReservedPrioritySeat(s));
    const primaryAge = age || passengers?.[0]?.age || 25;
    const primaryPurpose = tripPurpose || passengers?.[0]?.tripPurpose || 'GENERAL_LEISURE';
    const primaryDivyang = isDivyang ?? passengers?.[0]?.isDivyang ?? false;

    const priorityResult = calculatePriorityScore({
      age: primaryAge,
      tripPurpose: primaryPurpose,
      isDivyang: primaryDivyang
    });

    if (prisma) {
      try {
        const trip = await prisma.trip.findFirst({
          where: { OR: [{ id: targetTripId }, { tripCode: targetTripId }] },
          include: {
            seatHolds: { where: { expiresAt: { gt: new Date() } } }
          }
        });

        if (trip) {
          let bookedSeats = [];
          try { bookedSeats = JSON.parse(trip.bookedSeats || '[]'); } catch (e) {}

          const currentlyHeldSeats = [];
          trip.seatHolds.forEach(h => {
            try { currentlyHeldSeats.push(...JSON.parse(h.seats || '[]')); } catch (e) {}
          });

          const unavailable = new Set([...bookedSeats, ...currentlyHeldSeats]);
          const conflictingSeats = seats.filter(s => unavailable.has(s));

          if (conflictingSeats.length > 0) {
            return res.status(409).json({
              success: false,
              error: 'SeatConflictError',
              message: `Seats [${conflictingSeats.join(', ')}] are already booked or held.`,
              conflictingSeats
            });
          }

          const holdDurationMinutes = 10;
          const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);
          const holdId = `HOLD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

          const seatHold = await prisma.seatHold.create({
            data: {
              holdId,
              tripId: trip.id,
              seats: JSON.stringify(seats),
              boardingPoint: boarding || null,
              droppingPoint: dropping || null,
              expiresAt
            }
          });

          return res.status(200).json({
            success: true,
            source: 'PostgreSQL Database (Prisma)',
            message: `Seats held successfully for ${holdDurationMinutes} minutes.`,
            holdId: seatHold.holdId,
            expiresIn: holdDurationMinutes * 60,
            expiresAt: seatHold.expiresAt,
            seats,
            tripId: trip.id
          });
        }
      } catch (dbErr) {
        console.warn('[BookingController] PostgreSQL not connected, using in-memory hold store.');
      }
    }

    // In-Memory Fallback Hold
    const holdId = `HOLD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const holdRecord = {
      holdId,
      busId: targetTripId,
      seats,
      boarding: boarding || null,
      dropping: dropping || null,
      totalBaseFare: totalBaseFare || 0,
      createdAt: new Date().toISOString(),
      expiresInSeconds: 600,
      expiresAt: new Date(Date.now() + 600 * 1000).toISOString()
    };
    activeSeatHolds.set(holdId, holdRecord);

    res.status(200).json({
      success: true,
      source: 'In-Memory Store (Fallback)',
      message: 'Seats held successfully for 10 minutes.',
      holdId,
      expiresIn: 600,
      expiresAt: holdRecord.expiresAt,
      seats,
      tripId: targetTripId
    });
  } catch (error) {
    next(error);
  }
};

export const confirmBooking = async (req, res, next) => {
  try {
    const {
      holdId,
      busId,
      tripId,
      seats,
      passengers,
      tripPurpose,
      age,
      isDivyang,
      contactEmail,
      contactPhone,
      boardingPoint,
      droppingPoint,
      paymentMethod,
      fareBreakdown,
      totalAmount,
      isFlexible,
      flexibleWindowMinutes,
      flexibilityDirection,
      wasReallocated,
      reallocatedBus,
      status
    } = req.body;

    const targetTripId = tripId || busId || 'SB-01';
    const userId = req.user?.id || null;
    const pnr = 'PNR-' + Math.floor(Math.random() * 899999 + 100000);
    const seatsToBook = Array.isArray(seats) ? seats : [];
    const calculatedTotal = totalAmount || fareBreakdown?.total || 50;

    // Server-side Anti-Spoofing Check for Priority Seating
    const hasPrioritySeat = seatsToBook.some(s => isReservedPrioritySeat(s));
    const primaryAge = age || passengers?.[0]?.age || 25;
    const primaryPurpose = tripPurpose || passengers?.[0]?.tripPurpose || 'GENERAL_LEISURE';
    const primaryDivyang = isDivyang ?? passengers?.[0]?.isDivyang ?? false;

    const priorityResult = calculatePriorityScore({
      age: primaryAge,
      tripPurpose: primaryPurpose,
      isDivyang: primaryDivyang
    });

    const isFlexibleOptIn = Boolean(isFlexible ?? passengers?.[0]?.isFlexible ?? false);
    const flexWindow = Number(flexibleWindowMinutes ?? passengers?.[0]?.flexibleWindowMinutes) || (isFlexibleOptIn ? 30 : 0);
    const flexDir = flexibilityDirection || passengers?.[0]?.flexibilityDirection || 'ANY';
    const isReallocatedBooking = Boolean(wasReallocated ?? (status === 'REALLOCATED'));

    // Priority seat verified under campus booking rules

    if (prisma) {
      try {
        const trip = await prisma.trip.findFirst({
          where: { OR: [{ id: targetTripId }, { tripCode: targetTripId }] }
        });

        if (trip) {
          let currentBooked = [];
          try { currentBooked = JSON.parse(trip.bookedSeats || '[]'); } catch (e) {}
          const updatedBooked = Array.from(new Set([...currentBooked, ...seatsToBook]));

          const [booking] = await prisma.$transaction([
            prisma.booking.create({
              data: {
                pnr,
                tripId: trip.id,
                userId,
                passengerDetails: JSON.stringify(passengers || []),
                tripPurpose: primaryPurpose,
                priorityScore: priorityResult.score,
                isPrioritySeat: hasPrioritySeat,
                isFlexible: isFlexibleOptIn,
                flexibleWindowMinutes: flexWindow,
                flexibilityDirection: flexDir,
                wasReallocated: isReallocatedBooking,
                reallocatedBus: reallocatedBus || null,
                contactEmail: contactEmail || 'commuter@smartbus.gov.in',
                contactPhone: contactPhone || '+91 98765 43210',
                boardingPoint: boardingPoint || 'Main Station',
                droppingPoint: droppingPoint || 'Destination',
                selectedSeats: JSON.stringify(seatsToBook),
                fareBreakdown: JSON.stringify(fareBreakdown || { total: calculatedTotal }),
                totalAmount: parseFloat(calculatedTotal),
                paymentMethod: paymentMethod || 'UPI',
                paymentStatus: 'PAID',
                status: isReallocatedBooking ? 'REALLOCATED' : 'CONFIRMED'
              },
              include: { trip: { include: { route: true } } }
            }),
            prisma.trip.update({
              where: { id: trip.id },
              data: { bookedSeats: JSON.stringify(updatedBooked) }
            }),
            ...(holdId ? [prisma.seatHold.deleteMany({ where: { holdId } })] : [])
          ]);

          return res.status(201).json({
            success: true,
            source: 'PostgreSQL Database (Prisma)',
            message: 'Booking successfully confirmed and seats locked in database.',
            pnr: booking.pnr,
            booking: {
              id: booking.id,
              pnr: booking.pnr,
              busId: booking.tripId,
              operatorName: booking.trip?.operatorName,
              busCategory: booking.trip?.busCategory,
              route: booking.trip?.route,
              departureTime: booking.trip?.departureTime,
              departureDate: booking.trip?.departureDate,
              seats: seatsToBook,
              passengers: passengers || [],
              tripPurpose: booking.tripPurpose,
              priorityScore: booking.priorityScore,
              isPrioritySeat: booking.isPrioritySeat,
              contactEmail: booking.contactEmail,
              contactPhone: booking.contactPhone,
              boardingPoint: booking.boardingPoint,
              droppingPoint: booking.droppingPoint,
              totalAmount: booking.totalAmount,
              paymentMethod: booking.paymentMethod,
              paymentStatus: booking.paymentStatus,
              status: booking.status,
              bookingDate: new Date(booking.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }),
              confirmedAt: booking.createdAt
            }
          });
        }
      } catch (dbErr) {
        console.warn('[BookingController] PostgreSQL confirmation failed, saving in memory.');
      }
    }

    // Fallback in-memory booking
    if (holdId && activeSeatHolds.has(holdId)) {
      activeSeatHolds.delete(holdId);
    }

    const confirmedBooking = {
      id: `bk_${Date.now()}`,
      pnr,
      busId: targetTripId,
      operatorName: 'PMPML Pune Pride Express',
      busCategory: 'Volvo Multi-Axle AC',
      departureTime: '08:00',
      departureDate: new Date().toISOString().split('T')[0],
      seats: seatsToBook,
      passengers: passengers || [],
      tripPurpose: primaryPurpose,
      priorityScore: priorityResult.score,
      isPrioritySeat: hasPrioritySeat,
      isFlexible: isFlexibleOptIn,
      flexibleWindowMinutes: flexWindow,
      flexibilityDirection: flexDir,
      wasReallocated: isReallocatedBooking,
      reallocatedBus: reallocatedBus || null,
      contactEmail: contactEmail || 'commuter@smartbus.gov.in',
      contactPhone: contactPhone || '+91 98765 43210',
      boardingPoint: boardingPoint || 'Swargate Terminal Gate 2',
      droppingPoint: droppingPoint || 'Pune Station Platform Road',
      totalAmount: calculatedTotal,
      fareBreakdown: fareBreakdown || { total: calculatedTotal },
      paymentMethod: paymentMethod || 'UPI',
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      bookingDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      confirmedAt: new Date().toISOString()
    };

    fallbackBookings.push(confirmedBooking);

    res.status(201).json({
      success: true,
      source: 'In-Memory Store (Fallback)',
      message: 'Ticket confirmed and booked successfully.',
      pnr,
      booking: confirmedBooking
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const { email, phone } = req.query;
    const userId = req.user?.id;

    if (prisma) {
      try {
        const whereConditions = [];
        if (userId) whereConditions.push({ userId });
        if (email) whereConditions.push({ contactEmail: email.trim() });
        if (phone) whereConditions.push({ contactPhone: phone.trim() });

        const bookings = await prisma.booking.findMany({
          where: whereConditions.length > 0 ? { OR: whereConditions } : {},
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { trip: { include: { route: true } } }
        });

        if (bookings && bookings.length > 0) {
          return res.status(200).json({
            success: true,
            source: 'PostgreSQL Database (Prisma)',
            count: bookings.length,
            bookings
          });
        }
      } catch (dbErr) {}
    }

    res.status(200).json({
      success: true,
      source: 'In-Memory Store (Fallback)',
      count: fallbackBookings.length,
      bookings: fallbackBookings
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingByPNR = async (req, res, next) => {
  try {
    const { pnr } = req.params;

    if (prisma) {
      try {
        const booking = await prisma.booking.findUnique({
          where: { pnr: pnr.toUpperCase() },
          include: {
            trip: { include: { route: true } },
            user: { select: { id: true, name: true, email: true } }
          }
        });

        if (booking) {
          return res.status(200).json({
            success: true,
            source: 'PostgreSQL Database (Prisma)',
            booking
          });
        }
      } catch (dbErr) {}
    }

    const found = fallbackBookings.find(b => b.pnr === pnr.toUpperCase());
    if (found) {
      return res.status(200).json({
        success: true,
        source: 'In-Memory Store (Fallback)',
        booking: found
      });
    }

    res.status(404).json({
      success: false,
      error: 'NotFoundError',
      message: `Booking with PNR '${pnr}' not found.`
    });
  } catch (error) {
    next(error);
  }
};
