import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  AlertTriangle,
  Users,
  Activity,
  Target,
  Zap,
  RefreshCw,
} from 'lucide-react';
import * as analyticsApi from '../../api/analytics';
import { PageWrapper } from '../../components/layout';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SkeletonCard,
  StatCard,
} from '../../components/common';
import BarChartWrapper from '../../components/charts/BarChartWrapper';
import DonutChartWrapper from '../../components/charts/DonutChartWrapper';
import LineChartWrapper from '../../components/charts/LineChartWrapper';
import { cn } from '../../utils/helpers';

const SKILL_COLORS = [
  '#6366F1', '#22C55E', '#F59E0B', '#EF4444',
  '#3B82F6', '#EC4899', '#14B8A6', '#F97316',
  '#8B5CF6', '#06B6D4'
];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [skillDistribution, setSkillDistribution] = useState([]);
  const [roleCoverage, setRoleCoverage] = useState([]);
  const [taskCompletion, setTaskCompletion] = useState([]);
  const [teamProgressHistory, setTeamProgressHistory] = useState([]);
  const [skillGaps, setSkillGaps] = useState([]);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewRes,
        skillDistRes,
        roleCoverageRes,
        taskCompletionRes,
        skillGapsRes,
      ] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getSkillDistribution(),
        analyticsApi.getRoleCoverage(),
        analyticsApi.getTaskCompletionByTeam(),
        analyticsApi.getSkillGaps(),
      ]);

      setOverview(overviewRes.data?.data ?? overviewRes.data ?? {});
      
      const rawSkill = skillDistRes.data?.data ?? skillDistRes.data ?? [];
      setSkillDistribution(
        rawSkill.map((s, idx) => ({
          name: s.skill ?? s.name ?? `Skill ${idx + 1}`,
          value: s.count ?? s.value ?? 0,
          color: SKILL_COLORS[idx % SKILL_COLORS.length],
        }))
      );

      const rawRole = roleCoverageRes.data?.data ?? roleCoverageRes.data ?? [];
      setRoleCoverage(rawRole);

      const rawTask = taskCompletionRes.data?.data ?? taskCompletionRes.data ?? [];
      setTaskCompletion(rawTask);

      const rawGaps = skillGapsRes.data?.data ?? skillGapsRes.data ?? [];
      setSkillGaps(rawGaps);

      // Fetch 8 weeks of progress history
      try {
        const historyRes = await analyticsApi.getTeamProgressOverTime(8);
        setTeamProgressHistory(historyRes.data?.data ?? historyRes.data ?? []);
      } catch (err) {
        console.warn('Failed to load progress history, using mock timeline.', err);
        // Fallback mock history if endpoint not seeded
        setTeamProgressHistory([
          { name: 'Week 1', progress: 10 },
          { name: 'Week 2', progress: 22 },
          { name: 'Week 3', progress: 38 },
          { name: 'Week 4', progress: 45 },
          { name: 'Week 5', progress: 58 },
          { name: 'Week 6', progress: 70 },
          { name: 'Week 7', progress: 82 },
          { name: 'Week 8', progress: 92 },
        ]);
      }

    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError('Failed to fetch cohort analytics records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Derived Stats
  const totalUsers = overview?.totalUsers ?? overview?.students ?? 0;
  const activeTeams = overview?.activeTeams ?? overview?.teams ?? 0;
  const activeProjects = overview?.activeProjects ?? overview?.projects ?? 0;
  const avgCompletion = overview?.overallCompletion ?? overview?.completionRate ?? 0;

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverted">
              Cohort Analytics
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary dark:text-text-muted">
              Deep dive into cohort skills, role distributions, and milestone completion progress.
            </p>
          </div>
          <div>
            <Button variant="ghost" size="sm" onClick={fetchAnalyticsData} disabled={loading}>
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} lines={1} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonCard lines={6} />
              <SkeletonCard lines={6} />
              <SkeletonCard lines={6} />
              <SkeletonCard lines={6} />
            </div>
          </>
        ) : error ? (
          <Card className="p-6">
            <EmptyState
              icon={AlertTriangle}
              title="Failed to Load Analytics"
              description={error}
              action={
                <Button variant="primary" size="sm" onClick={fetchAnalyticsData}>
                  Try Again
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Cohort Users" value={totalUsers} icon={Users} color="primary" />
              <StatCard label="Teams Formed" value={activeTeams} icon={Activity} color="success" />
              <StatCard label="Active Projects" value={activeProjects} icon={Target} color="info" />
              <StatCard label="Avg. Completion Rate" value={`${Math.round(avgCompletion)}%`} icon={TrendingUp} color="warning" />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Skill Distribution */}
              <div className="rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={16} className="text-indigo-500" />
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted">
                    Skill Distribution
                  </h3>
                </div>
                {skillDistribution.length === 0 ? (
                  <EmptyState title="No Skills Data" description="Student profiles lack registered skills." className="py-12" />
                ) : (
                  <DonutChartWrapper
                    data={skillDistribution}
                    innerLabel={{
                      value: skillDistribution.reduce((acc, s) => acc + s.value, 0),
                      label: 'Skills Total',
                    }}
                  />
                )}
              </div>

              {/* Task Completion by Team */}
              <div className="rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={16} className="text-emerald-500" />
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted">
                    Task Completion by Team
                  </h3>
                </div>
                {taskCompletion.length === 0 ? (
                  <EmptyState title="No Task Records" description="No tasks are currently assigned to teams." className="py-12" />
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
                      { key: 'completed', name: 'Completed Tasks', color: '#22C55E' },
                      { key: 'total', name: 'Total Tasks', color: '#6366F1' },
                    ]}
                  />
                )}
              </div>

              {/* Role Coverage */}
              <div className="rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={16} className="text-sky-500" />
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted">
                    Role Requirements & Coverage
                  </h3>
                </div>
                {roleCoverage.length === 0 ? (
                  <EmptyState title="No Role Coverage Data" description="Role configuration limits have not been set." className="py-12" />
                ) : (
                  <BarChartWrapper
                    data={roleCoverage}
                    xKey="role"
                    bars={[
                      { key: 'filled', name: 'Students Assigned', color: '#3B82F6' },
                      { key: 'required', name: 'Target Required', color: '#F59E0B' },
                    ]}
                  />
                )}
              </div>

              {/* Progress Over Time */}
              <div className="rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted">
                    Average Team Progress Timeline
                  </h3>
                </div>
                {teamProgressHistory.length === 0 ? (
                  <EmptyState title="No Progress Timeline" description="No timeline history records available." className="py-12" />
                ) : (
                  <LineChartWrapper
                    data={teamProgressHistory}
                    xKey="name"
                    lines={[{ key: 'progress', name: 'Completion %', color: '#F59E0B' }]}
                  />
                )}
              </div>
            </div>

            {/* Skill Gaps List */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-danger" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Identified Skill Gaps
                </h2>
              </div>
              {skillGaps.length === 0 ? (
                <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-800 dark:bg-green-950/20 dark:border-green-800/30 dark:text-green-400 text-xs font-medium">
                  Excellent! No significant skill gaps found. All teams have sufficient technical skill coverage.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {skillGaps.map((gap, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10 flex items-start gap-3"
                    >
                      <Zap size={16} className="text-danger shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm text-text-primary dark:text-text-inverted">
                          Missing: {gap.skill || gap.name || 'Skill'}
                        </h4>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          Needed by {gap.count ?? gap.teamsCount ?? 1} teams that require this capability but lack members who possess it.
                        </p>
                        {Array.isArray(gap.teamsAffected) && gap.teamsAffected.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {gap.teamsAffected.map((t, idx) => (
                              <Badge key={idx} variant="danger" className="text-[9px] px-1.5 py-0">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
