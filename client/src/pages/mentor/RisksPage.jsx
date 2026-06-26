import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import api from '../../api/axios';
import { PageWrapper } from '../../components/layout';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SkeletonCard,
  StatCard,
} from '../../components/common';
import { cn, formatDate } from '../../utils/helpers';

// Inline API requests
const getConflicts = (params) => api.get('/conflicts', { params });
const resolveConflict = (id) => api.patch(`/conflicts/${id}/resolve`);

const RISK_TYPE_LABELS = {
  missing_skills: 'Missing Skills',
  workload_imbalance: 'Workload Imbalance',
  low_participation: 'Low Participation',
  delayed_milestone: 'Delayed Milestone',
};

const RISK_TYPE_COLORS = {
  missing_skills: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-900/40',
  workload_imbalance: 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-900/40',
  low_participation: 'text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-900/40',
  delayed_milestone: 'text-red-600 bg-red-50 border-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-900/40',
};

export default function RisksPage() {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtering state
  const [filterMode, setFilterMode] = useState('All'); // 'All', 'Open', 'Critical', 'Resolved'
  const [resolvingId, setResolvingId] = useState(null);

  const fetchConflicts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getConflicts();
      const data = res.data?.data ?? res.data?.conflicts ?? res.data ?? [];
      setConflicts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load conflicts:', err);
      setError(err?.response?.data?.message || 'Failed to fetch risk alert records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await resolveConflict(id);
      // Update local state
      setConflicts((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: 'resolved' } : c))
      );
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      alert('Failed to resolve risk alert.');
    } finally {
      setResolvingId(null);
    }
  };

  // Derived filter list
  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      const severity = (c.severity || 'Medium').toLowerCase();
      const status = (c.status || 'open').toLowerCase();

      if (filterMode === 'Open') return status === 'open' || status === 'unresolved';
      if (filterMode === 'Resolved') return status === 'resolved';
      if (filterMode === 'Critical') return severity === 'critical';
      return true; // 'All'
    });
  }, [conflicts, filterMode]);

  // Derived Stats
  const stats = useMemo(() => {
    const total = conflicts.length;
    const critical = conflicts.filter((c) => (c.severity || 'Medium').toLowerCase() === 'critical').length;
    const open = conflicts.filter((c) => (c.status || 'open').toLowerCase() === 'open').length;
    const resolved = conflicts.filter((c) => (c.status || '').toLowerCase() === 'resolved').length;
    return { total, critical, open, resolved };
  }, [conflicts]);

  const getSeverityBadge = (severity) => {
    const s = (severity || 'medium').toLowerCase();
    if (s === 'critical') return <Badge variant="danger">Critical</Badge>;
    if (s === 'high') return <Badge variant="warning">High</Badge>;
    if (s === 'low') return <Badge variant="gray">Low</Badge>;
    return <Badge variant="primary">Medium</Badge>;
  };

  const getStatusBadge = (status) => {
    const s = (status || 'open').toLowerCase();
    if (s === 'resolved') return <Badge variant="success">Resolved</Badge>;
    if (s === 'in_progress') return <Badge variant="info">In Progress</Badge>;
    return <Badge variant="danger">Open</Badge>;
  };

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverted">
              Risk & Conflict Alerts
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary dark:text-text-muted">
              Monitor automatically detected workload imbalances, delayed milestones, or skill deficiencies.
            </p>
          </div>
          <div>
            <Button variant="ghost" size="sm" onClick={fetchConflicts} disabled={loading}>
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        {!loading && !error && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Risks" value={stats.total} icon={ShieldAlert} color="primary" />
            <StatCard label="Critical Issues" value={stats.critical} icon={AlertTriangle} color={stats.critical > 0 ? 'danger' : 'success'} />
            <StatCard label="Open Alerts" value={stats.open} icon={Clock} color="warning" />
            <StatCard label="Resolved Alerts" value={stats.resolved} icon={CheckCircle2} color="success" />
          </div>
        )}

        {/* Filters strip */}
        <div className="flex items-center gap-2 border-b border-surface-border dark:border-dark-border pb-3 overflow-x-auto">
          <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5 mr-2 shrink-0">
            <Filter size={13} />
            Filter by:
          </span>
          {['All', 'Open', 'Critical', 'Resolved'].map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all shrink-0',
                filterMode === mode
                  ? 'bg-primary border-primary text-white dark:bg-dark-primaryAccent dark:border-dark-primaryAccent dark:text-dark-bg'
                  : 'bg-surface-card border-surface-border text-text-secondary dark:bg-dark-card dark:border-dark-border dark:text-text-muted hover:border-primary/50'
              )}
            >
              {mode}
            </button>
          ))}
          <span className="text-xs text-text-muted ml-auto font-medium hidden sm:inline">
            Showing {filteredConflicts.length} alert{filteredConflicts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} lines={3} />
            ))}
          </div>
        ) : error ? (
          <Card className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Error Loading Risk Alerts"
              description={error}
              action={
                <Button variant="primary" size="sm" onClick={fetchConflicts}>
                  Retry
                </Button>
              }
            />
          </Card>
        ) : filteredConflicts.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={CheckCircle}
              title="All Clear!"
              description="No risk alerts match your current filter parameters."
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredConflicts.map((c) => {
              const label = RISK_TYPE_LABELS[c.type] || c.type || 'System Alert';
              const colorClass = RISK_TYPE_COLORS[c.type] || 'bg-gray-100 text-text-primary border-surface-border';
              const isResolved = (c.status || '').toLowerCase() === 'resolved';

              return (
                <div
                  key={c._id}
                  className={cn(
                    'rounded-xl border shadow-sm p-5 bg-surface-card border-surface-border dark:bg-dark-card dark:border-dark-border flex flex-col md:flex-row gap-5 items-start justify-between transition-shadow hover:shadow',
                    isResolved && 'opacity-60'
                  )}
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-md', colorClass)}>
                        {label}
                      </span>
                      {getSeverityBadge(c.severity)}
                      {getStatusBadge(c.status)}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-text-primary dark:text-text-inverted">
                        Team: {c.team?.name ?? c.teamName ?? `Team #${c.teamId?.slice(-4) ?? '--'}`}
                      </h3>
                      <p className="text-xs text-text-secondary dark:text-text-muted mt-1 leading-relaxed">
                        {c.description}
                      </p>
                    </div>

                    <p className="text-[10px] text-text-muted font-medium">
                      Flagged: {formatDate(c.createdAt || c.updatedAt, 'long')}
                    </p>
                  </div>

                  {!isResolved && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleResolve(c._id)}
                      loading={resolvingId === c._id}
                      disabled={resolvingId === c._id}
                      className="shrink-0 self-end md:self-center"
                    >
                      <CheckCircle2 size={14} />
                      Mark as Resolved
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
