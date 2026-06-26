const mongoose = require('mongoose');

/**
 * TeamInvite tracks an invitation sent by a team leader to a student.
 * The `notificationId` links back to the Notification shown in the invitee's bell.
 */
const teamInviteSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      default: 'Software Developer',
    },
    // Name proposed by the leader for their future team
    proposedTeamName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled'],
      default: 'pending',
    },
    // Reference to the Notification document sent to the invitee
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
    },
  },
  { timestamps: true }
);

// Index for fast lookups by sender and recipient
teamInviteSchema.index({ from: 1, status: 1 });
teamInviteSchema.index({ to: 1, status: 1 });

const TeamInvite = mongoose.model('TeamInvite', teamInviteSchema);
module.exports = TeamInvite;
