import api from './axios';

export const getEvaluations = (params) =>
  api.get('/evaluations', { params });

export const getEvaluationById = (id) =>
  api.get(`/evaluations/${id}`);

export const createEvaluation = (data) =>
  api.post('/evaluations', data);

export const updateEvaluation = (id, data) =>
  api.patch(`/evaluations/${id}`, data);

export const getPending = () =>
  api.get('/evaluations/pending');

export const getStudentHistory = (studentId) =>
  api.get(`/evaluations/student/${studentId}/history`);
