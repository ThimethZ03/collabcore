const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
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
} = require('../controllers/authController');

router.post('/register', protect, restrictTo('coordinator'), registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.patch('/update-profile', protect, updateProfileValidation, updateProfile);
router.post('/change-password', protect, changePasswordValidation, changePassword);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);

module.exports = router;
