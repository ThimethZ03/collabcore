const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getOverview,
  getSkillDistribution,
  getRoleCoverage,
  getTaskCompletionByTeam,
  getTeamProgressOverTime,
  getSkillGaps,
  triggerRiskScan,
} = require('../controllers/analyticsController');

router.use(protect);
router.use(restrictTo('coordinator'));

router.get('/overview', getOverview);
router.get('/skill-distribution', getSkillDistribution);
router.get('/role-coverage', getRoleCoverage);
router.get('/task-completion-by-team', getTaskCompletionByTeam);
router.get('/team-progress-over-time', getTeamProgressOverTime);
router.get('/skill-gaps', getSkillGaps);
router.post('/risk-scan', triggerRiskScan);

module.exports = router;
