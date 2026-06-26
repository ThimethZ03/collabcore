const mongoose = require('mongoose');

const conflictSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team is required'],
    },
    conflictType: {
      type: String,
      enum: [
        'Missing Skills',
        'Duplicate Project',
        'Workload Imbalance',
        'Schedule Clash',
        'Low Participation',
        'Delayed Milestone',
      ],
    },
    severity: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
    },
    description: {
      type: String,
    },
    relatedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['Open', 'Resolved'],
      default: 'Open',
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNote: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Conflict = mongoose.model('Conflict', conflictSchema);
module.exports = Conflict;
