import Notification from './notification.model.js';
import { io } from '../../app.js';

export const createNotificationService = async (notificationData) => {
  const notification = new Notification(notificationData);
  await notification.save();
  // Emit real-time notification to the user
  io.to(`user-${notification.user}`).emit('notification', notification);
  return notification;
};

export const listNotificationsByUserService = async (userId) => {
  return await Notification.find({ user: userId }).sort({ createdAt: -1 });
};

export const markNotificationAsReadService = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) throw new Error('Notification not found');
  notification.isRead = true;
  await notification.save();
  return notification;
}; 