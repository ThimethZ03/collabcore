import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UsersRound,
  FolderKanban,
  ClipboardCheck,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  BarChart3,
  PieChart,
  Calendar,
  Zap,
  Check,
  X,
} from 'lucide-react';

import { PageWrapper } from '../../components/layout';
import {
  StatCard,
  SkeletonCard,
  EmptyState,
  Badge,
} from '../../components/common';
import BarChartWrapper from '../../components/charts/BarChartWrapper';
import DonutChartWrapper from '../../components/charts/DonutChartWrapper';

import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/helpers';

import * as analyticsApi from '../../api/analytics';
import * as teamsApi from '../../api/teams';
import * as projectsApi from '../../api/projects';

// ---------------------------------------------------------------------------
// Colour palette for the donut chart slices
// ---------------------------------------------------------------------------
const SKILL_COLORS = [
  '#6366F1', '#22C55E', '#F59E0B', '#EF4444',
  '#3B82F6', '#EC4899', '#14B8A6', '#F97316',
  '#8B5CF6', '#06B6D4',
];

// ---------------------------------------------------------------------------
// Quick-link config
// ---------------------------------------------------------------------------
const QUICK_LINKS = [
  {
    label: 'Manage Teams',
    description: 'View and override team formations',
    icon: UsersRound,
    color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100 dark:border-indigo-800/40',
    path: '/coordinator/teams',
  },
  {
    label: 'Student Roster',
    description: 'Browse and manage students',
    icon: Users,
    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-800/40',
    path: '/coordinator/students',
  },
  {
    label: 'Analytics',
    description: 'Deep-dive into performance data',
    icon: TrendingUp,
    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-800/40',
    path: '/coordinator/analytics',
  },
];

// ---------------------------------------------------------------------------
// Helper – extract nested data from API responses safely
// ---------------------------------------------------------------------------
function extractData(res, fallback = null) {
  return res?.data?.data ?? res?.data ?? fallback;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CoordinatorDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Overview stats
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  // Bar chart – task completion by team
  const [taskCompletion, setTaskCompletion] = useState([]);
  const [taskLoading, setTaskLoading] = useState(true);

  // Donut chart – skill distribution
  const [skillDist, setSkillDist] = useState([]);
  const [skillLoading, setSkillLoading] = useState(true);

  // Recent teams (for activity feed)
  const [recentTeams, setRecentTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Recent projects (for activity feed)
  const [recentProjects, setRecentProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Timestamp of last refresh
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Toast Notification Message
  const [toastMessage, setToastMessage] = useState(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------
  const fetchOverview = async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await analyticsApi.getOverview();
      setOverview(extractData(res, {}));
    } catch (err) {
      setOverviewError('Failed to load overview statistics.');
      console.error('Overview fetch error:', err);
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchTaskCompletion = async () => {
    setTaskLoading(true);
    try {
      const res = await analyticsApi.getTaskCompletionByTeam();
      const raw = extractData(res, []);
      const arr = Array.isArray(raw) ? raw : [];
      setTaskCompletion(arr);
    } catch (err) {
      console.error('Task completion fetch error:', err);
      setTaskCompletion([]);
    } finally {
      setTaskLoading(false);
    }
  };

  const fetchSkillDistribution = async () => {
    setSkillLoading(true);
    try {
      const res = await analyticsApi.getSkillDistribution();
      const raw = extractData(res, []);
      const arr = Array.isArray(raw) ? raw : [];
      const coloured = arr.map((item, idx) => ({
        name: item.skill ?? item.name ?? `Skill ${idx + 1}`,
        value: item.count ?? item.value ?? 0,
        color: SKILL_COLORS[idx % SKILL_COLORS.length],
      }));
      setSkillDist(coloured);
    } catch (err) {
      console.error('Skill distribution fetch error:', err);
      setSkillDist([]);
    } finally {
      setSkillLoading(false);
    }
  };

  const fetchRecentTeams = async () => {
    setTeamsLoading(true);
    try {
      const res = await teamsApi.getTeams({ limit: 5, sort: '-createdAt' });
      const raw = extractData(res, []);
      setRecentTeams(Array.isArray(raw) ? raw.slice(0, 5) : []);
    } catch (err) {
      console.error('Teams fetch error:', err);
      setRecentTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchRecentProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await projectsApi.getProjects({ limit: 50, sort: '-createdAt' });
      const raw = extractData(res, []);
      setRecentProjects(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Projects fetch error:', err);
      setRecentProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleAcceptProposal = async (project) => {
    try {
      await projectsApi.updateProject(project._id, { status: 'Available' });
      setToastMessage(`Project proposal "${project.title}" has been accepted.`);
      fetchOverview();
      fetchRecentProjects();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to accept project:', err);
      alert(err?.response?.data?.message || 'Failed to accept project.');
    }
  };

  const handleDenyProposal = async (project) => {
    if (!window.confirm(`Are you sure you want to deny project proposal "${project.title}"?`)) return;
    try {
      await projectsApi.updateProject(project._id, { status: 'Rejected' });
      setToastMessage(`Project proposal "${project.title}" has been rejected.`);
      fetchOverview();
      fetchRecentProjects();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to deny project:', err);
      alert(err?.response?.data?.message || 'Failed to deny project.');
    }
  };

  const handleRefresh = () => {
    setLastRefreshed(new Date());
    fetchOverview();
    fetchTaskCompletion();
    fetchSkillDistribution();
    fetchRecentTeams();
    fetchRecentProjects();
  };

  useEffect(() => {
    fetchOverview();
    fetchTaskCompletion();
    fetchSkillDistribution();
    fetchRecentTeams();
    fetchRecentProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Derived stat values (safe fallbacks to 0)
  // -------------------------------------------------------------------------
  const totalStudents = overview?.totalStudents ?? overview?.students ?? 0;
  const activeTeams = overview?.activeTeams ?? overview?.teams ?? 0;
  const activeProjects = overview?.activeProjects ?? overview?.projects ?? 0;
  const pendingEvaluations =
    overview?.pendingEvaluations ?? overview?.evaluations ?? 0;
  const overallCompletion =
    overview?.overallCompletion ?? overview?.completionRate ?? null;

  const pendingProposals = useMemo(() => {
    return recentProjects.filter((p) => p.status === 'Pending');
  }, [recentProjects]);

  const activeProjectsList = useMemo(() => {
    return recentProjects
      .filter((p) => p.status !== 'Pending' && p.status !== 'Rejected' && p.status !== 'Archived')
      .slice(0, 4);
  }, [recentProjects]);

  // -------------------------------------------------------------------------
  // Helper: project status badge variant
  // -------------------------------------------------------------------------
  function projectStatusVariant(status) {
    const s = (status ?? '').toLowerCase();
    if (s === 'active' || s === 'in_progress') return 'success';
    if (s === 'completed') return 'info';
    if (s === 'archived') return 'gray';
    return 'warning';
  }

  // -------------------------------------------------------------------------
  // Greeting based on time-of-day
  // -------------------------------------------------------------------------
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName =
    user?.name?.split(' ')[0] ?? user?.email ?? 'Coordinator';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <PageWrapper>
      <div className="space-y-6 max-w-screen-2xl mx-auto">

        {/* ================================================================
            HEADER BANNER
        ================================================================ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-indigo-700 dark:from-indigo-700 dark:via-indigo-800 dark:to-slate-800 p-6 lg:p-8 shadow-lg">
          {/* decorative circles */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-16 -left-8 h-64 w-64 rounded-full bg-white/5" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-indigo-200 mb-1">
                {greeting},
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
                {firstName} 👋
              </h1>
              <p className="mt-1.5 text-sm text-indigo-200 max-w-md">
                Here's what's happening across your capstone cohort today.
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <p className="text-xs text-indigo-300">
                Last updated: {formatDate(lastRefreshed, 'relative')}
              </p>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 text-success shadow-md animate-fade-in">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        {/* ================================================================
            STAT CARDS (4 cards)
        ================================================================ */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted dark:text-text-muted mb-3 px-0.5">
            Overview
          </h2>

          {overviewError && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {overviewError}
                </p>
                <button
                  onClick={fetchOverview}
                  className="mt-1 text-xs text-red-600 dark:text-red-400 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {overviewLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} lines={2} />
              ))
            ) : (
              <>
                <StatCard
                  label="Total Students"
                  value={totalStudents.toLocaleString()}
                  icon={Users}
                  color="primary"
                  trend={overview?.studentsTrend ?? undefined}
                />
                <StatCard
                  label="Active Teams"
                  value={activeTeams.toLocaleString()}
                  icon={UsersRound}
                  color="success"
                  trend={overview?.teamsTrend ?? undefined}
                />
                <StatCard
                  label="Active Projects"
                  value={activeProjects.toLocaleString()}
                  icon={FolderKanban}
                  color="info"
                  trend={overview?.projectsTrend ?? undefined}
                />
                <StatCard
                  label="Pending Evaluations"
                  value={pendingEvaluations.toLocaleString()}
                  icon={ClipboardCheck}
                  color={pendingEvaluations > 0 ? 'warning' : 'success'}
                  trend={overview?.evaluationsTrend ?? undefined}
                />
              </>
            )}
          </div>
        </section>

        {/* ================================================================
            PENDING PROJECT PROPOSALS (Only shown when there are pending items)
        ================================================================ */}
        {!projectsLoading && pendingProposals.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted dark:text-text-muted px-0.5">
              Pending Project Proposals ({pendingProposals.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingProposals.map((project) => (
                <div
                  key={project._id}
                  className="rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-text-primary dark:text-text-inverted line-clamp-1">
                        {project.title}
                      </h3>
                      <Badge variant="warning">Pending Review</Badge>
                    </div>
                    <p className="text-xs text-text-muted dark:text-text-muted line-clamp-3">
                      {project.description}
                    </p>
                    {project.requiredSkills && project.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {project.requiredSkills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="gray" className="text-[10px] px-1.5 py-0">
                            {skill}
                          </Badge>
                        ))}
                        {project.requiredSkills.length > 3 && (
                          <span className="text-[10px] text-text-muted mt-0.5">
                            +{project.requiredSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    {project.createdBy && (
                      <p className="text-[10px] text-text-muted italic pt-1">
                        Proposed by: {project.createdBy.fullName || 'Student'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-surface-border/50 dark:border-dark-border/50">
                    <button
                      onClick={() => handleDenyProposal(project)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <X size={12} />
                      Deny
                    </button>
                    <button
                      onClick={() => handleAcceptProposal(project)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition-colors"
                    >
                      <Check size={12} />
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================
            CHARTS ROW
        ================================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Bar chart – task completion by team (spans 3 cols) */}
          <div className="lg:col-span-3 rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30">
                  <BarChart3 size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted">
                    Task Completion by Team
                  </h3>
                  <p className="text-xs text-text-muted dark:text-text-muted">
                    Completed vs. total tasks per team
                  </p>
                </div>
              </div>
              {!taskLoading && taskCompletion.length > 0 && (
                <Badge variant="success">
                  {taskCompletion.length} team
                  {taskCompletion.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {taskLoading ? (
              <div className="h-64 animate-pulse rounded-lg bg-surface-border dark:bg-dark-elevated" />
            ) : taskCompletion.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No team data yet"
                description="Task completion data will appear once teams start working on their tasks."
                className="py-10"
              />
            ) : (
              <BarChartWrapper
                data={taskCompletion}
                xKey={
                  taskCompletion[0]?.teamName != null
                    ? 'teamName'
                    : taskCompletion[0]?.team != null
                    ? 'team'
                    : 'name'
                }
                bars={[
                  { key: 'completed', name: 'Completed', color: '#22C55E' },
                  { key: 'total', name: 'Total', color: '#6366F1' },
                ]}
                height={280}
              />
            )}
          </div>

          {/* Donut chart – skill distribution (spans 2 cols) */}
          <div className="lg:col-span-2 rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                <PieChart size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted">
                  Skill Distribution
                </h3>
                <p className="text-xs text-text-muted dark:text-text-muted">
                  Student skill spread
                </p>
              </div>
            </div>

            {skillLoading ? (
              <div className="h-64 animate-pulse rounded-lg bg-surface-border dark:bg-dark-elevated" />
            ) : skillDist.length === 0 ? (
              <EmptyState
                icon={PieChart}
                title="No skill data"
                description="Skill distribution will appear once students add their skills."
                className="py-10"
              />
            ) : (
              <DonutChartWrapper
                data={skillDist}
                innerLabel={
                  skillDist.length > 0
                    ? {
                        value: skillDist.reduce((s, d) => s + d.value, 0),
                        label: 'total skills',
                      }
                    : undefined
                }
                height={240}
              />
            )}
          </div>
        </section>

        {/* ================================================================
            QUICK LINKS + RECENT ACTIVITY ROW
        ================================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Quick links (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-amber-500" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted dark:text-text-muted">
                Quick Actions
              </h2>
            </div>

            {QUICK_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                className={[
                  'w-full flex items-center gap-3 rounded-xl border p-4',
                  'bg-surface-card dark:bg-dark-card',
                  link.border,
                  'hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 text-left group',
                ].join(' ')}
              >
                <div className={['p-2 rounded-lg', link.color].join(' ')}>
                  <link.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary dark:text-text-inverted truncate">
                    {link.label}
                  </p>
                  <p className="text-xs text-text-muted dark:text-text-muted truncate">
                    {link.description}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-150"
                />
              </button>
            ))}
          </div>

          {/* Recent activity feed (3 cols) */}
          <div className="lg:col-span-3 space-y-4">

            {/* Recent teams */}
            <div className="rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-indigo-500" />
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted">
                    Recent Teams
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/coordinator/teams')}
                  className="text-xs text-primary dark:text-dark-primaryAccent hover:underline font-medium"
                >
                  View all →
                </button>
              </div>

              {teamsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-lg bg-surface-border dark:bg-dark-elevated"
                    />
                  ))}
                </div>
              ) : recentTeams.length === 0 ? (
                <EmptyState
                  icon={UsersRound}
                  title="No teams yet"
                  description="Teams will appear here once formation is run."
                  className="py-6"
                />
              ) : (
                <ul className="divide-y divide-surface-border dark:divide-dark-border">
                  {recentTeams.map((team, idx) => {
                    const name = team.name ?? `Team ${idx + 1}`;
                    const members =
                      team.members?.length ?? team.memberCount ?? 0;
                    const created =
                      team.createdAt ?? team.updatedAt ?? null;
                    return (
                      <li
                        key={team._id ?? team.id ?? idx}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <UsersRound
                            size={14}
                            className="text-indigo-600 dark:text-indigo-400"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary dark:text-text-inverted truncate">
                            {name}
                          </p>
                          <p className="text-xs text-text-muted dark:text-text-muted">
                            {members} member{members !== 1 ? 's' : ''}
                            {created
                              ? ` · ${formatDate(created, 'relative')}`
                              : ''}
                          </p>
                        </div>
                        <Badge variant="primary">Active</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Recent projects */}
            <div className="rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderKanban size={15} className="text-emerald-500" />
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted">
                    Recent Projects
                  </h3>
                </div>
              </div>

              {projectsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-lg bg-surface-border dark:bg-dark-elevated"
                    />
                  ))}
                </div>
              ) : activeProjectsList.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  description="Projects will show here once they are created."
                  className="py-6"
                />
              ) : (
                <ul className="divide-y divide-surface-border dark:divide-dark-border">
                  {activeProjectsList.map((project, idx) => {
                    const name =
                      project.title ?? project.name ?? `Project ${idx + 1}`;
                    const status = project.status ?? 'active';
                    const created =
                      project.createdAt ?? project.updatedAt ?? null;
                    const assigned =
                      project.assignedTeam ?? project.team ?? null;
                    return (
                      <li
                        key={project._id ?? project.id ?? idx}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <FolderKanban
                            size={14}
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary dark:text-text-inverted truncate">
                            {name}
                          </p>
                          <p className="text-xs text-text-muted dark:text-text-muted">
                            {assigned ? 'Assigned' : 'Unassigned'}
                            {created
                              ? ` · ${formatDate(created, 'relative')}`
                              : ''}
                          </p>
                        </div>
                        <Badge variant={projectStatusVariant(status)}>
                          {status.replace('_', ' ')}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================
            OVERALL COMPLETION BANNER (shown only when data available)
        ================================================================ */}
        {!overviewLoading && overallCompletion !== null && (
          <section className="rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2
                    size={20}
                    className="text-green-600 dark:text-green-400"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary dark:text-text-inverted">
                    Cohort Overall Completion
                  </p>
                  <p className="text-xs text-text-muted dark:text-text-muted">
                    Across all active teams and projects
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-right">
                  <p className="text-2xl font-bold text-text-primary dark:text-text-inverted">
                    {typeof overallCompletion === 'number'
                      ? `${Math.round(overallCompletion)}%`
                      : overallCompletion}
                  </p>
                </div>
                <div className="hidden sm:block w-48">
                  <div className="h-2.5 w-full rounded-full bg-surface-border dark:bg-dark-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            typeof overallCompletion === 'number'
                              ? overallCompletion
                              : 0
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-text-muted dark:text-text-muted mt-1 text-right">
                    {Math.round(overallCompletion)}% complete
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================
            FOOTER TIMESTAMP
        ================================================================ */}
        <p className="text-center text-xs text-text-muted dark:text-text-muted pb-2">
          <Calendar size={11} className="inline mr-1 mb-0.5" />
          Dashboard loaded on {formatDate(lastRefreshed, 'long')}
        </p>

      </div>
    </PageWrapper>
  );
}
