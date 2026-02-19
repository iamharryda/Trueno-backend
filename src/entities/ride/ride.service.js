import mongoose from 'mongoose';
import Booking from '../booking/booking.model.js';
import Rating from '../rating/rating.model.js';
import Ride from './ride.model.js';
import ChatRoom from '../message/chatRoom.model.js';
import Message from '../message/message.model.js';
import { createNotificationService } from '../notification/notification.service.js';
import { io } from '../../app.js';


export const createRideService = async (
  userId,
  { startLocation, endLocation, departureTime, seatCount, note  }
) => {
  if (seatCount < 1) throw new Error('Seat count must be at least 1');

  // Inject GeoJSON into location fields
  startLocation.location = {
    type: 'Point',
    coordinates: [startLocation.lng, startLocation.lat]
  };

  endLocation.location = {
    type: 'Point',
    coordinates: [endLocation.lng, endLocation.lat]
  };

  if (note?.lat && note?.lng) {
  note.location = {
    type: 'Point',
    coordinates: [note.lng, note.lat]
   };
  }

  const ride = new Ride({
    creator: userId,
    startLocation,
    endLocation,
    departureTime,
    seatCount,
    bookedSeats: 1,
    note,
    price: 0
  });

  await ride.save();

  // ChatRoom creation
  const chatRoom = await ChatRoom.create({
    ride: ride._id,
    name: `Ride to ${endLocation.address}`,
    isGroup: true,
    participants: [userId],
    description: `Group chat for ride from ${startLocation.address} to ${endLocation.address}`
  });

  ride.chatRoom = chatRoom._id;
  await ride.save();

  // System welcome message
  await Message.create({
    chatRoom: chatRoom._id,
    sender: userId,
    message: "Welcome to the ride! You're the only one here now. Others will join soon.",
    type: "system"
  });

  // Initial booking
  await Booking.create({
    ride: ride._id,
    user: userId,
    seatBooked: 1,
    baggageType: 'Suitcase',
    status: 'active',
    joinedAt: new Date()
  });

  // Emit ride_created event
  io.emit('ride_created', {
    ride: ride._id,
    creator: userId,
    chatRoom: chatRoom._id
  });

  // Notify creator
  await createNotificationService({
    user: userId,
    type: 'general',
    message: 'Ride created successfully',
    ride: ride._id
  });

  return { ride, chatRoom };
};


export const seeRideService = async (rideId) => {
  const ride = await Ride.findById(rideId)
    .populate('creator', '-password')
    .populate('chatRoom')
    .populate('ratings')
    .lean();

  if (!ride) throw new Error('Ride not found');
  return ride;
};



// Utility to calculate Haversine distance (in meters)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// to find correct direction of the ride
// bearing calculation based on start and end coordinates
function calculateBearing(lat1, lng1, lat2, lng2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const toDeg = rad => (rad * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}


// angle difference between two bearings
function bearingDiff(b1, b2) {
  const diff = Math.abs(b1 - b2);
  return diff > 180 ? 360 - diff : diff;
}


export const filterRidesService = async (query) => {
  const {
    fromLat,
    fromLng,
    toLat,
    toLng,
    departureTime,
    departureFlexMinutes = 15,
    departureFlexKm = 0.2,
    arrivalFlexKm = 0.2,
    passengers = 1,
    page = 1,
    limit = 10
  } = query;

  if (!fromLat || !fromLng || !toLat || !toLng || !departureTime) {
    throw new Error('Missing required parameters: fromLat, fromLng, toLat, toLng, or departureTime');
  }

  const parsedDeparture = new Date(departureTime);
  if (isNaN(parsedDeparture)) {
    throw new Error('Invalid departureTime format. Use ISO 8601');
  }

  const timeMin = new Date(parsedDeparture.getTime() - departureFlexMinutes * 60000);
  const timeMax = new Date(parsedDeparture.getTime() + departureFlexMinutes * 60000);

  const departureMaxDistance = parseFloat(departureFlexKm) * 1000;
  const arrivalMaxDistance = parseFloat(arrivalFlexKm) * 1000;

  const userBearing = calculateBearing(fromLat, fromLng, toLat, toLng);

  const rides = await Ride.find({
    status: 'active',
    departureTime: { $gte: timeMin, $lte: timeMax },
    $expr: {
      $gte: [{ $subtract: ['$seatCount', '$bookedSeats'] }, parseInt(passengers)]
    },
    'startLocation.location': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(fromLng), parseFloat(fromLat)]
        },
        $maxDistance: departureMaxDistance
      }
    }
  });

  const filtered = rides.filter(ride => {
    const end = ride.endLocation;
    const distance = haversineDistance(toLat, toLng, end.lat, end.lng);
    const rideBearing = ride.bearing ?? calculateBearing(
      ride.startLocation.lat,
      ride.startLocation.lng,
      end.lat,
      end.lng
    );
    const directionOK = bearingDiff(userBearing, rideBearing) <= 45;

    return distance <= arrivalMaxDistance && directionOK;
  });

  // Sort by departureTime
  const sorted = filtered.sort((a, b) => a.departureTime - b.departureTime);

  // Pagination calculation
  const currentPage = parseInt(page);
  const pageSize = parseInt(limit);
  const totalData = sorted.length;
  const totalPages = Math.ceil(totalData / pageSize);
  const start = (currentPage - 1) * pageSize;
  const paginated = sorted.slice(start, start + pageSize);

  return {
    rides: paginated,
    pagination: {
      currentPage,
      totalPages,
      totalData,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    }
  };
};



export const updateRideService = async (rideId, userId, updates) => {
  const ride = await Ride.findOneAndUpdate(
    { _id: rideId, creator: userId, status: 'active' },
    updates,
    { new: true }
  );
  if (!ride) throw new Error('Ride not found or not authorized to update');
  return ride;
};


export const softDeleteRideService = async (rideId, userId) => {
  const ride = await Ride.findOneAndUpdate(
    { _id: rideId, creator: userId, status: 'active' },
    { deletedByCreator: true, status: 'cancelled' },
    { new: true }
  );
  if (!ride) throw new Error('Ride not found or not authorized to delete');
  return ride;
};


export const joinRideService = async (rideId, userId, { baggageType }) => {
  const seatBooked = 1;

  const ride = await Ride.findById(rideId).populate('chatRoom');
  if (!ride || ride.status !== 'active') throw new Error('Ride not available');

  if (ride.bookedSeats + seatBooked > ride.seatCount) {
    throw new Error('Not enough seats available');
  }

  const booking = await Booking.create({
    ride: rideId,
    user: userId,
    seatBooked,
    baggageType,
    status: 'active',
    joinedAt: new Date()
  });

  ride.bookedSeats += seatBooked;
  await ride.save();

  // Add user to chat room if it exists
  if (ride.chatRoom) {
    const chatRoom = await ChatRoom.findById(ride.chatRoom);
    if (!chatRoom) {
      console.error('Chat room not found for ride:', ride.chatRoom);
    } else {
      // Use .some for ObjectId comparison
      const alreadyParticipant = chatRoom.participants.some(
        id => id.toString() === userId.toString()
      );
      if (!alreadyParticipant) {
        chatRoom.participants.push(userId);
        try {
          await chatRoom.save();
          // console.log('Added user to chat room:', userId, 'ChatRoom:', chatRoom._id);
        } catch (err) {
          console.error('Error saving chat room:', err);
        }

        try {
          await Message.create({
            chatRoom: ride.chatRoom,
            sender: userId,
            message: `A new passenger joined the ride`,
            type: "system"
          });
          console.log('System message created for chat room:', ride.chatRoom);
        } catch (err) {
          console.error('Error creating system message:', err);
        }

        io.to(`room-${ride.chatRoom}`).emit('userJoined', { 
          roomId: ride.chatRoom, 
          userId: userId,
          rideId: rideId 
        });
      } else {
        console.log('User already a participant:', userId);
      }
    }
  } else {
    console.error('Ride has no chatRoom field:', ride._id);
  }

  // Emit ride joined event
  io.emit('ride_joined', {
    ride: rideId,
    user: userId,
    seatBooked,
    baggageType
  });

  // Notify ride creator about new join
  if (!ride.creator.equals(userId)) {
    await createNotificationService({
      user: ride.creator,
      type: 'join',
      ride: rideId,
      message: 'A new passenger joined your ride'
    });
  }

  // Create notification for joining user
  await createNotificationService({
    user: userId,
    type: 'join',
    ride: rideId,
    message: 'You successfully joined the ride'
  });

  const bookings = await Booking.find({ ride: rideId, status: 'active' })
    .populate('user', 'name email avatar')
    .lean();

  const participantIds = bookings.map(b => b.user._id);

  const ratings = await Rating.aggregate([
    {
      $match: {
        ride: new mongoose.Types.ObjectId(rideId),
        ratedUser: { $in: participantIds }
      }
    },
    {
      $group: {
        _id: '$ratedUser',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const ratingMap = {};
  ratings.forEach(r => {
    ratingMap[r._id.toString()] = {
      avgRating: r.avgRating.toFixed(1),
      ratingCount: r.count
    };
  });

  const participants = bookings.map(b => ({
    user: {
      ...b.user,
      avgRating: ratingMap[b.user._id.toString()]?.avgRating || null,
      ratingCount: ratingMap[b.user._id.toString()]?.ratingCount || 0
    },
    seatBooked: b.seatBooked,
    baggageType: b.baggageType,
    joinedAt: b.joinedAt
  }));

  return { booking, participants };
};


export const leaveRideService = async (rideId, userId) => {
  const ride = await Ride.findById(rideId).populate('chatRoom');
  if (!ride || ride.status !== 'active') throw new Error('Cannot leave ride');

  const booking = await Booking.findOneAndUpdate(
    { ride: rideId, user: userId, status: 'active' },
    { status: 'cancelled', leftAt: new Date() },
    { new: true }
  );
  if (!booking) throw new Error('Booking not found');

  // Update bookedSeats
  ride.bookedSeats -= booking.seatBooked;

  // If creator leaves, transfer ownership
  if (ride.creator.equals(userId) && ride.bookedSeats > 0) {
    const newCreatorBooking = await Booking.findOne(
      { ride: rideId, status: 'active' },
      null,
      { sort: { joinedAt: 1 } }
    );
    if (newCreatorBooking) ride.newCreator = newCreatorBooking.user;
  }

  await ride.save();

  // Handle chat room
  if (ride.chatRoom) {
    const chatRoom = await ChatRoom.findById(ride.chatRoom);

    if (chatRoom) {
      // Remove user from participants
      chatRoom.participants = chatRoom.participants.filter(
        id => id.toString() !== userId.toString()
      );
      await chatRoom.save();

      // System message
      await Message.create({
        chatRoom: chatRoom._id,
        sender: userId,
        message: 'A user left the ride',
        type: 'system'
      });

      io.to(`room-${chatRoom._id}`).emit('userLeft', {
        roomId: chatRoom._id,
        userId,
        rideId
      });

      // ✅ Auto-delete chat room if < 2 participants
      if (chatRoom.participants.length < 2) {
        await Message.deleteMany({ chatRoom: chatRoom._id });
        await ChatRoom.deleteOne({ _id: chatRoom._id });

        io.to(`room-${chatRoom._id}`).emit('chatRoomDeleted', {
          roomId: chatRoom._id
        });
      }
    }
  }

  await createNotificationService({
    user: userId,
    type: 'general',
    ride: rideId,
    message: 'You left the ride'
  });
};


export const finishRideService = async (rideId, userId) => {
  const ride = await Ride.findById(rideId).populate('chatRoom');
  if (!ride) throw new Error('Ride not found');
  if (ride.status === 'completed') throw new Error('Ride already completed');

  // Mark ride as completed
  ride.status = 'completed';
  await ride.save();

  // Remove current user from chat room
  if (ride.chatRoom) {
    const chatRoom = await ChatRoom.findById(ride.chatRoom);
    if (chatRoom) {
      const index = chatRoom.participants.findIndex(
        id => id.toString() === userId.toString()
      );
      if (index !== -1) {
        chatRoom.participants.splice(index, 1);
        await chatRoom.save();

        // Send system message
        await Message.create({
          chatRoom: chatRoom._id,
          sender: null,
          message: `The ride has been completed. Please rate your companions.`,
          type: 'system'
        });

        // Emit to chat room
        io.to(`room-${chatRoom._id}`).emit('rideFinished', {
          roomId: chatRoom._id,
          userId,
          rideId
        });

        // If chat room is empty, delete it
        if (chatRoom.participants.length < 1) {
          await ChatRoom.findByIdAndDelete(chatRoom._id);
        }
      }
    }
  }

  // Notify user to rate companions
  await createNotificationService({
    user: userId,
    type: 'finish',
    ride: ride._id,
    message: 'The ride is finished. Please rate your companions.'
  });

  return ride;
};


export const transferOwnershipService = async (rideId, currentUserId) => {
  const ride = await Ride.findById(rideId);
  if (!ride || !ride.creator.equals(currentUserId))
    throw new Error('Unauthorized');

  const firstBooking = await Booking.findOne(
    { ride: rideId, status: 'active' },
    null,
    { sort: { joinedAt: 1 } }
  );
  if (!firstBooking) throw new Error('No eligible user to transfer to');

  ride.newCreator = firstBooking.user;
  await ride.save();
  return ride;
};

export const voteKickUserService = async (rideId, voterId, targetUserId) => {
  if (voterId === targetUserId)
    throw new Error('You cannot vote to kick yourself');

  const ride = await Ride.findById(rideId).populate('chatRoom');
  if (!ride) throw new Error('Ride not found');
  if (ride.creator.toString() === targetUserId)
    throw new Error('Cannot kick the ride creator');

  const existing = ride.kickedVotes.find(
    (k) => k.targetUser.toString() === targetUserId
  );
  if (existing) {
    if (!existing.votedBy.includes(voterId)) {
      existing.votedBy.push(voterId);
    }
  } else {
    ride.kickedVotes.push({ targetUser: targetUserId, votedBy: [voterId] });
  }

  await ride.save();

  // Check if 50% vote threshold is reached
  const voteCount = existing ? existing.votedBy.length : 1;
  const requiredVotes = Math.ceil(ride.bookedSeats * 0.5);

  if (voteCount >= requiredVotes) {
    // Kick the user from the ride
    const booking = await Booking.findOneAndUpdate(
      { ride: rideId, user: targetUserId, status: 'active' },
      { 
        status: 'cancelled', 
        leftAt: new Date(),
        kicked: true,
        cancelReason: 'Kicked by majority vote'
      },
      { new: true }
    );

    if (booking) {
      // Update ride booked seats
      ride.bookedSeats -= booking.seatBooked;
      await ride.save();

      // Remove user from chat room
      if (ride.chatRoom) {
        const chatRoom = await ChatRoom.findById(ride.chatRoom);
        if (chatRoom) {
          const participantIndex = chatRoom.participants.findIndex(
            id => id.toString() === targetUserId
          );
          if (participantIndex !== -1) {
            chatRoom.participants.splice(participantIndex, 1);
            await chatRoom.save();

            // Create system message for kick
            await Message.create({
              chatRoom: ride.chatRoom,
              sender: null,
              message: `A user was kicked from the ride by majority vote`,
              type: "system"
            });

            // Emit user kicked event to chat room
            io.to(`room-${ride.chatRoom}`).emit('userKicked', { 
              roomId: ride.chatRoom, 
              userId: targetUserId,
              rideId: rideId 
            });
          }
        }
      }

      // Emit user_kicked event
      io.emit('user_kicked', {
        ride: rideId,
        user: targetUserId,
        reason: 'Majority vote'
      });

      // Notify the kicked user
      await createNotificationService({
        user: targetUserId,
        type: 'kick',
        ride: rideId,
        message: 'You have been kicked from the ride by majority vote'
      });

      // Notify other participants
      const otherBookings = await Booking.find({ 
        ride: rideId, 
        status: 'active',
        user: { $ne: targetUserId }
      });
      
      for (const otherBooking of otherBookings) {
        await createNotificationService({
          user: otherBooking.user,
          type: 'kick',
          ride: rideId,
          message: 'A user was kicked from the ride'
        });
      }
    }
  } else {
    // Emit kick vote started event
    io.emit('kick_vote_started', {
      ride: rideId,
      targetUser: targetUserId,
      currentVotes: voteCount,
      requiredVotes: requiredVotes
    });
  }

  return ride;
};

export const getKickVoteStatusService = async (rideId, userId) => {
  const ride = await Ride.findById(rideId).lean();
  if (!ride) throw new Error('Ride not found');

  const vote = ride.kickedVotes.find((k) => k.targetUser.toString() === userId);
  if (!vote) return { totalVotes: 0, votedBy: [], eligible: false };

  const eligible = vote.votedBy.length >= Math.ceil(ride.bookedSeats * 0.5);
  return {
    totalVotes: vote.votedBy.length,
    votedBy: vote.votedBy,
    eligible
  };
};

export const getRideParticipantsService = async (rideId) => {
  const bookings = await Booking.find({ ride: rideId, status: 'active' })
    .populate('user', 'name email avatar')
    .lean();

  const participantIds = bookings.map((b) => b.user._id);

  // Get all ratings received by these users for this ride
  const ratings = await Rating.aggregate([
    {
      $match: {
        ride: new mongoose.Types.ObjectId(rideId),
        ratedUser: { $in: participantIds }
      }
    },
    {
      $group: {
        _id: '$ratedUser',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const ratingMap = {};
  ratings.forEach((r) => {
    ratingMap[r._id.toString()] = {
      avgRating: r.avgRating.toFixed(1),
      ratingCount: r.count
    };
  });

  return bookings.map((b) => ({
    user: {
      ...b.user,
      avgRating: ratingMap[b.user._id.toString()]?.avgRating || null,
      ratingCount: ratingMap[b.user._id.toString()]?.ratingCount || 0
    },
    seatBooked: b.seatBooked,
    baggageType: b.baggageType,
    joinedAt: b.joinedAt
  }));
};

export const setMeetPointService = async (rideId, userId, meetPoint) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new Error('Ride not found');
  if (!ride.creator.equals(userId))
    throw new Error('Only creator can set meet point');

  ride.meetPoint = meetPoint;
  await ride.save();

  return ride;
};
