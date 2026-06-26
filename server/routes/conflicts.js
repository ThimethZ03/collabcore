const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, restrictTo } = require('../middleware/auth');
const {
  getConflicts,
  getConflictById,
  resolveConflict,
  notifyCoordinator,
} = require('../controllers/conflictController');

router.use(protect);

router.get('/', restrictTo('coordinator', 'mentor'), getConflicts);

router.post(
  '/notify-coordinator',
  restrictTo('mentor'),
  [body('conflictId').notEmpty().withMessage('Conflict ID is required')],
  notifyCoordinator
);

router.get('/:id', restrictTo('coordinator', 'mentor'), getConflictById);

router.patch(
  '/:id/resolve',
  restrictTo('coordinator', 'mentor'),
  [body('resolutionNote').optional().isString()],
  resolveConflict
);

module.exports = router;
