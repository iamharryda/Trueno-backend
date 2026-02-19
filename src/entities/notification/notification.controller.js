import { generateResponse } from '../../lib/responseFormate.js';
import {
  createNotificationService,
  listNotificationsByUserService,
  markNotificationAsReadService
} from './notification.service.js';

export const createNotification = async (req, res, next) => {
  try {
    const notification = await createNotificationService({ ...req.body, user: req.user._id });
    generateResponse(res, 201, true, 'Notification created successfully', notification);
  } catch (error) {
    generateResponse(res, 400, false, error.message, null);
  }
};

export const listNotificationsByUser = async (req, res, next) => {
  try {
    const notifications = await listNotificationsByUserService(req.user._id);
    generateResponse(res, 200, true, 'Notifications fetched successfully', notifications);
  } catch (error) {
    generateResponse(res, 400, false, error.message, null);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await markNotificationAsReadService(req.params.id, req.user._id);
    generateResponse(res, 200, true, 'Notification marked as read', notification);
  } catch (error) {
    generateResponse(res, 400, false, error.message, null);
  }
}; 