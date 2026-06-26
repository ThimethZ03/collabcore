const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
    },
    description: {
      type: String,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team is required'],
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['Backlog', 'To Do', 'In Progress', 'Under Review', 'Completed'],
      default: 'Backlog',
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    label: {
      type: String,
      enum: ['Design', 'Dev', 'QA', 'Docs'],
      default: 'Dev',
    },
    dueDate: {
      type: Date,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
    },
    subtasks: [
      {
        title: { type: String },
        completed: { type: Boolean, default: false },
      },
    ],
    attachments: [
      {
        filename: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        text: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    hoursLogged: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;
