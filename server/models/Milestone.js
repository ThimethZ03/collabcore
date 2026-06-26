const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Milestone name is required'],
    },
    description: {
      type: String,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team is required'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    status: {
      type: String,
      enum: ['Upcoming', 'In Progress', 'Completed', 'Overdue'],
      default: 'Upcoming',
    },
    order: {
      type: Number,
    },
    deliverable: {
      filename: { type: String },
      url: { type: String },
      submittedAt: { type: Date },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
  {
    timestamps: true,
  }
);

const Milestone = mongoose.model('Milestone', milestoneSchema);
module.exports = Milestone;
