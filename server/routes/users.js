const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getUsers,
  getUser,
  updateUser,
  updateUserValidation,
  deleteUser,
  bulkImport,
  getStatsOverview,
} = require('../controllers/userController');

// Stats must come before /:id to avoid route conflict
router.get('/stats/overview', protect, restrictTo('coordinator'), getStatsOverview);

router.get('/', protect, restrictTo('coordinator', 'student'), getUsers);
router.post('/bulk-import', protect, restrictTo('coordinator'), bulkImport);

router.get('/:id', protect, getUser);
router.patch('/:id', protect, updateUserValidation, updateUser);
router.delete('/:id', protect, restrictTo('coordinator'), deleteUser);

module.exports = router;
