const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },
    type: {
      type: String,
      enum: ['alert', 'task', 'feedback', 'system', 'evaluation', 'team_invite'],
    },
    // Arbitrary metadata — used by team_invite to carry { inviteId, role, status }
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
    },
    body: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
