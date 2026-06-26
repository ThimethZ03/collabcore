const { body, query, validationResult } = require('express-validator');
const { User, Team, Project, Task, Milestone, Evaluation, Conflict, Notification } = require('../models');
const { sendTempPasswordEmail } = require('../utils/email');
const { predictTeamQuality, formatMembersForML } = require('../utils/mlClient');
const { scoreGroup } = require('../services/TeamFormationEngine');

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
 * GET /api/v1/users
 * Paginated users list — Coordinator only
 */
const getUsers = async (req, res, next) => {
  try {
    const {
      role,
      faculty,
      yearOfStudy,
      teamStatus,
      search,
      sortBy = 'createdAt',
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { active: { $ne: false } };

    if (req.user.role === 'student') {
      filter.role = 'student';
    } else if (role) {
      filter.role = role;
    }
    if (faculty) filter.faculty = faculty;
    if (yearOfStudy) filter.yearOfStudy = Number(yearOfStudy);

    if (teamStatus === 'assigned') filter.team = { $ne: null };
    // Use $in: [null] to match both explicit null AND missing (undefined) team fields
    else if (teamStatus === 'unassigned') filter.team = { $in: [null] };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    // Allow up to 500 for student role dropdown fetches (unassigned students list)
    const maxLimit = req.user.role === 'student' ? 500 : 100;
    const limitNum = Math.min(maxLimit, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    if (sortBy.startsWith('-')) {
      sortObj[sortBy.substring(1)] = -1;
    } else {
      sortObj[sortBy] = 1;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('team', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/:id
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('team')
      .populate('assignedMentor', 'fullName email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Access control: coordinator can see all, mentor can see their students, student can see self
    if (req.user.role === 'student' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user',
      });
    }

    if (req.user.role === 'mentor') {
      // Mentor can see users assigned to them or in their teams
      const mentorTeams = await Team.find({ mentor: req.user._id });
      const memberIds = mentorTeams.flatMap((t) =>
        t.members.map((m) => m.user.toString())
      );
      if (
        req.user._id.toString() !== user._id.toString() &&
        !memberIds.includes(user._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this user',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/:id
 */
const updateUserValidation = [
  body('faculty').optional({ checkFalsy: true }).isString(),
  body('yearOfStudy').optional({ checkFalsy: true }).isIn([1, 2, 3, 4]),
];

const updateUser = async (req, res, next) => {
  try {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let updates = {};

    if (req.user.role === 'coordinator') {
      // Coordinator can update faculty, yearOfStudy, role
      const allowedCoord = ['faculty', 'yearOfStudy', 'role', 'assignedMentor', 'active'];
      for (const field of allowedCoord) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
    } else if (req.user._id.toString() === req.params.id) {
      // Student/mentor updating own profile
      const allowedSelf = [
        'phone', 'bio', 'skills', 'softSkills', 'preferredRole',
        'availabilityHours', 'availableDays', 'projectInterests',
        'preferredTopics', 'avatar', 'faculty', 'yearOfStudy',
      ];
      for (const field of allowedSelf) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('team', 'name');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/users/:id — Cascade hard delete
 */
const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 1. Recalculate suitability & ML scores for any team this user was part of
    const affectedTeams = await Team.find({ 'members.user': userId });
    for (const team of affectedTeams) {
      team.members = team.members.filter(m => m.user.toString() !== userId);
      
      const newMemberIds = team.members.map(m => m.user.toString());
      if (newMemberIds.length > 0) {
        const users = await User.find({ _id: { $in: newMemberIds } });
        const scores = scoreGroup(users);
        team.suitabilityScore = scores.suitabilityScore;

        try {
          const membersWithRoles = users.map(u => {
            const matchingMember = team.members.find(m => m.user.toString() === u._id.toString());
            return { user: u, role: matchingMember ? matchingMember.role : '' };
          });
          const memberPayload = formatMembersForML(membersWithRoles);
          const ml = await predictTeamQuality(memberPayload, 0.7);
          team.mlScore = ml.score;
          team.mlLabel = ml.label;
        } catch (err) {
          console.warn('[ML Integration] Failed to enrich team with ML score on user deletion:', err.message);
        }
      } else {
        team.suitabilityScore = 0;
        team.mlScore = null;
        team.mlLabel = null;
      }
      
      await team.save();
    }

    // 2. Nullify assignee on Tasks assigned to this user
    await Task.updateMany(
      { assignee: userId },
      { $set: { assignee: null } }
    );

    // 3. Remove user references from Conflict relatedUsers
    await Conflict.updateMany(
      { relatedUsers: userId },
      { $pull: { relatedUsers: userId } }
    );

    // 4. Delete evaluations associated with this user (as student)
    await Evaluation.deleteMany({ student: userId });

    // 5. Delete notifications for this user
    await Notification.deleteMany({ recipient: userId });

    // 6. Delete the User record
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User and all related records deleted successfully from database',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/users/bulk-import
 */
const bulkImportValidation = [
  body().isArray().withMessage('Request body must be an array of users'),
];

const bulkImport = async (req, res, next) => {
  try {
    const users = Array.isArray(req.body) ? req.body : req.body.students;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body must contain a non-empty array of students/users',
      });
    }

    const existingEmails = new Set(await User.find({}).distinct('email'));
    const existingStudentIds = new Set(await User.find({ role: 'student' }).distinct('studentId'));

    const csvEmails = new Set();
    const csvStudentIds = new Set();
    const validUsers = [];
    const validationErrors = [];

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const rowNum = i + 1;
      const rowErrors = [];

      // Validate name
      if (!u.fullName || typeof u.fullName !== 'string' || u.fullName.trim() === '') {
        rowErrors.push('Full name is required');
      }

      // Validate email format and uniqueness
      if (!u.email || typeof u.email !== 'string') {
        rowErrors.push('Email is required');
      } else {
        const emailLower = u.email.trim().toLowerCase();
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(emailLower)) {
          rowErrors.push(`Invalid email format: "${u.email}"`);
        } else if (existingEmails.has(emailLower)) {
          rowErrors.push(`Email already registered in system: "${u.email}"`);
        } else if (csvEmails.has(emailLower)) {
          rowErrors.push(`Duplicate email in upload file: "${u.email}"`);
        } else {
          csvEmails.add(emailLower);
        }
      }

      // Default role to student
      const role = u.role || 'student';
      if (!['student', 'coordinator', 'mentor'].includes(role)) {
        rowErrors.push(`Invalid role: "${role}"`);
      }

      // Validate student ID for student role
      if (role === 'student') {
        if (!u.studentId || String(u.studentId).trim() === '') {
          rowErrors.push('Student ID is required');
        } else {
          const sid = String(u.studentId).trim();
          if (existingStudentIds.has(sid)) {
            rowErrors.push(`Student ID already exists in system: "${sid}"`);
          } else if (csvStudentIds.has(sid)) {
            rowErrors.push(`Duplicate Student ID in upload file: "${sid}"`);
          } else {
            csvStudentIds.add(sid);
          }
        }
      }

      // Validate yearOfStudy (optional, but if present must be 1-4)
      if (u.yearOfStudy !== undefined && u.yearOfStudy !== null && String(u.yearOfStudy).trim() !== '') {
        const y = Number(u.yearOfStudy);
        if (isNaN(y) || ![1, 2, 3, 4].includes(y)) {
          rowErrors.push(`Year of study must be 1, 2, 3, or 4 (received: "${u.yearOfStudy}")`);
        }
      }

      if (rowErrors.length > 0) {
        validationErrors.push({
          row: rowNum,
          student: u.fullName || u.email || `Row ${rowNum}`,
          errors: rowErrors,
        });
      } else {
        validUsers.push({
          fullName: u.fullName.trim(),
          email: u.email.trim().toLowerCase(),
          role,
          studentId: u.studentId ? String(u.studentId).trim() : undefined,
          faculty: u.faculty ? String(u.faculty).trim() : undefined,
          yearOfStudy: u.yearOfStudy ? Number(u.yearOfStudy) : undefined,
        });
      }
    }

    // If there are any validation errors, abort and return a clean report
    if (validationErrors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'CSV Validation Failed',
        errors: validationErrors,
      });
    }

    // All rows are valid, perform insertion
    const crypto = require('crypto');
    const bcrypt = require('bcryptjs');
    const prepared = [];

    for (const u of validUsers) {
      const tempPass = crypto.randomBytes(8).toString('hex');
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(tempPass, salt);
      prepared.push({
        ...u,
        password: hashedPassword,
        _tempPassword: tempPass,
      });
    }

    const docs = await User.insertMany(
      prepared.map(({ _tempPassword, ...rest }) => rest),
      { ordered: true }
    );

    // Send email with temp password to each user
    for (const u of prepared) {
      await sendTempPasswordEmail(u.email, u.fullName, u._tempPassword);
    }

    // Log temp passwords in dev mode
    if (process.env.NODE_ENV === 'development') {
      prepared.forEach((u) => {
        console.log(`[BULK] ${u.email} | Temp password: ${u._tempPassword}`);
      });
    }

    res.status(201).json({
      success: true,
      created: docs.length,
      message: `Successfully imported ${docs.length} users.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/stats/overview
 */
const getStatsOverview = async (req, res, next) => {
  try {
    const [totalStudents, teamsFormed, projectsRunning, openConflicts] =
      await Promise.all([
        User.countDocuments({ role: 'student', active: { $ne: false } }),
        Team.countDocuments(),
        Project.countDocuments({ status: 'In Progress' }),
        Conflict.countDocuments({ status: 'Open' }),
      ]);

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        teamsFormed,
        projectsRunning,
        openConflicts,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  updateUserValidation,
  deleteUser,
  bulkImport,
  bulkImportValidation,
  getStatsOverview,
};
