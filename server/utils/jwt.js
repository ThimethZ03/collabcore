const jwt = require('jsonwebtoken');

/**
 * Sign a JWT token for a user
 */
const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Create token and send response
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Remove password from output
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    token,
    user: userObj,
  });
};

module.exports = { signToken, sendTokenResponse };
