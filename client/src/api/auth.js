import api from './axios';

export const login = (email, password, role) =>
  api.post('/auth/login', { email, password, role });

export const getMe = () =>
  api.get('/auth/me');

export const updateProfile = (data) =>
  api.patch('/auth/update-profile', data);

export const changePassword = (data) =>
  api.post('/auth/change-password', data);

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email });

export const resetPassword = (data) =>
  api.post('/auth/reset-password', data);

export const register = (data) =>
  api.post('/auth/register', data);
