const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getMilestones,
  createMilestone,
  getMilestoneById,
  updateMilestone,
  submitDeliverable,
  getTeamTimeline,
} = require('../controllers/milestoneController');

router.use(protect);

router.get('/', getMilestones);

router.post(
  '/',
  restrictTo('coordinator', 'mentor'),
  [
    body('name').notEmpty().withMessage('Milestone name is required'),
    body('team').notEmpty().withMessage('Team is required'),
    body('dueDate').notEmpty().withMessage('Due date is required'),
  ],
  createMilestone
);

router.get('/team/:teamId/timeline', getTeamTimeline);

router.get('/:id', getMilestoneById);

router.patch('/:id', restrictTo('coordinator', 'mentor'), updateMilestone);

router.post(
  '/:id/submit-deliverable',
  restrictTo('student'),
  upload.single('deliverable'),
  submitDeliverable
);

module.exports = router;
