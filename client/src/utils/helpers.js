import { clsx } from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatDate(date, format = 'short') {
  if (!date) return '';
  const d = new Date(date);
  if (format === 'short') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (format === 'long') return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (format === 'relative') {
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
  return d.toLocaleDateString();
}

export function scoreToGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 45) return 'D';
  return 'F';
}

export function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getAvatarColor(name) {
  if (!name) return '#4A90D9';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#4A90D9', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
  return colors[Math.abs(hash) % colors.length];
}
