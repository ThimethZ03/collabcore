import api from './axios';

export const getMilestones = (params) =>
  api.get('/milestones', { params });

export const getMilestoneById = (id) =>
  api.get(`/milestones/${id}`);

export const createMilestone = (data) =>
  api.post('/milestones', data);

export const updateMilestone = (id, data) =>
  api.patch(`/milestones/${id}`, data);

export const submitDeliverable = (id, formData) =>
  api.post(`/milestones/${id}/submit-deliverable`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getTimeline = (teamId) =>
  api.get(`/milestones/team/${teamId}/timeline`);
