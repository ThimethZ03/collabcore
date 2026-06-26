import api from './axios';

export const getTeams = (params) =>
  api.get('/teams', { params });

export const getTeamById = (id) =>
  api.get(`/teams/${id}`);

export const runFormation = (config) =>
  api.post('/teams/formation/run', config);

export const overrideTeam = (id, data) =>
  api.patch(`/teams/${id}`, data);

export const overrideRoles = (id, roles) =>
  api.patch(`/teams/${id}/override-roles`, { roles });

export const deleteTeam = (id) =>
  api.delete(`/teams/${id}`);

export const getWorkload = (teamId) =>
  api.get(`/teams/${teamId}/workload`);

export const proposeTeam = (data) =>
  api.post('/teams', data);

export const approveTeam = (id) =>
  api.patch(`/teams/${id}/approve`);

// ── Invite system ──────────────────────────────────────────────
export const sendInvite = (data) =>
  api.post('/teams/invite', data);

export const getSentInvites = () =>
  api.get('/teams/invite/sent');

export const respondToInvite = (inviteId, action) =>
  api.patch(`/teams/invite/${inviteId}/respond`, { action });

export const cancelInvite = (inviteId) =>
  api.delete(`/teams/invite/${inviteId}`);
