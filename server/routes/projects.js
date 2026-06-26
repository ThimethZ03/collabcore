const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getProjects,
  createProject,
  createProjectValidation,
  getProject,
  updateProject,
  updateProjectValidation,
  assignTeam,
  assignTeamValidation,
  runAllocationRoute,
  previewAllocationRoute,
  archiveProject,
} = require('../controllers/projectController');

// Allocation routes must be before /:id to avoid conflict
router.post('/allocation/run', protect, restrictTo('coordinator'), runAllocationRoute);
router.get('/allocation/preview', protect, restrictTo('coordinator'), previewAllocationRoute);

router.get('/', protect, getProjects);
router.post('/', protect, restrictTo('coordinator', 'student'), createProjectValidation, createProject);

router.get('/:id', protect, getProject);
router.patch('/:id', protect, restrictTo('coordinator', 'student'), updateProjectValidation, updateProject);
router.patch('/:id/assign-team', protect, restrictTo('coordinator'), assignTeamValidation, assignTeam);
router.patch('/:id/archive', protect, restrictTo('coordinator', 'student'), archiveProject);

module.exports = router;
