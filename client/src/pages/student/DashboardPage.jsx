import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Flag,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Target,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { PageWrapper } from '../../components/layout';
import {
  StatCard,
  Badge,
  Avatar,
  Card,
  ProgressBar,
  EmptyState,
  SkeletonCard,
  Button,
} from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/helpers';
import * as teamsApi from '../../api/teams';
import * as tasksApi from '../../api/tasks';
import * as milestonesApi from '../../api/milestones';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch teams to find the student's team
      const teamsRes = await teamsApi.getTeams();
      const allTeams = teamsRes.data?.data ?? teamsRes.data?.teams ?? teamsRes.data ?? [];
      
      const teamId = user.team?._id ?? user.team;
      const myTeam = teamId
        ? allTeams.find((t) => t._id === teamId)
        : allTeams.find((t) =>
            t.members?.some((m) => {
              const mId = m.user?._id ?? m.user ?? m.userId?._id ?? m.userId ?? m._id ?? null;
              return mId === user._id;
            })
          );

      setTeam(myTeam || null);

      // 2. Fetch student's assigned tasks
      const tasksRes = await tasksApi.getTasks({ assignee: user._id });
      const myTasks = tasksRes.data?.data ?? tasksRes.data?.tasks ?? tasksRes.data ?? [];
      setTasks(Array.isArray(myTasks) ? myTasks : []);

      // 3. Fetch milestones (timeline for team if assigned, else general list)
      if (myTeam) {
        const milestonesRes = await milestonesApi.getTimeline(myTeam._id);
        const myMilestones = milestonesRes.data?.data ?? milestonesRes.data?.milestones ?? milestonesRes.data ?? [];
        setMilestones(Array.isArray(myMilestones) ? myMilestones : []);
      } else {
        const milestonesRes = await milestonesApi.getMilestones();
        const genMilestones = milestonesRes.data?.data ?? milestonesRes.data?.milestones ?? milestonesRes.data ?? [];
        setMilestones(Array.isArray(genMilestones) ? genMilestones : []);
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to fetch student dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Values
  const pendingTasks = useMemo(() => tasks.filter((t) => t.status !== 'Done'), [tasks]);
  const completedTasksCount = useMemo(() => tasks.filter((t) => t.status === 'Done').length, [tasks]);
  const teamMembersCount = team?.members?.length || 0;

  // Next Milestone Days
  const nextMilestoneDays = useMemo(() => {
    const pendingMilestones = milestones.filter((m) => m.status === 'pending' || !m.status);
    if (pendingMilestones.length === 0) return null;
    
    // Find closest due date
    const sorted = [...pendingMilestones].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const next = sorted[0];
    if (!next.dueDate) return null;

    const diff = new Date(next.dueDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [milestones]);

  const priorityBadgeVariant = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'critical') return 'danger';
    if (p === 'high') return 'warning';
    if (p === 'low') return 'gray';
    return 'primary';
  };

  // Welcome banner greeting
  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-indigo-600 dark:from-indigo-600 dark:via-blue-800 dark:to-slate-800 p-6 lg:p-8 shadow-lg">
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-100 mb-1">{greeting},</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
                {user?.fullName ?? 'Student'} 👋
              </h1>
              {team ? (
                <p className="mt-1 text-sm text-blue-100 font-medium">
                  Team: <span className="underline">{team.name}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-blue-100 italic">No team assigned yet</p>
              )}
            </div>
            {team && (
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/10 text-white hover:bg-white/20 border-white/10"
                onClick={() => navigate('/student/team')}
              >
                View Team Space
                <ArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={1} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="My Tasks" value={pendingTasks.length} icon={ClipboardList} color="primary" />
            <StatCard label="Completed Tasks" value={completedTasksCount} icon={CheckSquare} color="success" />
            <StatCard label="Team Members" value={teamMembersCount} icon={Users} color="info" />
            <StatCard
              label="Days to Next Milestone"
              value={nextMilestoneDays !== null ? nextMilestoneDays : '—'}
              icon={Calendar}
              color={nextMilestoneDays !== null && nextMilestoneDays <= 3 ? 'danger' : 'warning'}
            />
          </div>
        )}

        {/* Main Panels */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonCard lines={6} className="lg:col-span-2" />
            <SkeletonCard lines={6} />
          </div>
        ) : !team ? (
          <Card className="p-8">
            <EmptyState
              icon={Users}
              title="Waiting for Team Assignment"
              description="The course coordinator has not assigned you to a project team yet. Once team formation is complete, your team space and milestone timelines will become available here."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Pending Tasks */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                  My Active Tasks
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/student/tasks')}>
                  Task Board
                  <ArrowRight size={13} />
                </Button>
              </div>

              <Card padding={false} className="overflow-hidden">
                {pendingTasks.length === 0 ? (
                  <EmptyState
                    icon={CheckSquare}
                    title="All Caught Up!"
                    description="No pending tasks assigned to you. Enjoy the free time or coordinate with your project manager!"
                    className="py-12"
                  />
                ) : (
                  <div className="divide-y divide-surface-border dark:divide-dark-border">
                    {pendingTasks.slice(0, 5).map((task) => (
                      <div
                        key={task._id}
                        onClick={() => navigate('/student/tasks')}
                        className="p-4 flex items-center justify-between hover:bg-surface-bg dark:hover:bg-dark-elevated/20 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <h4 className="text-sm font-semibold text-text-primary dark:text-text-inverted truncate">
                            {task.title}
                          </h4>
                          <p className="text-xs text-text-muted mt-0.5">
                            Status: <span className="font-medium text-text-secondary dark:text-text-muted">{task.status}</span>
                            {task.dueDate && ` · Due ${formatDate(task.dueDate, 'short')}`}
                          </p>
                        </div>
                        <Badge variant={priorityBadgeVariant(task.priority)}>
                          {task.priority || 'Medium'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Upcoming Milestones & Team Info Side Panel */}
            <div className="space-y-6">
              {/* Upcoming Milestones */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Milestones
                </h2>
                <Card className="p-4">
                  {milestones.length === 0 ? (
                    <p className="text-xs text-text-muted italic text-center py-4">
                      No milestones set for this team yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {milestones.slice(0, 3).map((ms, index) => {
                        const isApproved = ms.status === 'approved';
                        const isSubmitted = ms.status === 'submitted';
                        return (
                          <div key={ms._id ?? index} className="flex gap-3 items-start">
                            <div
                              className={cn(
                                'h-2 w-2 rounded-full mt-1.5 shrink-0',
                                isApproved
                                  ? 'bg-success'
                                  : isSubmitted
                                  ? 'bg-blue-500'
                                  : 'bg-neutral'
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-text-primary dark:text-text-inverted truncate">
                                {ms.title}
                              </p>
                              <p className="text-[10px] text-text-muted mt-0.5">
                                Due: {formatDate(ms.dueDate, 'short')}
                              </p>
                            </div>
                            <Badge
                              variant={
                                isApproved ? 'success' : isSubmitted ? 'info' : 'gray'
                              }
                              className="text-[9px] uppercase font-semibold shrink-0"
                            >
                              {ms.status || 'Pending'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* Team Members List */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                  My Team
                </h2>
                <Card className="p-4 space-y-3">
                  {(team.members || []).map((m) => {
                    const memberInfo = m.userId ?? m;
                    const isSelf = memberInfo._id === user._id;
                    return (
                      <div key={m._id} className="flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={memberInfo.name} size="sm" />
                          <p className="text-xs font-semibold text-text-primary dark:text-text-inverted truncate">
                            {memberInfo.name} {isSelf && <span className="text-[10px] text-primary">(You)</span>}
                          </p>
                        </div>
                        <Badge variant="gray" className="text-[9px] tracking-wide shrink-0">
                          {m.role || 'Member'}
                        </Badge>
                      </div>
                    );
                  })}
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
