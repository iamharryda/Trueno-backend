import {
  getBookingByIdService,
  getMyBookingsService,
  getRideBookingsService,
  rateBookingParticipantsService,
  updateBookingService
} from './booking.service.js';
import { generateResponse } from '../../lib/responseFormate.js';

export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const bookings = await getMyBookingsService(userId);
    generateResponse(res, 200, 'success', 'My bookings fetched', bookings);
  } catch (err) {
    generateResponse(res, 400, 'error', err.message, null);
  }
};

export const getRideBookings = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user._id;
    const bookings = await getRideBookingsService(rideId, userId);
    generateResponse(res, 200, 'success', 'Ride bookings fetched', bookings);
  } catch (err) {
    generateResponse(res, 403, 'error', err.message, null);
  }
};

export const updateBooking = async (req, res) => {
  try {
    const { status, baggageType } = req.body;
    const bookingId = req.params.bookingId;
    const userId = req.user._id;

    const updated = await updateBookingService(bookingId, userId, status, baggageType);

    generateResponse(res, 200, 'success', 'Booking updated', updated);
  } catch (err) {
    generateResponse(res, 400, 'error', err.message, null);
  }
};

export const getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const userId = req.user._id;
    const booking = await getBookingByIdService(bookingId, userId);
    generateResponse(res, 200, 'success', 'Booking retrieved', booking);
  } catch (err) {
    generateResponse(res, 404, 'error', err.message, null);
  }
};

export const rateBookingParticipants = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const raterId = req.user._id;
    const ratings = req.body.ratings;
    const result = await rateBookingParticipantsService(
      bookingId,
      raterId,
      ratings
    );
    generateResponse(
      res,
      200,
      'success',
      'Participants rated successfully',
      result
    );
  } catch (err) {
    generateResponse(res, 400, 'error', err.message, null);
  }
};
