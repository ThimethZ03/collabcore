const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      unique: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
        },
      },
    ],
    assignedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    suitabilityScore: {
      type: Number,
      default: 0,
    },
    formationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Proposed', 'Forming', 'Active', 'At Risk', 'Behind', 'Completed'],
      default: 'Forming',
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
    },
    mlScore: {
      type: Number,
      default: null,
    },
    mlLabel: {
      type: String,
      default: null,
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Unknown'],
      default: 'Unknown',
    },
    riskScore: {
      type: Number,
      default: null,
    },
    riskFlags: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Team = mongoose.model('Team', teamSchema);
module.exports = Team;
