import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Flag,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  Calendar,
  Award,
  RefreshCw,
} from 'lucide-react';
import * as milestonesApi from '../../api/milestones';
import * as teamsApi from '../../api/teams';
import { PageWrapper } from '../../components/layout';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  ProgressBar,
  SkeletonCard,
  FileUpload,
} from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { cn, formatDate } from '../../utils/helpers';

export default function MilestonesPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Submit deliverable modal state
  const [activeMilestone, setActiveMilestone] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const resolveTeamAndTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const teamsRes = await teamsApi.getTeams();
      const allTeams = teamsRes.data?.data ?? teamsRes.data?.teams ?? teamsRes.data ?? [];
      const teamId = user.team?._id ?? user.team;
      const myTeam = teamId
        ? allTeams.find((t) => t._id === teamId)
        : allTeams.find((t) =>
            t.members?.some((m) => (m.user?._id ?? m.user ?? m.userId?._id ?? m.userId ?? m._id) === user?._id)
          );

      if (!myTeam) {
        setTeam(null);
        setLoading(false);
        return;
      }
      setTeam(myTeam);

      const timelineRes = await milestonesApi.getTimeline(myTeam._id);
      const data = timelineRes.data?.data ?? timelineRes.data ?? [];
      setMilestones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load timeline:', err);
      setError(err?.response?.data?.message || 'Failed to fetch milestone timeline.');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    resolveTeamAndTimeline();
  }, [resolveTeamAndTimeline]);

  // Open upload modal
  const handleOpenSubmit = (milestone) => {
    setActiveMilestone(milestone);
    setSelectedFiles([]);
    setUploadModalOpen(true);
  };

  // Submit Deliverable
  const handleSubmitDeliverable = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !activeMilestone) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      // Field name configured in backend multer: 'deliverable'
      formData.append('deliverable', selectedFiles[0]);

      await milestonesApi.submitDeliverable(activeMilestone._id, formData);
      setUploadModalOpen(false);
      resolveTeamAndTimeline();
    } catch (err) {
      console.error('Failed to submit deliverable:', err);
      alert(err?.response?.data?.message || 'Failed to submit deliverable.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusInfo = (ms) => {
    const isPast = ms.dueDate && new Date(ms.dueDate) < new Date();
    const status = ms.status ?? 'pending';

    if (status === 'approved') {
      return {
        label: 'Approved',
        variant: 'success',
        colorClass: 'bg-green-500 text-white border-green-500',
        badge: 'success',
      };
    }
    if (status === 'submitted' || status === 'Completed') {
      return {
        label: 'Submitted',
        variant: 'info',
        colorClass: 'bg-blue-500 text-white border-blue-500',
        badge: 'info',
      };
    }
    if (isPast) {
      return {
        label: 'Overdue',
        variant: 'danger',
        colorClass: 'bg-red-500 text-white border-red-500 animate-pulse',
        badge: 'danger',
      };
    }
    return {
      label: 'Pending',
      variant: 'gray',
      colorClass: 'bg-gray-100 text-text-muted border-gray-300 dark:bg-slate-800 dark:border-slate-700',
      badge: 'gray',
    };
  };

  // Derived Completion Metrics
  const metrics = useMemo(() => {
    const total = milestones.length;
    const completed = milestones.filter(
      (m) => m.status === 'approved' || m.status === 'submitted' || m.status === 'Completed'
    ).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [milestones]);

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverted">
              Milestones & Deliverables
            </h1>
            {team ? (
              <p className="mt-0.5 text-sm text-text-secondary dark:text-text-muted">
                Track deadlines, submit deliverables, and monitor project checkpoints.
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-text-muted">
                Timeline is currently unassigned.
              </p>
            )}
          </div>
          {team && (
            <Button variant="ghost" size="sm" onClick={resolveTeamAndTimeline} disabled={loading}>
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
              Refresh
            </Button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-6">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={4} />
          </div>
        ) : error ? (
          <Card className="p-6">
            <EmptyState
              icon={AlertTriangle}
              title="Error Loading Milestones"
              description={error}
              action={
                <Button variant="primary" size="sm" onClick={resolveTeamAndTimeline}>
                  Retry
                </Button>
              }
            />
          </Card>
        ) : !team ? (
          <Card className="p-8">
            <EmptyState
              icon={Flag}
              title="No Team Assigned"
              description="Your milestone timeline will be configured once you are assigned to a project team."
            />
          </Card>
        ) : milestones.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={Flag}
              title="No Milestones Configured"
              description="There are currently no milestones set up for your team. Check back later or contact the coordinator."
            />
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Summary Progress strip */}
            <Card className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-text-primary dark:text-text-inverted text-sm">
                    Timeline Progress
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {metrics.completed} of {metrics.total} milestones completed
                  </p>
                </div>
                <span className="text-xl font-bold text-primary dark:text-dark-primaryAccent">
                  {metrics.percent}%
                </span>
              </div>
              <ProgressBar value={metrics.percent} />
            </Card>

            {/* Vertical Timeline */}
            <div className="relative border-l-2 border-surface-border dark:border-dark-border ml-4 sm:ml-6 pl-6 sm:pl-8 py-2 space-y-8">
              {milestones.map((ms, index) => {
                const status = getStatusInfo(ms);
                const hasDeliverable = !!ms.deliverable;
                const isPendingSubmit = ms.status !== 'approved' && ms.status !== 'submitted' && ms.status !== 'Completed';

                return (
                  <div key={ms._id ?? index} className="relative group">
                    {/* Circle Indicator */}
                    <div
                      className={cn(
                        'absolute -left-[35px] sm:-left-[43px] top-1 h-5 w-5 rounded-full border-4 border-surface-bg dark:border-dark-bg flex items-center justify-center transition-colors',
                        status.colorClass
                      )}
                    >
                      {status.label === 'Approved' && (
                        <CheckCircle2 size={10} className="stroke-[3]" />
                      )}
                    </div>

                    {/* Milestone Card */}
                    <div className="rounded-xl border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                            Milestone #{ms.order ?? index + 1}
                          </span>
                          <h3 className="text-base font-bold text-text-primary dark:text-text-inverted mt-0.5">
                            {ms.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-text-muted">
                            <Calendar size={13} />
                            <span>Due: {formatDate(ms.dueDate, 'short')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start">
                          <Badge variant={status.badge}>{status.label}</Badge>
                        </div>
                      </div>

                      <p className="text-sm text-text-secondary dark:text-text-muted leading-relaxed mb-4">
                        {ms.description}
                      </p>

                      {/* Deliverable Details or Upload */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3.5 border-t border-surface-border/40 dark:border-dark-border/40">
                        {hasDeliverable ? (
                          <div className="flex items-center gap-2.5 bg-surface-bg dark:bg-dark-elevated/20 p-2 rounded-lg max-w-full overflow-hidden">
                            <Upload size={14} className="text-text-muted shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Submitted Deliverable</p>
                              <a
                                href={ms.deliverable.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary dark:text-dark-primaryAccent font-medium hover:underline truncate block"
                              >
                                {ms.deliverable.filename}
                              </a>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic">
                            No deliverable submitted
                          </span>
                        )}

                        {isPendingSubmit && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenSubmit(ms)}
                            className="shrink-0"
                          >
                            <Upload size={14} />
                            Submit Deliverable
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upload Deliverable Modal */}
      {activeMilestone && (
        <Modal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          title={`Submit Deliverable: ${activeMilestone.name}`}
          size="md"
        >
          <form onSubmit={handleSubmitDeliverable} className="space-y-4">
            <p className="text-xs text-text-secondary dark:text-text-muted">
              Select or drop the project deliverable file (such as a report PDF, archive ZIP, etc.) to submit for this checkpoint.
            </p>

            <FileUpload
              maxSize={10 * 1024 * 1024} // 10MB limit
              onFilesSelected={setSelectedFiles}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border dark:border-dark-border">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setUploadModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                loading={submitting}
                disabled={selectedFiles.length === 0 || submitting}
              >
                Submit Deliverable
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageWrapper>
  );
}
