const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markAllRead,
  markRead,
  deleteNotification,
  getUnreadCount,
} = require('../controllers/notificationController');

router.use(protect);

router.get('/', getNotifications);
router.patch('/mark-all-read', markAllRead);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

module.exports = router;
