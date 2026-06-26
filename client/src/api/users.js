import api from './axios';

export const getUsers = (params) =>
  api.get('/users', { params });

export const getUserById = (id) =>
  api.get(`/users/${id}`);

export const updateUser = (id, data) =>
  api.patch(`/users/${id}`, data);

export const deleteUser = (id) =>
  api.delete(`/users/${id}`);

export const bulkImport = (students) =>
  api.post('/users/bulk-import', { students });

export const getStats = () =>
  api.get('/users/stats/overview');
