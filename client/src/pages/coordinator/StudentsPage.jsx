import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Eye,
  Trash2,
  Filter,
  Download,
  UserPlus,
  X,
  Mail,
  Hash,
  BookOpen,
  Calendar,
  Clock,
  Briefcase,
  Star,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Upload,
} from 'lucide-react';
import * as usersApi from '../../api/users';
import * as authApi from '../../api/auth';
import { PageWrapper } from '../../components/layout';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Modal,
  Pagination,
  SkeletonCard,
  StatCard,
  Table,
} from '../../components/common';
import { cn, formatDate } from '../../utils/helpers';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 10;

const YEAR_LABELS = {
  1: '1st Year',
  2: '2nd Year',
  3: '3rd Year',
  4: '4th Year',
  5: '5th Year',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const YEAR_OPTIONS = [
  { value: '', label: 'All Years' },
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];

// ─── Skeleton Rows ─────────────────────────────────────────────────────────────
function TableSkeletonRows({ count = 8 }) {
  return (
    <div className="rounded-xl border overflow-hidden bg-surface-card border-surface-border dark:bg-dark-card dark:border-dark-border animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-border dark:border-dark-border bg-surface-input dark:bg-dark-elevated/50">
        {[120, 160, 100, 110, 80, 80, 80, 90].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded bg-surface-border dark:bg-dark-elevated"
            style={{ width: `${w}px`, flexShrink: 0 }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-surface-border/50 dark:border-dark-border/50 last:border-0"
        >
          {/* Name cell with avatar */}
          <div className="flex items-center gap-3" style={{ width: 120, flexShrink: 0 }}>
            <div className="h-9 w-9 rounded-full bg-surface-border dark:bg-dark-elevated" />
            <div className="h-3 rounded bg-surface-border dark:bg-dark-elevated flex-1" />
          </div>
          {[160, 100, 110, 80, 80, 80, 90].map((w, j) => (
            <div
              key={j}
              className="h-3 rounded bg-surface-border dark:bg-dark-elevated"
              style={{ width: `${w}px`, flexShrink: 0, opacity: 1 - j * 0.08 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Student Detail Modal ──────────────────────────────────────────────────────
function StudentDetailModal({ student, isOpen, onClose, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!student) return null;

  const profile = student.profile || {};
  const skills = profile.skills || [];
  const softSkills = profile.softSkills || [];
  const availability = profile.availability || {};
  const availableDays = availability.days || [];
  const availableHours = availability.hours || '';
  const preferredRole = profile.preferredRole || '';
  const bio = profile.bio || '';
  const faculty = profile.faculty || student.faculty || '';
  const year = profile.year || student.year || '';
  const studentId = student.studentId || profile.studentId || '';

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      setDeleting(true);
      await usersApi.deleteUser(student._id);
      onDelete?.(student._id);
      onClose();
    } catch (err) {
      console.error('Failed to delete student:', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const isActive = student.isActive !== false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirmDelete(false);
        onClose();
      }}
      title="Student Profile"
      size="lg"
      footer={
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              confirmDelete
                ? 'bg-danger text-white hover:bg-red-600'
                : 'text-danger hover:bg-red-50 dark:hover:bg-red-900/20'
            )}
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting…' : confirmDelete ? 'Confirm Delete' : 'Delete Student'}
          </button>
          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-text-muted hover:text-text-primary dark:hover:text-text-inverted transition-colors"
            >
              Cancel
            </button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Header: Avatar + Identity ── */}
        <div className="flex items-start gap-5">
          <Avatar name={student.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-text-primary dark:text-text-inverted truncate">
                {student.name}
              </h3>
              <Badge variant={isActive ? 'success' : 'gray'}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1.5 text-sm text-text-secondary dark:text-text-muted">
                <Mail size={13} />
                <span>{student.email}</span>
              </div>
              {studentId && (
                <div className="flex items-center gap-1.5 text-sm text-text-secondary dark:text-text-muted">
                  <Hash size={13} />
                  <span>{studentId}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Info Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {faculty && (
            <InfoChip icon={BookOpen} label="Faculty" value={faculty} />
          )}
          {year && (
            <InfoChip icon={Calendar} label="Year" value={YEAR_LABELS[year] || `Year ${year}`} />
          )}
          {preferredRole && (
            <InfoChip icon={Briefcase} label="Preferred Role" value={preferredRole} />
          )}
          {availableHours && (
            <InfoChip icon={Clock} label="Hours / Week" value={availableHours} />
          )}
          {student.createdAt && (
            <InfoChip
              icon={Star}
              label="Joined"
              value={formatDate(student.createdAt, 'short')}
            />
          )}
        </div>

        {/* ── Bio ── */}
        {bio && (
          <div>
            <SectionLabel>Bio</SectionLabel>
            <p className="text-sm text-text-secondary dark:text-text-muted leading-relaxed mt-1.5">
              {bio}
            </p>
          </div>
        )}

        {/* ── Technical Skills ── */}
        <div>
          <SectionLabel>
            Technical Skills
            {skills.length > 0 && (
              <span className="ml-2 text-xs font-normal text-text-muted">
                ({skills.length})
              </span>
            )}
          </SectionLabel>
          {skills.length === 0 ? (
            <p className="text-sm text-text-muted mt-1.5 italic">No skills listed</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill, i) => (
                <Badge key={i} variant="primary">
                  {typeof skill === 'object' ? skill.name || skill : skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* ── Soft Skills ── */}
        <div>
          <SectionLabel>
            Soft Skills
            {softSkills.length > 0 && (
              <span className="ml-2 text-xs font-normal text-text-muted">
                ({softSkills.length})
              </span>
            )}
          </SectionLabel>
          {softSkills.length === 0 ? (
            <p className="text-sm text-text-muted mt-1.5 italic">No soft skills listed</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {softSkills.map((skill, i) => (
                <Badge key={i} variant="gray">
                  {typeof skill === 'object' ? skill.name || skill : skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* ── Availability ── */}
        {availableDays.length > 0 && (
          <div>
            <SectionLabel>Availability</SectionLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableDays.map((day, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-surface-input dark:bg-dark-elevated text-text-primary dark:text-text-inverted border border-surface-border dark:border-dark-border"
                >
                  {day}
                </span>
              ))}
            </div>
            {availableHours && (
              <p className="mt-2 text-xs text-text-muted">
                Available approx.{' '}
                <span className="font-semibold text-text-secondary dark:text-text-inverted">
                  {availableHours}
                </span>{' '}
                hours / week
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Small reusable helpers inside the modal
function SectionLabel({ children }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted dark:text-text-muted">
      {children}
    </h4>
  );
}

function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-surface-input dark:bg-dark-elevated border border-surface-border dark:border-dark-border">
      <div className="flex items-center gap-1.5 text-text-muted">
        <Icon size={12} />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-semibold text-text-primary dark:text-text-inverted truncate">
        {value}
      </span>
    </div>
  );
}

// ─── Filter / Search Bar ───────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1 min-w-0">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-9 pr-4 py-2 text-sm rounded-lg border outline-none transition-colors',
          'bg-surface-card border-surface-border text-text-primary placeholder:text-text-muted',
          'dark:bg-dark-card dark:border-dark-border dark:text-text-inverted',
          'focus:border-primary dark:focus:border-dark-primaryAccent',
          'focus:ring-2 focus:ring-primary/20 dark:focus:ring-dark-primaryAccent/20'
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary dark:hover:text-text-inverted transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function SelectFilter({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border outline-none transition-colors cursor-pointer',
          'bg-surface-card border-surface-border text-text-primary',
          'dark:bg-dark-card dark:border-dark-border dark:text-text-inverted',
          'focus:border-primary dark:focus:border-dark-primaryAccent',
          'focus:ring-2 focus:ring-primary/20 dark:focus:ring-dark-primaryAccent/20'
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  // ── Data state
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // ── UI state
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  // ── Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const debounceRef = useRef(null);

  // ── Modal state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Debounce search input
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // ── Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, yearFilter]);

  // ── Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        role: 'student',
        page,
        limit: PAGE_LIMIT,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.isActive = statusFilter === 'active';
      if (yearFilter) params.year = yearFilter;

      const res = await usersApi.getUsers(params);
      const data = res.data?.data || res.data || {};

      // Support various API response shapes
      const userList =
        data.users ||
        data.students ||
        data.results ||
        data.data ||
        (Array.isArray(data) ? data : []);
      const pagination = data.pagination || data.meta || {};

      setStudents(userList);
      setTotalStudents(pagination.total || data.total || userList.length);
      setTotalPages(
        pagination.pages ||
          pagination.totalPages ||
          Math.ceil((pagination.total || data.total || userList.length) / PAGE_LIMIT) ||
          1
      );
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setError(err?.response?.data?.message || 'Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, yearFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ── Success Callback
  const handleAddSuccess = (msg) => {
    setToastMessage(msg);
    fetchStudents();
    setTimeout(() => setToastMessage(null), 5000);
  };

  // ── Fetch overview stats
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const res = await usersApi.getStats();
        setStats(res.data?.data || res.data || null);
      } catch {
        // stats are non-critical; fail silently
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // ── Open detail modal (fetches full profile)
  const handleViewStudent = async (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
    // If the list data is partial, fetch full details
    if (!student.profile) {
      setModalLoading(true);
      try {
        const res = await usersApi.getUserById(student._id);
        const full = res.data?.data || res.data || student;
        setSelectedStudent(full);
      } catch {
        // keep whatever we have from the list
      } finally {
        setModalLoading(false);
      }
    }
  };

  // ── Handle delete from modal
  const handleStudentDeleted = (deletedId) => {
    setStudents((prev) => prev.filter((s) => s._id !== deletedId));
    setTotalStudents((prev) => Math.max(0, prev - 1));
  };

  // ── Client-side filter (extra safety layer on top of server search)
  const displayedStudents = useMemo(() => {
    if (!debouncedSearch) return students;
    const q = debouncedSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.profile?.studentId?.toLowerCase().includes(q)
    );
  }, [students, debouncedSearch]);

  // ── Table columns definition
  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (_, row) => (
          <div className="flex items-center gap-3 min-w-[160px]">
            <Avatar name={row.name} size="sm" />
            <span className="font-medium text-text-primary dark:text-text-inverted truncate max-w-[140px]">
              {row.name}
            </span>
          </div>
        ),
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        render: (val) => (
          <span className="text-text-secondary dark:text-text-muted truncate max-w-[180px] block">
            {val}
          </span>
        ),
      },
      {
        key: 'studentId',
        label: 'Student ID',
        sortable: false,
        render: (val, row) => {
          const id = val || row.profile?.studentId;
          return id ? (
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-input dark:bg-dark-elevated text-text-primary dark:text-text-inverted border border-surface-border dark:border-dark-border">
              {id}
            </span>
          ) : (
            <span className="text-text-muted text-xs italic">—</span>
          );
        },
      },
      {
        key: 'faculty',
        label: 'Faculty',
        sortable: true,
        render: (val, row) => {
          const f = val || row.profile?.faculty;
          return f ? (
            <span className="text-sm text-text-secondary dark:text-text-muted truncate max-w-[120px] block">
              {f}
            </span>
          ) : (
            <span className="text-text-muted text-xs italic">—</span>
          );
        },
      },
      {
        key: 'year',
        label: 'Year',
        sortable: true,
        render: (val, row) => {
          const y = val || row.profile?.year;
          return y ? (
            <Badge variant="info">{YEAR_LABELS[y] || `Yr ${y}`}</Badge>
          ) : (
            <span className="text-text-muted text-xs italic">—</span>
          );
        },
      },
      {
        key: 'skills',
        label: 'Skills',
        sortable: false,
        render: (_, row) => {
          const count = (row.profile?.skills || row.skills || []).length;
          return count > 0 ? (
            <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-bold rounded-full bg-primary/10 text-primary dark:bg-dark-primaryLight dark:text-dark-primaryAccent">
              {count}
            </span>
          ) : (
            <span className="text-text-muted text-xs italic">0</span>
          );
        },
      },
      {
        key: 'isActive',
        label: 'Status',
        sortable: true,
        render: (val) => {
          const active = val !== false;
          return (
            <div className="flex items-center gap-1.5">
              {active ? (
                <CheckCircle size={14} className="text-success shrink-0" />
              ) : (
                <XCircle size={14} className="text-danger shrink-0" />
              )}
              <Badge variant={active ? 'success' : 'gray'}>
                {active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          );
        },
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_, row) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewStudent(row);
              }}
              title="View student"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 dark:bg-dark-primaryLight dark:text-dark-primaryAccent dark:hover:bg-dark-primaryLight/70 transition-colors"
            >
              <Eye size={13} />
              View
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Stat card values
  const activeCount =
    stats?.activeStudents ?? students.filter((s) => s.isActive !== false).length;
  const inactiveCount =
    stats?.inactiveStudents ?? students.filter((s) => s.isActive === false).length;
  const avgSkills =
    stats?.avgSkills ??
    (students.length > 0
      ? (
          students.reduce(
            (acc, s) => acc + (s.profile?.skills || s.skills || []).length,
            0
          ) / students.length
        ).toFixed(1)
      : 0);

  // ── Export CSV
  const handleExportCSV = () => {
    const csv = [
      ['Name', 'Email', 'Student ID', 'Faculty', 'Year', 'Status'].join(','),
      ...displayedStudents.map((s) =>
        [
          `"${s.name || ''}"`,
          `"${s.email || ''}"`,
          `"${s.studentId || s.profile?.studentId || ''}"`,
          `"${s.faculty || s.profile?.faculty || ''}"`,
          s.year || s.profile?.year || '',
          s.isActive !== false ? 'Active' : 'Inactive',
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = !!(debouncedSearch || statusFilter || yearFilter);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setYearFilter('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverted">
              Student Management
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary dark:text-text-muted">
              Browse, filter, and manage all registered students.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddModalOpen(true)}
            >
              <UserPlus size={15} />
              Add Student
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={handleExportCSV}
            >
              <Download size={15} />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 text-success shadow-md animate-fade-in">
            <CheckCircle size={18} className="shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statsLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border p-5 shadow-sm bg-surface-card border-surface-border dark:bg-dark-card dark:border-dark-border animate-pulse"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-20 rounded bg-surface-border dark:bg-dark-elevated" />
                      <div className="h-7 w-12 rounded bg-surface-border dark:bg-dark-elevated" />
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-surface-border dark:bg-dark-elevated" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard
                label="Total Students"
                value={totalStudents}
                icon={Users}
                color="primary"
              />
              <StatCard
                label="Active"
                value={activeCount}
                icon={CheckCircle}
                color="success"
              />
              <StatCard
                label="Inactive"
                value={inactiveCount}
                icon={XCircle}
                color="danger"
              />
              <StatCard
                label="Avg. Skills"
                value={avgSkills}
                icon={Star}
                color="warning"
              />
            </>
          )}
        </div>

        {/* ── Filters Row ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email or ID…"
          />
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={15} className="text-text-muted hidden sm:block" />
            <SelectFilter
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
            />
            <SelectFilter
              value={yearFilter}
              onChange={setYearFilter}
              options={YEAR_OPTIONS}
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-danger transition-colors"
                title="Clear all filters"
              >
                <X size={13} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Error State ── */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-danger">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{error}</p>
              <button
                onClick={fetchStudents}
                className="mt-1 text-xs underline hover:no-underline opacity-80 hover:opacity-100"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <TableSkeletonRows count={PAGE_LIMIT} />
        ) : !error && displayedStudents.length === 0 ? (
          <div className="rounded-xl border bg-surface-card border-surface-border dark:bg-dark-card dark:border-dark-border">
            <EmptyState
              icon={Users}
              title={
                hasFilters ? 'No students match your filters' : 'No students found'
              }
              description={
                hasFilters
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Students will appear here once they register.'
              }
              action={
                hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X size={14} />
                    Clear Filters
                  </Button>
                )
              }
            />
          </div>
        ) : (
          !error && (
            <Table
              columns={columns}
              data={displayedStudents}
              loading={false}
              onRowClick={handleViewStudent}
              emptyMessage="No students found"
              emptyIcon={Users}
            />
          )
        )}

        {/* ── Pagination ── */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-2">
            <Pagination
              page={page}
              pages={totalPages}
              total={totalStudents}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ── Result count summary ── */}
        {!loading && !error && totalStudents > 0 && totalPages <= 1 && (
          <p className="text-xs text-text-muted text-center">
            Showing {displayedStudents.length} of {totalStudents} student
            {totalStudents !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Student Detail Modal ── */}
      <StudentDetailModal
        student={modalLoading ? null : selectedStudent}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStudent(null);
        }}
        onDelete={handleStudentDeleted}
      />

      {/* Loading overlay for modal fetch */}
      {modalLoading && modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="bg-surface-card dark:bg-dark-card rounded-xl p-6 shadow-2xl border border-surface-border dark:border-dark-border flex items-center gap-3 pointer-events-auto">
            <div className="h-5 w-5 border-2 border-primary dark:border-dark-primaryAccent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary dark:text-text-muted">
              Loading student profile…
            </span>
          </div>
        </div>
      )}

      {/* ── Add Student Modal ── */}
      <AddStudentModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </PageWrapper>
  );
}

// ─── Add Student Modal ─────────────────────────────────────────────────────────
function AddStudentModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'csv'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importErrors, setImportErrors] = useState([]);

  // Manual Entry Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [faculty, setFaculty] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('3'); // Default 3rd year

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setStudentId('');
    setFaculty('');
    setYearOfStudy('3');
    setCsvFile(null);
    setParsedRows([]);
    setError(null);
    setImportErrors([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Manual Submit
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !studentId.trim()) {
      setError('Name, Email, and Student ID are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        role: 'student',
        studentId: studentId.trim(),
        faculty: faculty.trim() || undefined,
        yearOfStudy: yearOfStudy ? Number(yearOfStudy) : undefined,
      });
      onSuccess('Student registered successfully.');
      handleClose();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to create student. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  // CSV Drag/Drop & File Input
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }
    setCsvFile(file);
    setError(null);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      try {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setError('CSV file is empty or missing headers.');
          setParsedRows([]);
        } else {
          setParsedRows(rows);
        }
      } catch (err) {
        setError('Error parsing CSV file. Ensure it is a valid format.');
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];

    const cleanLines = lines.map((line) => line.trim()).filter(Boolean);
    if (cleanLines.length === 0) return [];

    const headers = cleanLines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

    const results = [];
    for (let i = 1; i < cleanLines.length; i++) {
      const row = cleanLines[i];
      const values = [];
      let insideQuotes = false;
      let currentValue = '';

      for (let charIndex = 0; charIndex < row.length; charIndex++) {
        const char = row[charIndex];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim().replace(/^["']|["']$/g, ''));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim().replace(/^["']|["']$/g, ''));

      const obj = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        let mappedField = header;
        if (normalizedHeader === 'name' || normalizedHeader === 'fullname') {
          mappedField = 'fullName';
        } else if (normalizedHeader === 'email') {
          mappedField = 'email';
        } else if (normalizedHeader === 'studentid' || normalizedHeader === 'id') {
          mappedField = 'studentId';
        } else if (normalizedHeader === 'faculty') {
          mappedField = 'faculty';
        } else if (normalizedHeader === 'year' || normalizedHeader === 'yearofstudy' || normalizedHeader === 'studyyear') {
          mappedField = 'yearOfStudy';
        }
        obj[mappedField] = values[index] || '';
      });
      results.push(obj);
    }
    return results;
  };

  // CSV Submit
  const handleCsvSubmit = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    setError(null);
    setImportErrors([]);

    try {
      const res = await usersApi.bulkImport(parsedRows);
      onSuccess(res.data?.message || `Successfully imported ${parsedRows.length} students.`);
      handleClose();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 422 && err.response.data?.errors) {
        setImportErrors(err.response.data.errors);
        setError('CSV validation failed. Please fix the rows highlighted below.');
      } else {
        setError(err?.response?.data?.message || 'Failed to import CSV dataset.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Students"
      size={activeTab === 'csv' && parsedRows.length > 0 ? 'xl' : 'lg'}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {activeTab === 'manual' ? (
            <Button variant="primary" size="sm" onClick={handleManualSubmit} loading={loading}>
              Create Student
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleCsvSubmit}
              disabled={parsedRows.length === 0}
              loading={loading}
            >
              Import {parsedRows.length > 0 ? `(${parsedRows.length})` : ''}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Tab Headers */}
        <div className="flex border-b border-surface-border dark:border-dark-border">
          <button
            onClick={() => {
              setActiveTab('manual');
              setError(null);
              setImportErrors([]);
            }}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors',
              activeTab === 'manual'
                ? 'border-primary text-primary dark:border-dark-primaryAccent dark:text-dark-primaryAccent'
                : 'border-transparent text-text-muted hover:text-text-primary dark:hover:text-text-inverted'
            )}
          >
            Manual Entry
          </button>
          <button
            onClick={() => {
              setActiveTab('csv');
              setError(null);
              setImportErrors([]);
            }}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors',
              activeTab === 'csv'
                ? 'border-primary text-primary dark:border-dark-primaryAccent dark:text-dark-primaryAccent'
                : 'border-transparent text-text-muted hover:text-text-primary dark:hover:text-text-inverted'
            )}
          >
            CSV File Import
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-danger text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-surface-input border-surface-border text-text-primary focus:border-primary dark:bg-dark-elevated dark:border-dark-border dark:text-text-inverted dark:focus:border-dark-primaryAccent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@collabcore.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-surface-input border-surface-border text-text-primary focus:border-primary dark:bg-dark-elevated dark:border-dark-border dark:text-text-inverted dark:focus:border-dark-primaryAccent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Student ID *
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU-2026-045"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-surface-input border-surface-border text-text-primary focus:border-primary dark:bg-dark-elevated dark:border-dark-border dark:text-text-inverted dark:focus:border-dark-primaryAccent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Faculty
                </label>
                <input
                  type="text"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-surface-input border-surface-border text-text-primary focus:border-primary dark:bg-dark-elevated dark:border-dark-border dark:text-text-inverted dark:focus:border-dark-primaryAccent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Year of Study
                </label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-surface-input border-surface-border text-text-primary focus:border-primary dark:bg-dark-elevated dark:border-dark-border dark:text-text-inverted dark:focus:border-dark-primaryAccent"
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-text-muted italic">
              Note: Manually created students will receive an automatically generated temporary password.
            </p>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Drag and Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
              className="border-2 border-dashed border-surface-border hover:border-primary dark:border-dark-border dark:hover:border-dark-primaryAccent rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-surface-input/30 hover:bg-surface-input/60 dark:bg-dark-elevated/20 dark:hover:bg-dark-elevated/40"
            >
              <Upload size={32} className="text-text-muted animate-pulse" />
              <div className="text-sm font-semibold text-text-primary dark:text-text-inverted">
                {csvFile ? csvFile.name : 'Select or drag your CSV file here'}
              </div>
              <p className="text-xs text-text-muted">
                CSV must contain headers: name/fullName, email, studentId, faculty, yearOfStudy
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* CSV Validation Failure list */}
            {importErrors.length > 0 && (
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20 p-3 space-y-2">
                <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                  Validation Errors in CSV:
                </h4>
                <div className="space-y-1.5">
                  {importErrors.map((err, idx) => (
                    <div key={idx} className="text-xs text-red-600 dark:text-red-400">
                      <span className="font-semibold">Row {err.row} ({err.student}):</span>
                      <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                        {err.errors.map((msg, mIdx) => (
                          <li key={mIdx}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CSV Row Preview table */}
            {parsedRows.length > 0 && importErrors.length === 0 && (
              <div className="space-y-2">
                <SectionLabel>CSV Row Preview ({parsedRows.length} students found)</SectionLabel>
                <div className="max-h-[220px] overflow-y-auto rounded-lg border border-surface-border dark:border-dark-border">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-input dark:bg-dark-elevated sticky top-0 border-b border-surface-border dark:border-dark-border">
                      <tr>
                        <th className="p-2 font-bold">Name</th>
                        <th className="p-2 font-bold">Email</th>
                        <th className="p-2 font-bold">Student ID</th>
                        <th className="p-2 font-bold">Faculty</th>
                        <th className="p-2 font-bold">Year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border/50 dark:divide-dark-border/50 bg-surface-card dark:bg-dark-card">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-input/30 dark:hover:bg-dark-elevated/10">
                          <td className="p-2 text-text-primary dark:text-text-inverted truncate max-w-[120px]">{row.fullName || row.name || '—'}</td>
                          <td className="p-2 text-text-secondary dark:text-text-muted truncate max-w-[150px]">{row.email || '—'}</td>
                          <td className="p-2 font-mono text-[10px] text-text-primary dark:text-text-inverted">{row.studentId || '—'}</td>
                          <td className="p-2 text-text-secondary dark:text-text-muted truncate max-w-[100px]">{row.faculty || '—'}</td>
                          <td className="p-2 text-text-secondary dark:text-text-muted">{row.yearOfStudy || row.year || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
