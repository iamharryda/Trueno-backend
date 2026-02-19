import express from 'express';
import authRoutes from '../../entities/auth/auth.routes.js';
import userRoutes from '../../entities/user/user.routes.js';
import rideRoutes from '../../entities/ride/ride.routes.js';
import bookingRoutes from '../../entities/booking/booking.routes.js';
import notificationRoutes from '../../entities/notification/notification.routes.js';
import messageRoutes from '../../entities/message/message.routes.js';

const router = express.Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/ride', rideRoutes);
router.use('/v1/booking', bookingRoutes);
router.use('/v1/notification', notificationRoutes);
router.use('/v1/message', messageRoutes);

export default router;
