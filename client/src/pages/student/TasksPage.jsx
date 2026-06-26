import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  CheckSquare,
  Plus,
  MessageSquare,
  Clock,
  Flag,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Send,
  X,
  User,
  UsersRound,
  Paperclip,
} from 'lucide-react';
import * as tasksApi from '../../api/tasks';
import * as teamsApi from '../../api/teams';
import { PageWrapper } from '../../components/layout';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Spinner,
} from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { cn, formatDate } from '../../utils/helpers';

const KANBAN_COLUMNS = [
  { id: 'Backlog', title: 'Backlog', color: 'border-t-gray-400 bg-gray-50/50 dark:bg-slate-900/10' },
  { id: 'To Do', title: 'To Do', color: 'border-t-blue-400 bg-blue-50/30 dark:bg-blue-950/5' },
  { id: 'In Progress', title: 'In Progress', color: 'border-t-amber-400 bg-amber-50/30 dark:bg-amber-950/5' },
  { id: 'Under Review', title: 'Under Review', color: 'border-t-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/5' },
  { id: 'Completed', title: 'Completed', color: 'border-t-green-400 bg-green-50/30 dark:bg-green-950/5' },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [boardData, setBoardData] = useState({
    Backlog: [],
    'To Do': [],
    'In Progress': [],
    'Under Review': [],
    Completed: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal Detail State
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Create Task Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('To Do');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskLabel, setNewTaskLabel] = useState('Dev');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskHoursLogged, setNewTaskHoursLogged] = useState(0);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // 1. Resolve student's team first
  const resolveTeamAndTasks = useCallback(async () => {
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

      // Fetch Kanban board grouped tasks
      const kanbanRes = await tasksApi.getKanbanTasks(myTeam._id);
      const kanbanData = kanbanRes.data?.data ?? kanbanRes.data ?? {};

      // Fill in empty arrays for safety
      setBoardData({
        Backlog: kanbanData.Backlog ?? [],
        'To Do': kanbanData['To Do'] ?? [],
        'In Progress': kanbanData['In Progress'] ?? [],
        'Under Review': kanbanData['Under Review'] ?? [],
        Completed: kanbanData.Completed ?? [],
      });
    } catch (err) {
      console.error('Failed to load Kanban tasks:', err);
      setError(err?.response?.data?.message || 'Failed to fetch team Kanban board.');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    resolveTeamAndTasks();
  }, [resolveTeamAndTasks]);

  // 2. Drag & Drop handler
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;

    // Local state optimistic update
    const newBoardData = { ...boardData };
    const sourceTasks = Array.from(newBoardData[sourceCol]);
    const destTasks = Array.from(newBoardData[destCol]);

    const [movedTask] = sourceTasks.splice(source.index, 1);
    
    // Update status locally
    movedTask.status = destCol;

    if (sourceCol === destCol) {
      sourceTasks.splice(destination.index, 0, movedTask);
      newBoardData[sourceCol] = sourceTasks;
    } else {
      destTasks.splice(destination.index, 0, movedTask);
      newBoardData[sourceCol] = sourceTasks;
      newBoardData[destCol] = destTasks;
    }

    setBoardData(newBoardData);

    // Call API in background to update status
    try {
      await tasksApi.moveTask(draggableId, destCol);
    } catch (err) {
      console.error('Failed to move task:', err);
      // Revert board if failed
      resolveTeamAndTasks();
    }
  };

  // 3. Open Detail Modal
  const handleOpenDetail = async (task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
    setRecommendations([]);
    setLoadingRecs(true);
    // Fetch full task with comments populated and get AI recommendations
    try {
      const res = await tasksApi.getTaskById(task._id);
      const fullTask = res.data?.data ?? res.data ?? task;
      setSelectedTask(fullTask);

      const recsRes = await tasksApi.getTaskRecommendations(task._id);
      setRecommendations(recsRes.data?.data ?? recsRes.data ?? []);
    } catch (err) {
      console.error('Failed to fetch full task details or recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  // 3b. Handle task assignment from AI suggestions
  const handleAssignTask = async (studentId) => {
    if (!selectedTask) return;
    setTaskSubmitting(true);
    try {
      const res = await tasksApi.updateTask(selectedTask._id, { assignee: studentId });
      const updated = res.data?.data ?? res.data ?? selectedTask;
      setSelectedTask(updated);
      
      // Refresh background board data too
      const currentBoard = { ...boardData };
      const statusCol = updated.status || 'To Do';
      currentBoard[statusCol] = currentBoard[statusCol].map((t) =>
        t._id === updated._id ? updated : t
      );
      setBoardData(currentBoard);
    } catch (err) {
      console.error('Failed to assign task:', err);
      alert(err?.response?.data?.message || 'Failed to assign task.');
    } finally {
      setTaskSubmitting(false);
    }
  };

  // 4. Submit Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;
    setCommentSubmitting(true);
    try {
      const res = await tasksApi.addComment(selectedTask._id, commentText);
      const updated = res.data?.data ?? res.data ?? selectedTask;
      setSelectedTask(updated);
      setCommentText('');

      // Refresh background board data too
      const currentBoard = { ...boardData };
      const statusCol = updated.status || 'To Do';
      currentBoard[statusCol] = currentBoard[statusCol].map((t) =>
        t._id === updated._id ? updated : t
      );
      setBoardData(currentBoard);
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to post comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !team) return;
    setTaskSubmitting(true);
    try {
      const payload = {
        title: newTaskTitle,
        description: newTaskDescription,
        status: newTaskStatus,
        priority: newTaskPriority,
        label: newTaskLabel,
        assignee: newTaskAssignee || undefined,
        hoursLogged: newTaskHoursLogged || 0,
        dueDate: newTaskDueDate || undefined,
        team: team._id,
      };

      await tasksApi.createTask(payload);
      
      // Reset form and close modal
      setCreateModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskStatus('To Do');
      setNewTaskPriority('Medium');
      setNewTaskLabel('Dev');
      setNewTaskAssignee('');
      setNewTaskHoursLogged(0);
      setNewTaskDueDate('');

      // Refresh task board
      await resolveTeamAndTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
      alert(err?.response?.data?.message || 'Failed to create task.');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const priorityColor = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'critical') return 'danger';
    if (p === 'high') return 'warning';
    if (p === 'low') return 'gray';
    return 'primary';
  };

  return (
    <PageWrapper>
      <div className="space-y-6 min-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverted">
              Kanban Task Board
            </h1>
            {team ? (
              <p className="mt-0.5 text-sm text-text-secondary dark:text-text-muted">
                Manage and track tasks for team <span className="font-semibold">{team.name}</span>.
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-text-muted">
                Your team has not been formed yet.
              </p>
            )}
          </div>
          {team && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resolveTeamAndTasks} disabled={loading}>
                <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
                Refresh Board
              </Button>
              <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
                <Plus size={14} />
                Add Task
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Card className="p-6">
            <EmptyState
              icon={AlertTriangle}
              title="Error Loading Board"
              description={error}
              action={
                <Button variant="primary" size="sm" onClick={resolveTeamAndTasks}>
                  Retry
                </Button>
              }
            />
          </Card>
        ) : !team ? (
          <Card className="p-8">
            <EmptyState
              icon={UsersRound}
              title="No Team Assigned"
              description="Tasks will become available once you are allocated to a project team."
            />
          </Card>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-1 items-start overflow-x-auto pb-4">
              {KANBAN_COLUMNS.map((col) => {
                const columnTasks = boardData[col.id] || [];
                return (
                  <div
                    key={col.id}
                    className={cn(
                      'rounded-xl border border-surface-border dark:border-dark-border p-3 flex flex-col max-h-[75vh] w-full min-w-[220px]',
                      col.color
                    )}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="font-semibold text-xs text-text-primary dark:text-text-inverted">
                        {col.title}
                      </span>
                      <span className="h-5 min-w-[1.25rem] px-1.5 rounded-full bg-surface-border dark:bg-dark-elevated text-[10px] font-bold text-text-secondary dark:text-text-muted flex items-center justify-center">
                        {columnTasks.length}
                      </span>
                    </div>

                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            'space-y-2.5 overflow-y-auto flex-1 min-h-[150px] rounded-lg p-0.5 transition-colors',
                            snapshot.isDraggingOver && 'bg-surface-border/20 dark:bg-dark-elevated/10'
                          )}
                        >
                          {columnTasks.map((task, index) => {
                            const assignee = task.assignee;
                            return (
                              <Draggable key={task._id} draggableId={task._id} index={index}>
                                {(providedDrag, snapshotDrag) => (
                                  <div
                                    ref={providedDrag.innerRef}
                                    {...providedDrag.draggableProps}
                                    {...providedDrag.dragHandleProps}
                                    onClick={() => handleOpenDetail(task)}
                                    className={cn(
                                      'p-3.5 rounded-lg border bg-surface-card border-surface-border dark:bg-dark-card dark:border-dark-border shadow-sm cursor-pointer select-none hover:shadow hover:border-primary/30 dark:hover:border-dark-primaryAccent/30 transition-all',
                                      snapshotDrag.isDragging && 'shadow-lg rotate-1 border-primary dark:border-dark-primaryAccent'
                                    )}
                                  >
                                    <h4 className="text-xs font-semibold text-text-primary dark:text-text-inverted line-clamp-2 leading-snug mb-2">
                                      {task.title}
                                    </h4>

                                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-surface-border/40 dark:border-dark-border/40">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Avatar
                                          name={assignee?.fullName ?? 'Unassigned'}
                                          size="sm"
                                          className="h-6 w-6 text-[10px]"
                                        />
                                        <span className="text-[10px] text-text-muted truncate max-w-[80px]">
                                          {assignee?.fullName?.split(' ')[0] ?? 'Unassigned'}
                                        </span>
                                      </div>
                                      <Badge variant={priorityColor(task.priority)} className="text-[9px] px-1.5 py-0 font-medium">
                                        {task.priority || 'Medium'}
                                      </Badge>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                          {columnTasks.length === 0 && (
                            <p className="text-[10px] text-text-muted italic text-center py-6">
                              Empty column
                            </p>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedTask(null);
          }}
          title={selectedTask.title}
          size="lg"
        >
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Description
              </h4>
              <p className="text-sm text-text-secondary dark:text-text-muted leading-relaxed">
                {selectedTask.description || <span className="italic">No description provided.</span>}
              </p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-input dark:bg-dark-elevated/30 p-3 rounded-lg border border-surface-border dark:border-dark-border">
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Status</p>
                <Badge variant="primary" className="mt-1 text-[10px] uppercase font-semibold">
                  {selectedTask.status}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Priority</p>
                <Badge variant={priorityColor(selectedTask.priority)} className="mt-1 text-[10px] uppercase font-semibold">
                  {selectedTask.priority || 'Medium'}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Hours Logged</p>
                <p className="text-xs font-bold text-text-primary dark:text-text-inverted mt-1">
                  {selectedTask.hoursLogged ?? 0} hrs
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Due Date</p>
                <p className="text-xs font-medium text-text-secondary dark:text-text-muted mt-1">
                  {selectedTask.dueDate ? formatDate(selectedTask.dueDate, 'short') : 'No limit'}
                </p>
              </div>
            </div>

            {/* Assignee / Created By */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between border-t border-surface-border dark:border-dark-border pt-4">
              <div className="flex items-center gap-2">
                <Avatar name={selectedTask.assignee?.fullName ?? 'Unassigned'} size="sm" />
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Assignee</p>
                  <p className="text-xs font-semibold text-text-primary dark:text-text-inverted">
                    {selectedTask.assignee?.fullName ?? 'Unassigned'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-surface-input dark:bg-dark-elevated flex items-center justify-center">
                  <User size={14} className="text-text-muted" />
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Created By</p>
                  <p className="text-xs font-semibold text-text-primary dark:text-text-inverted">
                    {selectedTask.createdBy?.fullName ?? 'Instructor / Admin'}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Assignee Recommendations */}
            <div className="border-t border-surface-border dark:border-dark-border pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                <UsersRound size={13} />
                AI Assignee Recommendations
              </h4>
              {loadingRecs ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {recommendations.map((rec) => {
                    const isAssigned = selectedTask.assignee?._id === rec.studentId;
                    return (
                      <div
                        key={rec.studentId}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border transition-all",
                          isAssigned
                            ? "bg-primary/5 border-primary/20 dark:bg-dark-primaryAccent/5 dark:border-dark-primaryAccent/20"
                            : "bg-surface-bg dark:bg-dark-elevated/20 border-surface-border dark:border-dark-border hover:border-primary/20"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar name={rec.name} size="sm" className="h-7 w-7 text-xs" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-text-primary dark:text-text-inverted">
                                {rec.name}
                              </span>
                              {rec.recommendation === 'Recommended' && (
                                <Badge variant="success" className="text-[8px] px-1 py-0 font-bold uppercase tracking-wider">
                                  Best Fit
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-text-muted">
                              <span>Match Score: {Math.round(rec.score * 100)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant={isAssigned ? 'ghost' : 'primary'}
                          size="xs"
                          onClick={() => handleAssignTask(rec.studentId)}
                          disabled={isAssigned || taskSubmitting}
                          className="text-[10px] px-2.5 py-1"
                        >
                          {isAssigned ? 'Assigned' : 'Assign'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic text-center py-4 mb-4">
                  No recommendations available.
                </p>
              )}
            </div>

            {/* Comments Section */}
            <div className="border-t border-surface-border dark:border-dark-border pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                <MessageSquare size={13} />
                Discussion ({selectedTask.comments?.length || 0})
              </h4>

              {/* Comment list */}
              <div className="space-y-3 max-h-40 overflow-y-auto mb-4 pr-1">
                {(selectedTask.comments || []).map((comment, idx) => (
                  <div key={comment._id ?? idx} className="flex gap-2.5 items-start bg-surface-bg dark:bg-dark-elevated/20 p-2.5 rounded-lg">
                    <Avatar name={comment.author?.fullName} size="sm" className="h-6 w-6 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-text-primary dark:text-text-inverted truncate">
                          {comment.author?.fullName}
                        </span>
                        <span className="text-[9px] text-text-muted">
                          {formatDate(comment.createdAt, 'relative')}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary dark:text-text-muted mt-0.5 whitespace-pre-wrap leading-normal">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))}
                {(selectedTask.comments || []).length === 0 && (
                  <p className="text-xs text-text-muted italic text-center py-4 bg-surface-bg dark:bg-dark-elevated/10 rounded-lg">
                    No comments posted yet. Start the conversation!
                  </p>
                )}
              </div>

              {/* Add Comment Box */}
              <form onSubmit={handleAddComment} className="flex gap-2 items-center mt-2">
                <input
                  type="text"
                  placeholder="Ask a question or log status..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className={cn(
                    'flex-1 text-xs px-3 py-2 rounded-lg border outline-none transition-colors',
                    'bg-surface-card border-surface-border text-text-primary placeholder:text-text-muted',
                    'dark:bg-dark-card dark:border-dark-border dark:text-text-inverted',
                    'focus:border-primary dark:focus:border-dark-primaryAccent'
                  )}
                  disabled={commentSubmitting}
                />
                <Button variant="primary" size="sm" type="submit" loading={commentSubmitting} disabled={!commentText.trim() || commentSubmitting}>
                  <Send size={12} />
                  Send
                </Button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Task Modal */}
      {createModalOpen && team && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
          }}
          title="Create New Task"
          size="md"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-text-muted mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                className="w-full text-xs px-3 py-2 rounded-lg border bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-text-muted mb-1">
                Description
              </label>
              <textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Enter task details/requirements..."
                rows={3}
                className="w-full text-xs px-3 py-2 rounded-lg border bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted focus:ring-1 focus:ring-primary outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary dark:text-text-muted mb-1">
                  Status
                </label>
                <select
                  value={newTaskStatus}
                  onChange={(e) => setNewTaskStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted focus:ring-1 focus:ring-primary outline-none"
                >
                  {['Backlog', 'To Do', 'In Progress', 'Under Review', 'Completed'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary dark:text-text-muted mb-1">
                  Priority
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted focus:ring-1 focus:ring-primary outline-none"
                >
                  {['Low', 'Medium', 'High'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary dark:text-text-muted mb-1">
                  Label
                </label>
                <select
                  value={newTaskLabel}
                  onChange={(e) => setNewTaskLabel(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted focus:ring-1 focus:ring-primary outline-none"
                >
                  {['Dev', 'Design', 'QA', 'Docs'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary dark:text-text-muted mb-1">
                  Assignee
                </label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Unassigned</option>
                  {(team.members || []).map((m) => {
                    const memberUser = m.user ?? m.userId ?? m;
                    const name = memberUser.fullName ?? memberUser.name ?? 'Member';
                    return (
                      <option key={memberUser._id ?? memberUser} value={memberUser._id ?? memberUser}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary dark:text-text-muted mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end border-t border-surface-border dark:border-dark-border pt-4 mt-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setCreateModalOpen(false)}
                disabled={taskSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                loading={taskSubmitting}
                disabled={!newTaskTitle.trim() || taskSubmitting}
              >
                Create Task
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </PageWrapper>
  );
}
