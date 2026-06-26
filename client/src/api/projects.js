import api from './axios';

export const getProjects = (params) =>
  api.get('/projects', { params });

export const getProjectById = (id) =>
  api.get(`/projects/${id}`);

export const createProject = (data) =>
  api.post('/projects', data);

export const updateProject = (id, data) =>
  api.patch(`/projects/${id}`, data);

export const assignTeam = (id, teamId) =>
  api.patch(`/projects/${id}/assign-team`, { teamId });

export const runAllocation = () =>
  api.post('/projects/allocation/run');

export const getAllocationPreview = () =>
  api.get('/projects/allocation/preview');

export const archiveProject = (id) =>
  api.patch(`/projects/${id}/archive`);
