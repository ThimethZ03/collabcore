import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle, Spinner } from '../../components/common';
import { cn } from '../../utils/helpers';

const schema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(6, 'Minimum 6 characters').required('Password is required'),
});

const roles = [
  { key: 'student', label: 'Student' },
  { key: 'coordinator', label: 'Coordinator' },
  { key: 'mentor', label: 'Mentor' },
];

const roleHomes = {
  student: '/student/dashboard',
  coordinator: '/coordinator/dashboard',
  mentor: '/mentor/dashboard',
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data) => {
    setServerError('');
    setLoading(true);
    try {
      const user = await login(data.email, data.password, selectedRole);
      if (user?.role === 'student' && !user?.profileComplete) {
        navigate('/setup-profile');
      } else {
        navigate(roleHomes[user?.role] || '/');
      }
    } catch (err) {
      setServerError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-primary dark:bg-gradient-primary-dark">
        {/* Decorative shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute top-40 right-20 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute bottom-32 left-1/4 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute bottom-20 right-10 w-16 h-16 bg-white/10 rotate-45" />
        <svg className="absolute top-1/4 right-1/3 opacity-10" width="80" height="80" viewBox="0 0 80 80">
          <polygon points="40,5 75,65 5,65" fill="white" />
        </svg>
        <svg className="absolute bottom-1/3 left-16 opacity-10" width="60" height="60" viewBox="0 0 60 60">
          <polygon points="30,2 58,18 58,50 30,58 2,50 2,18" fill="white" stroke="white" strokeWidth="1" />
        </svg>
        <div className="absolute top-60 left-1/2 w-24 h-24 border-2 border-white/10 rounded-xl rotate-12" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
            <span className="text-2xl font-bold text-white">CC</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">CollabCore</h1>
          <p className="text-xl text-white/90 mb-2">Capstone Project Management</p>
          <p className="text-sm text-white/70 max-w-sm">
            Streamline team formation, project allocation, and milestone tracking for academic capstone projects.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex items-center justify-center p-6 bg-white dark:bg-dark-card relative">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">CC</span>
          </div>
          <span className="text-lg font-bold text-text-primary dark:text-text-inverted">
            CollabCore
          </span>
        </div>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-text-primary dark:text-text-inverted mb-2">
              Welcome back
            </h2>
            <p className="text-text-secondary dark:text-text-muted">
              Sign in to your account to continue
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex border-b border-surface-border dark:border-dark-border mb-6">
            {roles.map((role) => (
              <button
                key={role.key}
                onClick={() => setSelectedRole(role.key)}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors relative',
                  selectedRole === role.key
                    ? 'text-primary dark:text-dark-primaryAccent'
                    : 'text-text-secondary dark:text-text-muted hover:text-text-primary dark:hover:text-text-inverted'
                )}
              >
                {role.label}
                {selectedRole === role.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-dark-primaryAccent" />
                )}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {serverError && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle size={18} className="text-danger shrink-0" />
              <p className="text-sm text-danger">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-inverted mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-text-muted" />
                </div>
                <input
                  type="email"
                  placeholder="you@university.edu"
                  {...register('email')}
                  className={cn(
                    'w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm transition-colors',
                    'bg-surface-input text-text-primary placeholder-text-muted',
                    'border-surface-border focus:border-primary focus:ring-2 focus:ring-primary/20',
                    'dark:bg-dark-input dark:text-text-inverted dark:placeholder-text-muted',
                    'dark:border-dark-border dark:focus:border-dark-primaryAccent dark:focus:ring-dark-primaryAccent/20',
                    errors.email && 'border-danger focus:border-danger focus:ring-danger/20'
                  )}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-inverted mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-text-muted" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                  className={cn(
                    'w-full rounded-lg border pl-10 pr-10 py-2.5 text-sm transition-colors',
                    'bg-surface-input text-text-primary placeholder-text-muted',
                    'border-surface-border focus:border-primary focus:ring-2 focus:ring-primary/20',
                    'dark:bg-dark-input dark:text-text-inverted dark:placeholder-text-muted',
                    'dark:border-dark-border dark:focus:border-dark-primaryAccent dark:focus:ring-dark-primaryAccent/20',
                    errors.password && 'border-danger focus:border-danger focus:ring-danger/20'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary dark:hover:text-text-inverted transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-surface-border text-primary focus:ring-primary/20 dark:border-dark-border dark:bg-dark-input"
                />
                <span className="text-sm text-text-secondary dark:text-text-muted">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-primary dark:text-dark-primaryAccent hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                'bg-primary text-white hover:bg-primary-hover',
                'dark:bg-dark-primaryAccent dark:text-dark-bg dark:hover:bg-blue-400',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-dark-primaryAccent/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading && <Spinner size="sm" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted dark:text-text-muted mt-6">
            Don't have an account?{' '}
            <span className="text-primary dark:text-dark-primaryAccent">
              Contact your coordinator
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
