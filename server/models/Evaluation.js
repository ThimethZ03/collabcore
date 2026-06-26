const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mentor is required'],
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    technicalQuality: {
      type: Number,
      min: 0,
      max: 100,
    },
    collaboration: {
      type: Number,
      min: 0,
      max: 100,
    },
    taskCompletion: {
      type: Number,
      min: 0,
      max: 100,
    },
    innovation: {
      type: Number,
      min: 0,
      max: 100,
    },
    writtenFeedback: {
      type: String,
    },
    strengthTags: [String],
    improvementTags: [String],
    status: {
      type: String,
      enum: ['Draft', 'Submitted'],
      default: 'Draft',
    },
    mark: {
      type: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

evaluationSchema.virtual('overallScore').get(function () {
  const tq = this.technicalQuality || 0;
  const co = this.collaboration || 0;
  const tc = this.taskCompletion || 0;
  const inn = this.innovation || 0;
  return tq * 0.4 + co * 0.2 + tc * 0.2 + inn * 0.2;
});

const Evaluation = mongoose.model('Evaluation', evaluationSchema);
module.exports = Evaluation;
