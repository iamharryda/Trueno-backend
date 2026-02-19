import { generateResponse } from '../../lib/responseFormate.js';
import {
  createRideService,
  filterRidesService,
  finishRideService,
  getKickVoteStatusService,
  getRideParticipantsService,
  joinRideService,
  leaveRideService,
  seeRideService,
  setMeetPointService,
  softDeleteRideService,
  transferOwnershipService,
  updateRideService,
  voteKickUserService
} from './ride.service.js';


export const createRide = async (req, res) => {
  try {
    const { startLocation, endLocation, departureTime, seatCount, note  } =
      req.body;
    const userId = req.user._id;

    const result = await createRideService(userId, {
      startLocation,
      endLocation,
      departureTime,
      seatCount,
      note 
    });

    generateResponse(res, 201, 'success', 'Ride created successfully', result);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};


export const seeRide = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const ride = await seeRideService(rideId);
    generateResponse(res, 200, 'success', 'Ride details retrieved', ride);
  } catch (error) {
    generateResponse(res, 404, 'error', error.message, null);
  }
};


export const filterRides = async (req, res) => {
  try {
    const result = await filterRidesService(req.query);
    return generateResponse(res, 200, 'success', 'Filtered rides fetched successfully', result);
  } catch (error) {
    console.error('[Filter Rides]', error);
    return generateResponse(res, 400, 'error', error.message, null);
  }
};


export const updateRide = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user._id;
    const updates = req.body;
    const ride = await updateRideService(rideId, userId, updates);
    generateResponse(res, 200, 'success', 'Ride updated successfully', ride);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};

export const softDeleteRide = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user._id;
    const ride = await softDeleteRideService(rideId, userId);
    generateResponse(res, 200, 'success', 'Ride deleted successfully', ride);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};

export const joinRide = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const { baggageType, seatBooked = 1 } = req.body; 
    const userId = req.user._id;

    const result = await joinRideService(rideId, userId, { seatBooked, baggageType });
    generateResponse(res, 200, 'success', 'Joined ride successfully', result);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};

export const leaveRide = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user._id;

    await leaveRideService(rideId, userId);

    generateResponse(res, 200, 'success', 'Left ride successfully', null);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};


export const finishRide = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user._id;

    const result = await finishRideService(rideId, userId);

    generateResponse(res, 200, 'success', 'Ride marked as completed', result);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};


export const transferOwnership = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user._id;
    const result = await transferOwnershipService(rideId, userId);
    generateResponse(res, 200, 'success', 'Ride ownership transferred', result);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};

export const voteKickUser = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const { targetUserId } = req.body;
    const userId = req.user._id;
    const result = await voteKickUserService(rideId, userId, targetUserId);
    generateResponse(res, 200, 'success', 'Kick vote registered', result);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};

export const getKickVoteStatus = async (req, res) => {
  try {
    const { rideId, userId } = req.params;
    const status = await getKickVoteStatusService(rideId, userId);
    generateResponse(res, 200, 'success', 'Kick vote status retrieved', status);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};

export const getRideParticipants = async (req, res) => {
  try {
    const { rideId } = req.params;
    const participants = await getRideParticipantsService(rideId);
    generateResponse(res, 200, 'success', 'Participants fetched', participants);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};

export const setMeetPoint = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { meetPoint } = req.body;
    const userId = req.user._id;

    const ride = await setMeetPointService(rideId, userId, meetPoint);
    generateResponse(res, 200, 'success', 'Meet point updated', ride);
  } catch (error) {
    generateResponse(res, 400, 'error', error.message, null);
  }
};
