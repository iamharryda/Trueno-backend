import express from 'express';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';
import {
  getMyBookings,
  getRideBookings,
  getBookingById,
  rateBookingParticipants,
  updateBooking
} from './booking.controller.js';

const router = express.Router();

router.route('/my').get(verifyToken, getMyBookings);

router.route('/ride/:rideId').get(verifyToken, getRideBookings);

router
  .route('/:bookingId')
  .get(verifyToken, getBookingById)       
  .patch(verifyToken, updateBooking); 

router
  .route('/:bookingId/rate')
  .post(verifyToken, rateBookingParticipants); 


export default router;
