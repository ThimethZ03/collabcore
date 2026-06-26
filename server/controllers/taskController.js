const { body, validationResult } = require('express-validator');
const { Task, Team, Notification, Project } = require('../models');
const { rankStudentsForTask, formatMembersForML } = require('../utils/mlClient');
const { detectConflicts } = require('../services/ConflictDetector');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return null;
};

/**
 * GET /api/v1/tasks
 */
const getTasks = async (req, res, next) => {
  try {
    const {
      team, assignee, status, priority, label, milestone,
      page = 1, limit = 50,
    } = req.query;

    const filter = {};

    // Role-based filtering
    if (req.user.role === 'student') {
      // Students see tasks for their team
      if (req.user.team) {
        filter.team = req.user.team;
      } else {
        filter.assignee = req.user._id;
      }
    } else if (req.user.role === 'mentor') {
      // Mentors see tasks for their teams
      const mentorTeams = await Team.find({ mentor: req.user._id });
      const teamIds = mentorTeams.map((t) => t._id);
      if (team && teamIds.some((id) => id.toString() === team)) {
        filter.team = team;
      } else {
        filter.team = { $in: teamIds };
      }
    } else {
      // Coordinator sees all
      if (team) filter.team = team;
    }

    if (assignee) filter.assignee = assignee;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (label) filter.label = label;
    if (milestone) filter.milestone = milestone;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignee', 'fullName email avatar')
        .populate('createdBy', 'fullName')
        .populate('milestone', 'name')
        .populate('team', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/tasks
 */
const createTaskValidation = [
  body('title').notEmpty().withMessage('Task title is required').trim(),
  body('team').notEmpty().withMessage('Team is required'),
  body('status')
    .optional()
    .isIn(['Backlog', 'To Do', 'In Progress', 'Under Review', 'Completed']),
  body('priority').optional().isIn(['High', 'Medium', 'Low']),
  body('label').optional().isIn(['Design', 'Dev', 'QA', 'Docs']),
];

const createTask = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const taskData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const task = await Task.create(taskData);

    // Notify assignee
    if (task.assignee) {
      await Notification.create({
        recipient: task.assignee,
        type: 'task',
        title: 'New Task Assigned',
        body: `You have been assigned a new task: "${task.title}"`,
        link: `/tasks/${task._id}`,
      });
    }

    const populated = await Task.findById(task._id)
      .populate('assignee', 'fullName email')
      .populate('createdBy', 'fullName')
      .populate('team', 'name');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tasks/:id
 */
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'fullName email avatar')
      .populate('createdBy', 'fullName email')
      .populate('team', 'name members')
      .populate('milestone', 'name dueDate status')
      .populate('comments.author', 'fullName avatar');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/tasks/:id
 */
const updateTaskValidation = [
  body('status')
    .optional()
    .isIn(['Backlog', 'To Do', 'In Progress', 'Under Review', 'Completed']),
  body('priority').optional().isIn(['High', 'Medium', 'Low']),
  body('label').optional().isIn(['Design', 'Dev', 'QA', 'Docs']),
];

const updateTask = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    let allowedFields;

    if (req.user.role === 'student') {
      // Assignee can update: status, hoursLogged, subtasks, assignee
      allowedFields = ['status', 'hoursLogged', 'subtasks', 'assignee'];
    } else {
      // Mentor/Coordinator can update all
      allowedFields = [
        'title', 'description', 'assignee', 'status', 'priority', 'label',
        'dueDate', 'milestone', 'subtasks', 'hoursLogged',
      ];
    }

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    }

    await task.save();

    // On complete: detect conflicts
    if (req.body.status === 'Completed' && task.team) {
      await detectConflicts(task.team);
    }

    const populated = await Task.findById(task._id)
      .populate('assignee', 'fullName email')
      .populate('createdBy', 'fullName')
      .populate('team', 'name');

    res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/tasks/:id/move — Kanban drag-drop
 */
const moveTaskValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['Backlog', 'To Do', 'In Progress', 'Under Review', 'Completed']),
];

const moveTask = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    )
      .populate('assignee', 'fullName email')
      .populate('team', 'name');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // On complete: detect conflicts
    if (req.body.status === 'Completed' && task.team) {
      await detectConflicts(task.team);
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/tasks/:id/comment
 */
const addCommentValidation = [
  body('text').notEmpty().withMessage('Comment text is required'),
];

const addComment = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.comments.push({
      author: req.user._id,
      text: req.body.text,
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('comments.author', 'fullName avatar');

    res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/tasks/:id/attach — File upload
 */
const addAttachment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    task.attachments.push({
      filename: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
    });

    await task.save();

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tasks/team/:teamId/kanban
 */
const getKanban = async (req, res, next) => {
  try {
    const tasks = await Task.find({ team: req.params.teamId })
      .populate('assignee', 'fullName email avatar')
      .populate('milestone', 'name')
      .sort({ priority: 1, createdAt: -1 });

    const kanban = {
      Backlog: tasks.filter((t) => t.status === 'Backlog'),
      'To Do': tasks.filter((t) => t.status === 'To Do'),
      'In Progress': tasks.filter((t) => t.status === 'In Progress'),
      'Under Review': tasks.filter((t) => t.status === 'Under Review'),
      Completed: tasks.filter((t) => t.status === 'Completed'),
    };

    res.status(200).json({
      success: true,
      data: kanban,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tasks/:id/recommendations
 */
const getTaskRecommendations = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!task.team) {
      return res.status(400).json({ success: false, message: 'Task is not assigned to any team' });
    }

    const team = await Team.findById(task.team).populate('members.user');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Build ML-compatible student payload with proper skill level conversion
    const studentsPayload = formatMembersForML(
      await Promise.all(
        team.members
          .filter(m => m.user)
          .map(async m => {
            const studentTasks = await Task.find({
              team: team._id,
              assignee: m.user._id,
              status: { $ne: 'Completed' },
            });
            const userObj = m.user.toObject ? m.user.toObject() : JSON.parse(JSON.stringify(m.user));
            userObj.taskCount = studentTasks.length;
            return { user: userObj, role: m.role || '' };
          })
      )
    );

    let requiredSkills = [];
    if (team.assignedProject) {
      const project = await Project.findById(team.assignedProject);
      if (project && project.requiredSkills) {
        requiredSkills = project.requiredSkills.map((name) => ({ name, minLevel: 3 }));
      }
    }

    const taskPayload = {
      requiredSkills,
      urgency: task.priority === 'High' ? 5 : task.priority === 'Low' ? 1 : 3,
    };

    const recommendations = await rankStudentsForTask(studentsPayload, taskPayload);

    res.status(200).json({
      success: true,
      data: recommendations.rankings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  createTask,
  createTaskValidation,
  getTask,
  updateTask,
  updateTaskValidation,
  moveTask,
  moveTaskValidation,
  addComment,
  addCommentValidation,
  addAttachment,
  deleteTask,
  getKanban,
  getTaskRecommendations,
};
