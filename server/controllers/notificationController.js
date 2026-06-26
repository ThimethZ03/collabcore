const { Notification } = require('../models');

// GET /api/v1/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { type, read, page = 1, limit = 50 } = req.query;
    const filter = { recipient: req.user._id };

    if (type) filter.type = type;
    if (read !== undefined) filter.read = read === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(filter);

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: notifications.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/mark-all-read
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/:id/read
exports.markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/notifications/:id
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/notifications/unread-count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({ success: true, count });
  } catch (err) {
    next(err);
  }
};
