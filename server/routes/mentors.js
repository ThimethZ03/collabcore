const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getMentors,
  getMentorTeams,
  assignTeamToMentor,
} = require('../controllers/mentorController');

router.get('/', protect, getMentors);
router.get('/:mentorId/teams', protect, getMentorTeams);
router.patch(
  '/:mentorId/assign-team/:teamId',
  protect,
  restrictTo('coordinator'),
  assignTeamToMentor
);

module.exports = router;
