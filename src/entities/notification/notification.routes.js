import express from 'express';
import {
  createNotification,
  listNotificationsByUser,
  markNotificationAsRead
} from './notification.controller.js';
import { verifyToken } from '../../core/middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, createNotification);
router.get('/user', verifyToken, listNotificationsByUser);
router.put('/:id/read', verifyToken, markNotificationAsRead);

export default router; 