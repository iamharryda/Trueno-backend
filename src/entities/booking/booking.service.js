import Booking from './booking.model.js';
import Ride from '../ride/ride.model.js';
import Rating from '../rating/rating.model.js';
import mongoose from 'mongoose';
import { createNotificationService } from '../notification/notification.service.js';
import { io } from '../../app.js';

export const getMyBookingsService = async (userId) => {
  const bookings = await Booking.find({ user: userId })
    .populate('ride')
    .sort({ createdAt: -1 })
    .lean();

  const rideIds = bookings.map((b) => b.ride?._id).filter(Boolean);

  // Get average rating per participant
  const ratings = await Rating.aggregate([
    {
      $match: {
        ride: { $in: rideIds.map((id) => new mongoose.Types.ObjectId(id)) }
      }
    },
    {
      $group: {
        _id: { ride: '$ride', ratedUser: '$ratedUser' },
        avgRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 }
      }
    }
  ]);

  // Organize ratings: { rideId: { userId: { avg, count } } }
  const ratingMap = {};
  ratings.forEach((r) => {
    const rideId = r._id.ride.toString();
    const userId = r._id.ratedUser.toString();
    if (!ratingMap[rideId]) ratingMap[rideId] = {};
    ratingMap[rideId][userId] = {
      avgRating: r.avgRating.toFixed(1),
      ratingCount: r.ratingCount
    };
  });

  // Enrich each booking with rating info for all other participants
  const enrichedBookings = await Promise.all(
    bookings.map(async (booking) => {
      const ride = booking.ride;
      const rideId = ride?._id?.toString();

      // Get all participants except self
      const participants = await Booking.find({
        ride: rideId,
        status: 'active',
        user: { $ne: userId }
      })
        .populate('user', 'name email avatar')
        .lean();

      const ratedParticipants = participants.map((p) => {
        const user = p.user;
        const userRatings = ratingMap[rideId]?.[user._id.toString()] || {};
        return {
          user,
          seatBooked: p.seatBooked,
          baggageType: p.baggageType,
          joinedAt: p.joinedAt,
          avgRating: userRatings.avgRating || null,
          ratingCount: userRatings.ratingCount || 0
        };
      });

      return {
        ...booking,
        participants: ratedParticipants
      };
    })
  );

  return enrichedBookings;
};

export const getRideBookingsService = async (rideId, userId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new Error('Ride not found');
  if (!ride.creator.equals(userId))
    throw new Error('Only creator can see bookings');
  return await Booking.find({ ride: rideId }).populate('user');
};


export const updateBookingService = async (bookingId, userId, status, baggageType) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');
  if (!booking.user.equals(userId)) throw new Error('Unauthorized');

  if (status) {
    booking.status = status;
    if (status === 'cancelled') booking.leftAt = new Date();
  }

  if (baggageType) {
    booking.baggageType = baggageType;
  }

  return await booking.save();
};

export const getBookingByIdService = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId).populate('ride user');
  if (!booking) throw new Error('Booking not found');
  if (!booking.user.equals(userId))
    throw new Error('Unauthorized access to booking');
  return booking;
};

export const rateBookingParticipantsService = async (
  bookingId,
  raterId,
  ratings
) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  const rideId = booking.ride;

  const raterBooking = await Booking.findOne({
    ride: rideId,
    user: raterId,
    status: 'active'
  });

  if (!raterBooking) throw new Error('You are not a participant of this ride');

  for (const rating of ratings) {
    const { userId, score } = rating;

    if (String(userId) === String(raterId))
      throw new Error("You can't rate yourself");

    const targetBooking = await Booking.findOne({
      ride: rideId,
      user: userId,
      status: 'active'
    });
    if (!targetBooking)
      throw new Error(`User ${userId} is not a valid participant`);

    const existing = await Rating.findOne({
      ride: rideId,
      rater: raterId,
      ratedUser: userId
    });
    if (existing) throw new Error(`Already rated user ${userId}`);

    const newRating = new Rating({
      ride: rideId,
      rater: raterId,
      ratedUser: userId,
      rating: score,
    });

    await newRating.save();

    // Emit got_rated event
    io.emit('got_rated', {
      ride: rideId,
      ratedUser: userId,
      rater: raterId,
      rating: score,
    });

    // Notify the rated user
    await createNotificationService({
      user: userId,
      type: 'rating',
      ride: rideId,
      message: `You received a ${score}-star rating from a companion`
    });
  }

  return { success: true, ratedCount: ratings.length };
};
