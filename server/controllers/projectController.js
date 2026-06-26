const { body, validationResult } = require('express-validator');
const { Project, Team } = require('../models');
const { similarity } = require('../utils/levenshtein');
const { runAllocation, previewAllocation } = require('../services/ProjectAllocator');
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
 * GET /api/v1/projects
 */
const getProjects = async (req, res, next) => {
  try {
    const { status, search, assignedTeam, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (assignedTeam) filter.assignedTeam = assignedTeam;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('assignedTeam', 'name status')
        .populate('createdBy', 'fullName')
        .populate('duplicateOf', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Project.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/projects
 */
const createProjectValidation = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('description').notEmpty().withMessage('Description is required'),
  body('difficultyLevel')
    .optional()
    .isIn(['Easy', 'Medium', 'Hard'])
    .withMessage('Invalid difficulty level'),
];

const createProject = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const projectData = {
      ...req.body,
      createdBy: req.user._id,
    };

    if (req.user.role === 'student') {
      if (!req.user.team) {
        return res.status(400).json({
          success: false,
          message: 'You must belong to an approved team before you can propose a project.',
        });
      }

      const studentTeam = await Team.findById(req.user.team._id || req.user.team);
      if (!studentTeam || studentTeam.status === 'Proposed') {
        return res.status(400).json({
          success: false,
          message: 'You cannot propose a project until your team proposal is approved by the coordinator.',
        });
      }

      projectData.status = 'Pending';
    }

    // Duplicate detection using Levenshtein distance
    const existingProjects = await Project.find({
      status: { $ne: 'Archived' },
    });

    let duplicateInfo = null;
    for (const existing of existingProjects) {
      const titleSim = similarity(req.body.title, existing.title);
      if (titleSim > 0.8) {
        duplicateInfo = {
          isDuplicate: true,
          duplicateOf: existing._id,
          similarTo: existing.title,
          similarity: Math.round(titleSim * 100),
        };
        projectData.isDuplicate = true;
        projectData.duplicateOf = existing._id;
        break;
      }
    }

    const project = await Project.create(projectData);

    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'fullName')
      .populate('duplicateOf', 'title');

    // Notify mentors instead of coordinators if proposed by a student
    if (req.user.role === 'student') {
      const User = require('../models/User');
      const Notification = require('../models/Notification');

      let mentorsToNotify = [];
      if (req.user.assignedMentor) {
        mentorsToNotify.push(req.user.assignedMentor);
      } else if (req.user.team) {
        const teamObj = await Team.findById(req.user.team);
        if (teamObj && teamObj.mentor) {
          mentorsToNotify.push(teamObj.mentor);
        }
      }

      // Fallback: notify all active mentors if student is not assigned to a mentor
      if (mentorsToNotify.length === 0) {
        const activeMentors = await User.find({ role: 'mentor', active: true });
        mentorsToNotify = activeMentors.map((m) => m._id);
      }

      for (const mentorId of mentorsToNotify) {
        await Notification.create({
          recipient: mentorId,
          type: 'alert',
          title: 'New Project Proposal',
          body: `Student ${req.user.fullName} has proposed a new project: "${project.title}".`,
          link: '/mentor/dashboard',
        });
      }
    }

    res.status(201).json({
      success: true,
      data: populatedProject,
      duplicateWarning: duplicateInfo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/projects/:id
 */
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('assignedTeam')
      .populate('createdBy', 'fullName email')
      .populate('preferenceList', 'name')
      .populate('duplicateOf', 'title');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/projects/:id
 */
const updateProjectValidation = [
  body('title').optional().isString().trim(),
  body('status')
    .optional()
    .isIn(['Pending', 'Available', 'In Progress', 'Completed', 'Archived', 'Rejected']),
  body('difficultyLevel').optional().isIn(['Easy', 'Medium', 'Hard']),
];

const updateProject = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const allowedFields = [
      'title', 'description', 'requiredSkills', 'difficultyLevel',
      'maxTeamsAllowed', 'submissionDeadline', 'status', 'preferenceList',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // Find original project to check if status transitions from Pending
    const originalProject = await Project.findById(req.params.id);
    if (!originalProject) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    let isAutoAssigned = false;
    let creatorTeamId = null;

    if (originalProject.status === 'Pending' && req.body.status === 'Available') {
      const User = require('../models/User');
      const creatorUser = await User.findById(originalProject.createdBy);
      if (creatorUser && creatorUser.role === 'student' && creatorUser.team) {
        updates.assignedTeam = creatorUser.team;
        updates.status = 'In Progress';
        isAutoAssigned = true;
        creatorTeamId = creatorUser.team;
      }
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('assignedTeam', 'name')
      .populate('createdBy', 'fullName');

    // Update Team and run conflict detection if auto-assigned
    if (isAutoAssigned && creatorTeamId) {
      await Team.findByIdAndUpdate(creatorTeamId, {
        $set: {
          assignedProject: project._id,
          status: 'Active',
        },
      });

      try {
        const { detectConflicts } = require('../services/ConflictDetector');
        await detectConflicts(creatorTeamId);
      } catch (err) {
        console.warn('[Conflict Detection] Failed on auto-assignment:', err.message);
      }
    }

    // Notification logic
    const Notification = require('../models/Notification');
    if (
      originalProject.status === 'Pending' &&
      req.body.status &&
      req.body.status !== 'Pending' &&
      project.createdBy
    ) {
      const isAccepted = req.body.status === 'Available' || isAutoAssigned;
      const isRejected = req.body.status === 'Rejected';

      if (isAccepted || isRejected) {
        await Notification.create({
          recipient: project.createdBy._id,
          type: 'alert',
          title: isAccepted ? 'Project Proposal Accepted' : 'Project Proposal Rejected',
          body: isAccepted
            ? `Your proposed project "${project.title}" has been accepted and assigned to your team.`
            : `Your proposed project "${project.title}" was not accepted.`,
          link: '/student/projects',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/projects/:id/assign-team
 */
const assignTeamValidation = [
  body('teamId').notEmpty().withMessage('Team ID is required'),
];

const assignTeam = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const { teamId } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Assign
    project.assignedTeam = teamId;
    project.status = 'In Progress';
    await project.save();

    team.assignedProject = project._id;
    team.status = 'Active';
    await team.save();

    // Trigger conflict detection
    const conflicts = await detectConflicts(teamId);

    const updatedProject = await Project.findById(project._id)
      .populate('assignedTeam', 'name members')
      .populate('createdBy', 'fullName');

    res.status(200).json({
      success: true,
      data: updatedProject,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/projects/allocation/run
 */
const runAllocationRoute = async (req, res, next) => {
  try {
    const result = await runAllocation();

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/projects/allocation/preview
 */
const previewAllocationRoute = async (req, res, next) => {
  try {
    const pairs = await previewAllocation();

    res.status(200).json({
      success: true,
      count: pairs.length,
      data: pairs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/projects/:id/archive
 */
const archiveProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { status: 'Archived' },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  createProject,
  createProjectValidation,
  getProject,
  updateProject,
  updateProjectValidation,
  assignTeam,
  assignTeamValidation,
  runAllocationRoute,
  previewAllocationRoute,
  archiveProject,
};
