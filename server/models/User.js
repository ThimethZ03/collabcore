const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    studentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'coordinator', 'mentor'],
      required: [true, 'Role is required'],
    },
    phone: {
      type: String,
    },
    yearOfStudy: {
      type: Number,
      enum: [1, 2, 3, 4],
    },
    faculty: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 200,
    },
    avatar: {
      type: String,
    },
    profileComplete: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    skills: [
      {
        name: { type: String },
        category: { type: String },
        proficiency: {
          type: String,
          enum: ['Beginner', 'Intermediate', 'Advanced'],
        },
      },
    ],
    softSkills: [String],
    preferredRole: {
      type: String,
      enum: [
        'Project Manager',
        'Software Developer',
        'UI/UX Designer',
        'QA Tester',
        'Business Analyst',
        'No Preference',
      ],
    },
    availabilityHours: {
      type: Number,
      min: 5,
      max: 40,
    },
    availableDays: [
      {
        type: String,
        enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
    ],
    projectInterests: [String],
    preferredTopics: {
      type: String,
      maxlength: 200,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    assignedMentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resetPasswordOTP: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static: find by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model('User', userSchema);
module.exports = User;
