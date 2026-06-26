import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  FolderKanban,
  Search,
  Filter,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Zap,
  Info,
  Users,
  Plus,
  Edit,
  Archive,
} from 'lucide-react';
import * as projectsApi from '../../api/projects';
import { PageWrapper } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Table,
  Input,
  Select,
  Textarea,
  StatCard,
} from '../../components/common';
import { cn } from '../../utils/helpers';

// Yup Schema aligned with Project Mongoose Model
const projectSchema = yup.object().shape({
  title: yup.string().required('Title is required').min(3, 'Title must be at least 3 characters'),
  description: yup.string().required('Description is required'),
  difficultyLevel: yup.string().oneOf(['Easy', 'Medium', 'Hard']).required('Difficulty level is required'),
  requiredSkills: yup.string().required('Required skills are required'),
  maxTeamsAllowed: yup.number().typeError('Must be a number').integer().min(1).max(10).default(1),
  tags: yup.string(),
});

// Difficulty Badge Helper
const getDifficultyBadge = (difficulty) => {
  const diff = (difficulty || 'medium').toLowerCase();
  if (diff === 'easy') return <Badge variant="success">Easy</Badge>;
  if (diff === 'hard') return <Badge variant="danger">Hard</Badge>;
  return <Badge variant="warning">Medium</Badge>;
};

// Status Badge Helper
const getStatusBadge = (status) => {
  const s = (status || 'available').toLowerCase();
  if (s === 'allocated') return <Badge variant="success">Allocated</Badge>;
  if (s === 'archived') return <Badge variant="gray">Archived</Badge>;
  return <Badge variant="info">Available</Badge>;
};

export default function StudentProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Project Modal (Detail View)
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Create / Edit Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // react-hook-form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(projectSchema),
    defaultValues: {
      title: '',
      description: '',
      difficultyLevel: 'Medium',
      requiredSkills: '',
      maxTeamsAllowed: 1,
      tags: '',
    },
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectsApi.getProjects();
      const data = res.data?.data ?? res.data?.projects ?? res.data ?? [];
      // Exclude archived projects for students unless they created them
      const activeProjects = (Array.isArray(data) ? data : []).filter(
        (p) =>
          p.status !== 'Archived' ||
          p.createdBy?._id === user?._id ||
          p.createdBy === user?._id
      );
      setProjects(activeProjects);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError(err?.response?.data?.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Statistics calculations
  const totalProjects = projects.length;
  const allocatedProjects = projects.filter((p) => p.status === 'allocated' || p.status === 'In Progress').length;
  const availableProjects = projects.filter((p) => p.status !== 'allocated' && p.status !== 'In Progress' && p.status !== 'Archived').length;

  // Filtered projects list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.tags?.some((t) => t.toLowerCase().includes(query)) ||
        p.requiredSkills?.some((s) => s.toLowerCase().includes(query));

      const matchesDifficulty =
        !difficultyFilter ||
        (p.difficultyLevel || p.difficulty)?.toLowerCase() === difficultyFilter.toLowerCase();

      const matchesStatus =
        !statusFilter ||
        p.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesDifficulty && matchesStatus;
    });
  }, [projects, searchQuery, difficultyFilter, statusFilter]);

  const handleRowClick = (project) => {
    setSelectedProject(project);
    setDetailModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    if (user?.role === 'student' && !user?.team) {
      alert('You must belong to an approved team before you can propose a project.');
      return;
    }
    setEditingProject(null);
    reset({
      title: '',
      description: '',
      difficultyLevel: 'Medium',
      requiredSkills: '',
      maxTeamsAllowed: 1,
      tags: '',
    });
    setCreateModalOpen(true);
  };

  const handleOpenEditModal = (project) => {
    setEditingProject(project);
    reset({
      title: project.title,
      description: project.description,
      difficultyLevel: project.difficultyLevel || 'Medium',
      requiredSkills: Array.isArray(project.requiredSkills)
        ? project.requiredSkills.join(', ')
        : project.requiredSkills || '',
      maxTeamsAllowed: project.maxTeamsAllowed || 1,
      tags: Array.isArray(project.tags) ? project.tags.join(', ') : project.tags || '',
    });
    setCreateModalOpen(true);
  };

  const handleArchiveProject = async (id) => {
    if (!window.confirm('Are you sure you want to archive this project proposal?')) return;
    try {
      await projectsApi.archiveProject(id);
      fetchProjects();
    } catch (err) {
      console.error('Failed to archive project:', err);
      alert(err?.response?.data?.message || 'Failed to archive project.');
    }
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        requiredSkills: values.requiredSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        tags: values.tags
          ? values.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      };

      if (editingProject) {
        await projectsApi.updateProject(editingProject._id, payload);
      } else {
        await projectsApi.createProject(payload);
      }

      setCreateModalOpen(false);
      reset();
      fetchProjects();
    } catch (err) {
      console.error('Failed to save project:', err);
      alert(err?.response?.data?.message || 'Failed to save project.');
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDifficultyFilter('');
    setStatusFilter('');
  };

  const columns = useMemo(
    () => [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        render: (val, row) => (
          <div className="min-w-[180px]">
            <p className="font-semibold text-text-primary dark:text-text-inverted truncate max-w-[240px]">
              {val}
            </p>
            <p className="text-xs text-text-muted truncate max-w-[240px] mt-0.5">
              {row.description}
            </p>
          </div>
        ),
      },
      {
        key: 'difficultyLevel',
        label: 'Difficulty',
        sortable: true,
        render: (val) => getDifficultyBadge(val),
      },
      {
        key: 'requiredSkills',
        label: 'Required Skills',
        sortable: false,
        render: (val) => {
          const skills = Array.isArray(val) ? val : [];
          return (
            <div className="flex flex-wrap gap-1 max-w-[220px]">
              {skills.map((skill, idx) => (
                <Badge key={idx} variant="gray" className="text-[10px] px-1.5 py-0">
                  {skill}
                </Badge>
              ))}
              {skills.length === 0 && <span className="text-xs italic text-text-muted">None</span>}
            </div>
          );
        },
      },
      {
        key: 'assignedTeam',
        label: 'Assigned Team',
        sortable: true,
        render: (val) => {
          const teamName = val?.name ?? val ?? 'Unassigned';
          const isAssigned = !!val;
          return (
            <span
              className={cn(
                'text-xs font-semibold',
                isAssigned ? 'text-text-primary dark:text-text-inverted' : 'text-text-muted italic'
              )}
            >
              {teamName}
            </span>
          );
        },
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (val) => getStatusBadge(val),
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_, row) => {
          const isCreator =
            row.createdBy?._id === user?._id ||
            row.createdBy === user?._id ||
            user?.role === 'coordinator';
          const isArchived = row.status === 'Archived';

          if (!isCreator) return <span className="text-xs text-text-muted italic">Read-only</span>;

          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal(row);
                }}
                title="Edit Project"
                className="p-1 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-bg dark:hover:bg-dark-elevated transition-colors"
              >
                <Edit size={14} />
              </button>
              {!isArchived && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchiveProject(row._id);
                  }}
                  title="Archive Project"
                  className="p-1 rounded-lg text-text-secondary hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Archive size={14} />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [user?._id, user?.role]
  );

  const hasActiveFilters = !!(searchQuery || difficultyFilter || statusFilter);

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverted">
              Project Listings
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary dark:text-text-muted">
              Browse all capstone projects, propose new suggestions, or manage your entries.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchProjects} disabled={loading}>
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
              Reload
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              disabled={user?.role === 'student' && !user?.team}
              title={user?.role === 'student' && !user?.team ? 'Approved team proposal required' : 'Propose a project'}
            >
              <Plus size={14} />
              Propose Project
            </Button>
          </div>
        </div>

        {/* Banner for students without approved team */}
        {user?.role === 'student' && !user?.team && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-xl flex items-start gap-3 shadow-sm mb-4">
            <Info className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Project Proposal Restricted</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
                You can propose a project to the coordinator only after your team proposal has been accepted.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Active Projects" value={totalProjects} icon={FolderKanban} color="primary" />
            <StatCard label="Allocated" value={allocatedProjects} icon={CheckCircle} color="success" />
            <StatCard label="Available" value={availableProjects} icon={Zap} color="info" />
          </div>
        )}

        {/* Filter / Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-surface-card dark:bg-dark-card p-4 rounded-xl border border-surface-border dark:border-dark-border shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, skills or tags…"
              className={cn(
                'w-full pl-9 pr-8 py-2 text-sm rounded-lg border outline-none transition-colors',
                'bg-surface-input border-surface-border text-text-primary placeholder:text-text-muted',
                'dark:bg-dark-input dark:border-dark-border dark:text-text-inverted',
                'focus:border-primary dark:focus:border-dark-primaryAccent',
                'focus:ring-2 focus:ring-primary/20 dark:focus:ring-dark-primaryAccent/20'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary dark:hover:text-text-inverted transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
              <Filter size={14} />
              <span>Filters:</span>
            </div>

            {/* Difficulty Filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className={cn(
                'pl-2 pr-7 py-2 text-xs rounded-lg border outline-none cursor-pointer',
                'bg-surface-input border-surface-border text-text-primary',
                'dark:bg-dark-input dark:border-dark-border dark:text-text-inverted',
                'focus:border-primary dark:focus:border-dark-primaryAccent'
              )}
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cn(
                'pl-2 pr-7 py-2 text-xs rounded-lg border outline-none cursor-pointer',
                'bg-surface-input border-surface-border text-text-primary',
                'dark:bg-dark-input dark:border-dark-border dark:text-text-inverted',
                'focus:border-primary dark:focus:border-dark-primaryAccent'
              )}
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="allocated">Allocated</option>
            </select>

            {/* Clear Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-danger font-medium transition-colors ml-1"
                title="Clear all filters"
              >
                <X size={13} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <Card padding={false} className="overflow-hidden border border-surface-border dark:border-dark-border shadow-sm">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-text-muted">Loading projects...</p>
            </div>
          ) : error ? (
            <div className="p-6">
              <EmptyState
                icon={AlertTriangle}
                title="Error Loading Projects"
                description={error}
                action={
                  <Button variant="primary" size="sm" onClick={fetchProjects}>
                    Try Again
                  </Button>
                }
              />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FolderKanban}
                title={hasActiveFilters ? 'No Matching Projects' : 'No Projects Found'}
                description={
                  hasActiveFilters
                    ? 'Try adjusting your filters or search keywords.'
                    : 'Projects will show here once they are listed in the system.'
                }
                action={
                  hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X size={14} className="mr-1" />
                      Clear Filters
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <Table
              columns={columns}
              data={filteredProjects}
              loading={false}
              onRowClick={handleRowClick}
              emptyMessage="No projects available."
            />
          )}
        </Card>

        {/* Create / Edit Project Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title={editingProject ? 'Edit Project Proposal' : 'Propose Project'}
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Project Title"
              placeholder="e.g. Mobile Banking App"
              {...register('title')}
              error={errors.title?.message}
              required
            />

            <Textarea
              label="Description"
              placeholder="Enter a detailed description of the project..."
              {...register('description')}
              error={errors.description?.message}
              required
              rows={4}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Difficulty"
                {...register('difficultyLevel')}
                error={errors.difficultyLevel?.message}
                required
                options={[
                  { value: 'Easy', label: 'Easy' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Hard', label: 'Hard' },
                ]}
              />
              <Input
                label="Max Teams Allowed"
                type="number"
                {...register('maxTeamsAllowed')}
                error={errors.maxTeamsAllowed?.message}
              />
            </div>

            <Input
              label="Required Skills (comma-separated)"
              placeholder="e.g. React, Node.js, MongoDB"
              {...register('requiredSkills')}
              error={errors.requiredSkills?.message}
              required
            />

            <Input
              label="Tags (comma-separated)"
              placeholder="e.g. fintech, web, design"
              {...register('tags')}
              error={errors.tags?.message}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border dark:border-dark-border">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={submitting}>
                {editingProject ? 'Save Changes' : 'Submit Proposal'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Project Detail Modal */}
        {selectedProject && (
          <Modal
            isOpen={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedProject(null);
            }}
            title="Project Details"
            size="lg"
            footer={
              <div className="flex justify-end gap-3 w-full">
                {selectedProject.createdBy &&
                  (selectedProject.createdBy?._id === user?._id ||
                    selectedProject.createdBy === user?._id ||
                    user?.role === 'coordinator') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleOpenEditModal(selectedProject);
                      }}
                    >
                      Edit Proposal
                    </Button>
                  )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDetailModalOpen(false);
                    setSelectedProject(null);
                  }}
                >
                  Close
                </Button>
              </div>
            }
          >
            <div className="space-y-6">
              {/* Header section inside modal */}
              <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-surface-border dark:border-dark-border">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-text-primary dark:text-text-inverted">
                    {selectedProject.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getDifficultyBadge(selectedProject.difficultyLevel || selectedProject.difficulty)}
                    {getStatusBadge(selectedProject.status)}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                  Project Description
                </h4>
                <div className="p-4 rounded-xl bg-surface-bg dark:bg-dark-elevated/40 border border-surface-border dark:border-dark-border text-sm text-text-secondary dark:text-text-muted leading-relaxed whitespace-pre-wrap">
                  {selectedProject.description || 'No detailed description available.'}
                </div>
              </div>

              {/* Metadata row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-surface-border dark:border-dark-border bg-surface-input dark:bg-dark-elevated/20">
                  <Users size={16} className="text-primary dark:text-dark-primaryAccent" />
                  <div>
                    <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                      Assigned Team
                    </p>
                    <p className="text-sm font-semibold text-text-primary dark:text-text-inverted mt-0.5">
                      {selectedProject.assignedTeam?.name ?? selectedProject.assignedTeam ?? 'Unassigned'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-surface-border dark:border-dark-border bg-surface-input dark:bg-dark-elevated/20">
                  <Info size={16} className="text-primary dark:text-dark-primaryAccent" />
                  <div>
                    <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                      Max Teams Allowed
                    </p>
                    <p className="text-sm font-semibold text-text-primary dark:text-text-inverted mt-0.5">
                      {selectedProject.maxTeamsAllowed || 1}
                    </p>
                  </div>
                </div>
              </div>

              {/* Created By Info */}
              {selectedProject.createdBy && (
                <div className="text-xs text-text-muted italic border-t border-surface-border dark:border-dark-border pt-4">
                  Proposed by:{' '}
                  <span className="font-semibold text-text-secondary dark:text-text-muted">
                    {selectedProject.createdBy.fullName || 'Student'}
                  </span>
                </div>
              )}

              {/* Required Skills */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                  Required Technical Skills
                </h4>
                {selectedProject.requiredSkills?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.requiredSkills.map((skill, idx) => (
                      <Badge key={idx} variant="primary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">No specific technical skills required.</p>
                )}
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                  Categories & Tags
                </h4>
                {selectedProject.tags?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.tags.map((tag, idx) => (
                      <Badge key={idx} variant="gray">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">No tags associated with this project.</p>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PageWrapper>
  );
}
