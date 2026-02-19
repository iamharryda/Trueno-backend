import express from 'express';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';
import {
  createRide,
  filterRides,
  seeRide,
  updateRide,
  softDeleteRide,
  joinRide,
  leaveRide,
  finishRide,
  voteKickUser,
  getKickVoteStatus,
  transferOwnership,
  getRideParticipants,
  setMeetPoint
} from './ride.controller.js';

const router = express.Router();

router.route('/').post(verifyToken, createRide).get(filterRides);

router
  .route('/:rideId')
  .get(seeRide)
  .patch(verifyToken, updateRide)
  .delete(verifyToken, softDeleteRide);

router.route('/:rideId/join').post(verifyToken, joinRide);

router.route('/:rideId/leave').post(verifyToken, leaveRide);

router.route('/:rideId/finish').post(verifyToken, finishRide);

router.route('/:rideId/transfer').patch(verifyToken, transferOwnership);

router.route('/:rideId/kick').post(verifyToken, voteKickUser);

router
  .route('/:rideId/kick-status/:userId')
  .get(verifyToken, getKickVoteStatus);

router.route('/:rideId/participants').get(verifyToken, getRideParticipants);

router.route('/:rideId/meet-point').patch(verifyToken, setMeetPoint);

export default router;
