const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  runFormation,
  getTeams,
  getTeam,
  updateTeam,
  updateTeamValidation,
  overrideRoles,
  overrideRolesValidation,
  deleteTeam,
  getTeamWorkload,
  proposeTeam,
  proposeTeamValidation,
  approveTeam,
  sendTeamInvite,
  respondToInvite,
  getMyPendingInvites,
  cancelInvite,
} = require('../controllers/teamController');

router.post('/formation/run', protect, restrictTo('coordinator'), runFormation);

// Invite routes (student only) — must be BEFORE /:id to avoid conflicts
router.post('/invite', protect, restrictTo('student'), sendTeamInvite);
router.get('/invite/sent', protect, restrictTo('student'), getMyPendingInvites);
router.patch('/invite/:inviteId/respond', protect, restrictTo('student'), respondToInvite);
router.delete('/invite/:inviteId', protect, restrictTo('student'), cancelInvite);

router.get('/', protect, getTeams);
router.post('/', protect, restrictTo('student'), proposeTeamValidation, proposeTeam);
router.get('/:id', protect, getTeam);
router.patch('/:id', protect, restrictTo('coordinator'), updateTeamValidation, updateTeam);
router.patch('/:id/approve', protect, restrictTo('coordinator'), approveTeam);
router.patch('/:id/override-roles', protect, restrictTo('coordinator'), overrideRolesValidation, overrideRoles);
router.delete('/:id', protect, restrictTo('coordinator'), deleteTeam);
router.get('/:id/workload', protect, getTeamWorkload);

module.exports = router;
