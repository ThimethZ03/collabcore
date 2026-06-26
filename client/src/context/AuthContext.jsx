import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    token: localStorage.getItem('collabcore-token'),
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('collabcore-token');
      if (!token) {
        setState({ user: null, token: null, loading: false, isAuthenticated: false });
        return;
      }
      try {
        const { data } = await authApi.getMe();
        const user = data.data?.user || data.user || data.data || data;
        setState({ user, token, loading: false, isAuthenticated: true });
      } catch {
        localStorage.removeItem('collabcore-token');
        localStorage.removeItem('collabcore-user');
        setState({ user: null, token: null, loading: false, isAuthenticated: false });
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password, role) => {
    const { data } = await authApi.login(email, password, role);
    const token = data.token || data.data?.token;
    const user = data.data?.user || data.user || data.data;
    localStorage.setItem('collabcore-token', token);
    localStorage.setItem('collabcore-user', JSON.stringify(user));
    setState({ user, token, loading: false, isAuthenticated: true });
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('collabcore-token');
    localStorage.removeItem('collabcore-user');
    setState({ user: null, token: null, loading: false, isAuthenticated: false });
  }, []);

  const updateUser = useCallback(async (data) => {
    const res = await authApi.updateProfile(data);
    const updatedUser = res.data?.data || res.data?.user || res.data || data;
    setState((prev) => {
      const mergedUser = { ...prev.user, ...updatedUser };
      localStorage.setItem('collabcore-user', JSON.stringify(mergedUser));
      return { ...prev, user: mergedUser };
    });
    return updatedUser;
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
