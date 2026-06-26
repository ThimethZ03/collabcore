const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { signToken, sendTokenResponse } = require('../utils/jwt');
const { sendTempPasswordEmail, sendOTPEmail } = require('../utils/email');

/**
 * Helper: handle validation errors from express-validator
 */
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return null;
};

/**
 * POST /api/v1/auth/register
 * Coordinator-only: register a new user
 */
const registerValidation = [
  body('fullName').notEmpty().withMessage('Full name is required').trim(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['student', 'coordinator', 'mentor'])
    .withMessage('Role must be student, coordinator, or mentor'),
  body('studentId').custom((value, { req }) => {
    if (req.body.role === 'student' && !value) {
      throw new Error('Student ID is required for students');
    }
    return true;
  }),
];

const register = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { fullName, email, role, studentId, faculty, yearOfStudy } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');

    const user = await User.create({
      fullName,
      email,
      password: tempPassword,
      role,
      studentId: studentId || undefined,
      faculty: faculty || undefined,
      yearOfStudy: yearOfStudy || undefined,
    });

    // Log temporary password (since email may not be configured)
    console.log(`[AUTH] New user registered: ${email} | Temp password: ${tempPassword}`);

    // Send temporary password to user's email
    await sendTempPasswordEmail(user.email, user.fullName, tempPassword);

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      user: userObj,
      tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 */
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['student', 'coordinator', 'mentor'])
    .withMessage('Invalid role'),
];

const login = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { email, password, role } = req.body;

    const user = await User.findOne({ email, role }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: 'This account has been deactivated',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('team')
      .populate('assignedMentor', 'fullName email');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/auth/update-profile
 */
const updateProfileValidation = [
  body('bio').optional({ checkFalsy: true }).isLength({ max: 200 }).withMessage('Bio must be 200 chars or fewer'),
  body('availabilityHours').optional({ checkFalsy: true }).isInt({ min: 5, max: 40 }).withMessage('Availability hours must be between 5 and 40'),
  body('preferredRole')
    .optional({ checkFalsy: true })
    .isIn(['Project Manager', 'Software Developer', 'UI/UX Designer', 'QA Tester', 'Business Analyst', 'No Preference'])
    .withMessage('Invalid preferred role'),
  body('faculty').optional({ checkFalsy: true }).isString().trim(),
  body('yearOfStudy').optional({ checkFalsy: true }).isInt({ min: 1, max: 4 }).withMessage('Year of study must be between 1 and 4'),
];

const updateProfile = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const allowedFields = [
      'phone', 'bio', 'skills', 'softSkills', 'preferredRole',
      'availabilityHours', 'availableDays', 'projectInterests',
      'preferredTopics', 'avatar', 'faculty', 'yearOfStudy',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Check if profile is being completed for the first time
    const user = req.user;
    if (!user.profileComplete) {
      const hasSkills = updates.skills && updates.skills.length > 0 || (user.skills && user.skills.length > 0);
      const hasRole = updates.preferredRole || user.preferredRole;
      const hasAvailability = updates.availabilityHours || user.availabilityHours;
      if (hasSkills && hasRole && hasAvailability) {
        updates.profileComplete = true;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('team', 'name').populate('assignedMentor', 'fullName email');

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/change-password
 */
const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

const changePassword = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: user._id,
      type: 'alert',
      title: 'Password Changed Successfully',
      body: 'Your account password has been updated. If you did not initiate this change, contact the coordinator immediately.',
      link: '/setup-profile',
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/forgot-password
 */
const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const forgotPassword = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP and set expiry
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    // Log OTP to console (since email may not be configured)
    console.log(`[AUTH] Password reset OTP for ${email}: ${otp}`);

    // Send OTP verification email
    await sendOTPEmail(user.email, user.fullName, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent to email (check console in dev mode)',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/reset-password
 */
const resetPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').notEmpty().withMessage('OTP is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

const resetPassword = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { email, otp, newPassword } = req.body;

    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordOTP: hashedOTP,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: user._id,
      type: 'alert',
      title: 'Password Reset Successfully',
      body: 'Your account password has been reset using OTP. If you did not do this, contact the coordinator.',
      link: '/login',
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  registerValidation,
  login,
  loginValidation,
  getMe,
  updateProfile,
  updateProfileValidation,
  changePassword,
  changePasswordValidation,
  forgotPassword,
  forgotPasswordValidation,
  resetPassword,
  resetPasswordValidation,
};
