const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
    },
    requiredSkills: [String],
    tags: [String],
    difficultyLevel: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
    },
    maxTeamsAllowed: {
      type: Number,
      default: 1,
    },
    submissionDeadline: {
      type: Date,
    },
    assignedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    preferenceList: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
    status: {
      type: String,
      enum: ['Pending', 'Available', 'In Progress', 'Completed', 'Archived', 'Rejected'],
      default: 'Available',
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
