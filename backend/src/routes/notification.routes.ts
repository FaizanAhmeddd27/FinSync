import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  getUnreadCount,
  getNotificationStats, // ADD THIS NEW FUNCTION
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/stats', getNotificationStats); 
router.patch('/mark-all-read', markAllAsRead);
router.patch('/:notificationId/read', markAsRead);
router.delete('/clear-read', clearReadNotifications);
router.delete('/:notificationId', deleteNotification);

export default router;