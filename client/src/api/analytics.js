import api from './axios';

export const getOverview = () =>
  api.get('/analytics/overview');

export const getSkillDistribution = () =>
  api.get('/analytics/skill-distribution');

export const getRoleCoverage = () =>
  api.get('/analytics/role-coverage');

export const getTaskCompletionByTeam = () =>
  api.get('/analytics/task-completion-by-team');

export const getTeamProgressOverTime = (weeks) =>
  api.get('/analytics/team-progress-over-time', { params: { weeks } });

export const getSkillGaps = () =>
  api.get('/analytics/skill-gaps');

export const triggerRiskScan = () =>
  api.post('/analytics/risk-scan');
