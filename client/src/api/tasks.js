import api from './axios';

export const getTasks = (params) =>
  api.get('/tasks', { params });

export const getTaskById = (id) =>
  api.get(`/tasks/${id}`);

export const createTask = (data) =>
  api.post('/tasks', data);

export const updateTask = (id, data) =>
  api.patch(`/tasks/${id}`, data);

export const moveTask = (id, status) =>
  api.patch(`/tasks/${id}/move`, { status });

export const addComment = (id, text) =>
  api.patch(`/tasks/${id}/comment`, { text });

export const uploadAttachment = (id, formData) =>
  api.post(`/tasks/${id}/attach`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getKanbanTasks = (teamId) =>
  api.get(`/tasks/team/${teamId}/kanban`);

export const getTaskRecommendations = (id) =>
  api.get(`/tasks/${id}/recommendations`);

