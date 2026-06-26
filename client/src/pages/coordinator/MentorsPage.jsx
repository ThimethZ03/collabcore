import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Search,
  Trash2,
  UserPlus,
  X,
  Mail,
  BookOpen,
  Calendar,
  AlertCircle,
  Upload,
  Plus,
  Check,
} from 'lucide-react';
import * as usersApi from '../../api/users';
import * as authApi from '../../api/auth';
import * as mentorsApi from '../../api/mentors';
import * as teamsApi from '../../api/teams';
import { PageWrapper } from '../../components/layout';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Modal,
  Table,
} from '../../components/common';
import { cn } from '../../utils/helpers';

// ─── Table Skeleton ────────────────────────────────────────────────────────────
function TableSkeletonRows({ count = 6 }) {
  return (
    <div className="rounded-xl border overflow-hidden bg-surface-card border-surface-border dark:bg-dark-card dark:border-dark-border animate-pulse">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-border dark:border-dark-border bg-surface-input dark:bg-dark-elevated/50">
        {[150, 180, 120, 200, 80].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded bg-surface-border dark:bg-dark-elevated"
            style={{ width: `${w}px`, flexShrink: 0 }}
          />
        ))}
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-surface-border/50 dark:border-dark-border/50 last:border-0"
        >
          <div className="flex items-center gap-3" style={{ width: 150, flexShrink: 0 }}>
            <div className="h-9 w-9 rounded-full bg-surface-border dark:bg-dark-elevated" />
            <div className="h-3 rounded bg-surface-border dark:bg-dark-elevated flex-1" />
          </div>
          {[180, 120, 200, 80].map((w, j) => (
            <div
              key={j}
              className="h-3 rounded bg-surface-border dark:bg-dark-elevated"
              style={{ width: `${w}px`, flexShrink: 0 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Add Mentor Modal Component ───────────────────────────────────────────────
function AddMentorModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importErrors, setImportErrors] = useState([]);

  // Manual Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [faculty, setFaculty] = useState('');

  // CSV States
  const [csvFile, setCsvFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setFaculty('');
    setCsvFile(null);
    setParsedRows([]);
    setError(null);
    setImportErrors([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Name and Email are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        role: 'mentor',
        faculty: faculty.trim() || undefined,
      });
      onSuccess('Mentor registered successfully. Credentials logged/sent.');
      handleClose();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to create mentor. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

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

      const obj = { role: 'mentor' };
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        let mappedField = header;
        if (normalizedHeader === 'name' || normalizedHeader === 'fullname') {
          mappedField = 'fullName';
        } else if (normalizedHeader === 'email') {
          mappedField = 'email';
        } else if (normalizedHeader === 'faculty') {
          mappedField = 'faculty';
        }
        obj[mappedField] = values[index] || '';
      });
      results.push(obj);
    }
    return results;
  };

  const handleCsvSubmit = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    setError(null);
    setImportErrors([]);

    try {
      const res = await usersApi.bulkImport(parsedRows);
      onSuccess(res.data?.message || `Successfully imported ${parsedRows.length} mentors.`);
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
      title="Add Mentors"
      size={activeTab === 'csv' && parsedRows.length > 0 ? 'xl' : 'lg'}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {activeTab === 'manual' ? (
            <Button variant="primary" size="sm" onClick={handleManualSubmit} loading={loading}>
              Create Mentor
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
                  placeholder="e.g. Dr. John Doe"
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
                  placeholder="e.g. mentor@university.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-surface-input border-surface-border text-text-primary focus:border-primary dark:bg-dark-elevated dark:border-dark-border dark:text-text-inverted dark:focus:border-dark-primaryAccent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                Faculty / Department
              </label>
              <input
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                placeholder="e.g. Faculty of Engineering"
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-surface-input border-surface-border text-text-primary focus:border-primary dark:bg-dark-elevated dark:border-dark-border dark:text-text-inverted dark:focus:border-dark-primaryAccent"
              />
            </div>
            <p className="text-[11px] text-text-muted italic">
              Note: Manually created mentors will receive an automatically generated password sent to their email.
            </p>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
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
                CSV must contain headers: name/fullName, email, faculty
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

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

            {parsedRows.length > 0 && importErrors.length === 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  CSV Row Preview ({parsedRows.length} mentors found)
                </h4>
                <div className="max-h-[220px] overflow-y-auto rounded-lg border border-surface-border dark:border-dark-border">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-input dark:bg-dark-elevated sticky top-0 border-b border-surface-border dark:border-dark-border">
                      <tr>
                        <th className="p-2 font-bold">Name</th>
                        <th className="p-2 font-bold">Email</th>
                        <th className="p-2 font-bold">Faculty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border/50 dark:divide-dark-border/50 bg-surface-card dark:bg-dark-card">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-input/30 dark:hover:bg-dark-elevated/10">
                          <td className="p-2 text-text-primary dark:text-text-inverted truncate max-w-[150px]">{row.fullName || row.name || '—'}</td>
                          <td className="p-2 text-text-secondary dark:text-text-muted truncate max-w-[200px]">{row.email || '—'}</td>
                          <td className="p-2 text-text-secondary dark:text-text-muted truncate max-w-[150px]">{row.faculty || '—'}</td>
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

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function MentorsPage() {
  const [mentors, setMentors] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Action States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Filters
  const [search, setSearch] = useState('');

  const fetchMentorsAndTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mentorsRes, teamsRes] = await Promise.all([
        usersApi.getUsers({ role: 'mentor', limit: 100 }),
        teamsApi.getTeams({ limit: 100 }),
      ]);

      const mentorList = mentorsRes.data?.data ?? mentorsRes.data ?? [];
      const teamList = teamsRes.data?.data ?? teamsRes.data ?? [];

      setMentors(Array.isArray(mentorList) ? mentorList : []);
      setTeams(Array.isArray(teamList) ? teamList : []);
    } catch (err) {
      console.error('Failed to load mentors/teams:', err);
      setError(err?.response?.data?.message || 'Failed to fetch mentors data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMentorsAndTeams();
  }, [fetchMentorsAndTeams]);

  const handleAddSuccess = (msg) => {
    setToastMessage(msg);
    fetchMentorsAndTeams();
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleDeleteMentor = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this mentor?')) return;
    try {
      await usersApi.deleteUser(id);
      setToastMessage('Mentor deactivated successfully.');
      fetchMentorsAndTeams();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete mentor:', err);
      alert('Failed to deactivate mentor.');
    }
  };

  const openAssignModal = (mentor) => {
    setSelectedMentor(mentor);
    setAssignModalOpen(true);
  };

  const handleAssignTeam = async (teamId) => {
    if (!selectedMentor) return;
    setSubmittingAssign(true);
    try {
      await mentorsApi.assignTeamToMentor(selectedMentor._id, teamId);
      handleAddSuccess(`Assigned team successfully. Notifications dispatched.`);
      setAssignModalOpen(false);
    } catch (err) {
      console.error('Failed to assign team to mentor:', err);
      alert(err?.response?.data?.message || 'Failed to assign team.');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Filtered mentors list
  const filteredMentors = mentors.filter((m) => {
    const term = search.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      (m.faculty && m.faculty.toLowerCase().includes(term))
    );
  });

  // Helper: Find teams assigned to a mentor
  const getMentorTeamsList = (mentorId) => {
    return teams.filter((t) => t.mentor?._id === mentorId || t.mentor === mentorId);
  };

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverted">
              Mentor Management
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary dark:text-text-muted">
              Add mentors manually or via CSV, and link them to student project groups.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <UserPlus size={16} />
            Add Mentors
          </Button>
        </div>

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 text-success text-sm transition-all duration-300">
            <Check size={16} className="shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-surface-card dark:bg-dark-card p-4 rounded-xl border border-surface-border dark:border-dark-border">
          <div className="relative flex-1 min-w-0 w-full">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mentors by name, email, or department..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border outline-none bg-surface-input border-surface-border text-text-primary placeholder:text-text-muted focus:border-primary dark:bg-dark-elevated dark:border-dark-border dark:text-text-inverted dark:focus:border-dark-primaryAccent transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary dark:hover:text-text-inverted transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-danger">
            <AlertCircle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <TableSkeletonRows />
        ) : filteredMentors.length === 0 ? (
          <EmptyState
            title="No mentors found"
            description={search ? "Try searching for a different name or email." : "Add your first academic mentor to get started."}
            icon={Users}
          />
        ) : (
          <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface-card dark:bg-dark-card">
            <Table>
              <thead>
                <tr className="bg-surface-input dark:bg-dark-elevated border-b border-surface-border dark:border-dark-border">
                  <th className="p-4 text-left font-semibold text-text-primary dark:text-text-inverted text-xs uppercase tracking-wider">
                    Mentor
                  </th>
                  <th className="p-4 text-left font-semibold text-text-primary dark:text-text-inverted text-xs uppercase tracking-wider">
                    Faculty / Department
                  </th>
                  <th className="p-4 text-left font-semibold text-text-primary dark:text-text-inverted text-xs uppercase tracking-wider">
                    Assigned Groups
                  </th>
                  <th className="p-4 text-right font-semibold text-text-primary dark:text-text-inverted text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 dark:divide-dark-border/50">
                {filteredMentors.map((mentor) => {
                  const assignedTeams = getMentorTeamsList(mentor._id);
                  return (
                    <tr
                      key={mentor._id}
                      className="hover:bg-surface-input/10 dark:hover:bg-dark-elevated/5 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={mentor.fullName} src={mentor.avatar} size="md" />
                          <div>
                            <div className="font-semibold text-text-primary dark:text-text-inverted text-sm">
                              {mentor.fullName}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                              <Mail size={12} />
                              <span>{mentor.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-text-secondary dark:text-text-muted">
                        {mentor.faculty || <span className="italic text-text-muted/50">—</span>}
                      </td>
                      <td className="p-4">
                        {assignedTeams.length === 0 ? (
                          <span className="text-xs text-text-muted italic bg-surface-input dark:bg-dark-elevated px-2 py-1 rounded">
                            Unassigned
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {assignedTeams.map((t) => (
                              <Badge key={t._id} variant="success">
                                {t.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => openAssignModal(mentor)}
                            className="text-primary dark:text-dark-primaryAccent"
                          >
                            <Plus size={12} className="mr-1" />
                            Assign Team
                          </Button>
                          <button
                            onClick={() => handleDeleteMentor(mentor._id)}
                            className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="Deactivate Mentor"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Mentor Modal */}
      <AddMentorModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Assign Team Modal */}
      {selectedMentor && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title={`Assign Team to ${selectedMentor.fullName}`}
          footer={
            <Button variant="ghost" size="sm" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary dark:text-text-muted">
              Select one of the cohort groups below to link under this mentor. When assigned, notifications are sent to the mentor and all team students.
            </p>
            {teams.length === 0 ? (
              <p className="text-sm text-text-muted italic text-center py-6">
                No active teams formed yet.
              </p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto border border-surface-border dark:border-dark-border rounded-lg divide-y divide-surface-border/50 dark:divide-dark-border/50">
                {teams.map((t) => {
                  const isCurrentMentor = t.mentor?._id === selectedMentor._id || t.mentor === selectedMentor._id;
                  return (
                    <div
                      key={t._id}
                      className="p-3 flex items-center justify-between hover:bg-surface-input/30 dark:hover:bg-dark-elevated/10 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-text-primary dark:text-text-inverted text-sm">
                          {t.name}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {t.members?.length || 0} members •{' '}
                          {t.assignedProject?.title ? `Project: "${t.assignedProject.title}"` : 'No project assigned'}
                        </div>
                        {t.mentor && !isCurrentMentor && (
                          <div className="text-[10px] text-warning mt-1">
                            Currently assigned to: {t.mentor.fullName || 'another mentor'}
                          </div>
                        )}
                      </div>
                      <div>
                        {isCurrentMentor ? (
                          <Badge variant="success">Assigned</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={submittingAssign}
                            onClick={() => handleAssignTeam(t._id)}
                          >
                            Assign
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
}
