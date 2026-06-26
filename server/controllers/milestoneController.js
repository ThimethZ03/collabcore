const { Milestone, Task, Team, Notification } = require('../models');

// GET /api/v1/milestones
exports.getMilestones = async (req, res, next) => {
  try {
    const { team, project, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (team) filter.team = team;
    if (project) filter.project = project;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Milestone.countDocuments(filter);
    const milestones = await Milestone.find(filter)
      .populate('team', 'name')
      .populate('project', 'title')
      .populate('deliverable.submittedBy', 'fullName')
      .sort({ order: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: milestones.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: milestones,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/milestones
exports.createMilestone = async (req, res, next) => {
  try {
    const { name, description, team, project, dueDate, order } = req.body;

    const milestone = await Milestone.create({
      name,
      description,
      team,
      project,
      dueDate,
      order,
    });

    res.status(201).json({ success: true, data: milestone });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/milestones/:id
exports.getMilestoneById = async (req, res, next) => {
  try {
    const milestone = await Milestone.findById(req.params.id)
      .populate('team', 'name members')
      .populate('project', 'title')
      .populate('deliverable.submittedBy', 'fullName email');

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    // Get linked task stats
    const tasks = await Task.find({ milestone: milestone._id });
    const taskStats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'Completed').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      completionPercent: tasks.length > 0
        ? Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100)
        : 0,
    };

    res.json({
      success: true,
      data: { ...milestone.toJSON(), taskStats },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/milestones/:id
exports.updateMilestone = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'description', 'dueDate', 'status', 'order'];
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const milestone = await Milestone.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    res.json({ success: true, data: milestone });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/milestones/:id/submit-deliverable
exports.submitDeliverable = async (req, res, next) => {
  try {
    const milestone = await Milestone.findById(req.params.id).populate('team');

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    // Verify user is a team member
    const isMember = milestone.team.members.some(
      m => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this team' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    milestone.deliverable = {
      filename: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      submittedAt: new Date(),
      submittedBy: req.user._id,
    };

    if (milestone.status === 'In Progress' || milestone.status === 'Upcoming') {
      milestone.status = 'Completed';
    }

    await milestone.save();

    // Notify mentor
    if (milestone.team.mentor) {
      await Notification.create({
        recipient: milestone.team.mentor,
        type: 'task',
        title: 'Deliverable Submitted',
        body: `A deliverable for milestone "${milestone.name}" has been submitted by ${req.user.fullName}.`,
        link: `/mentor/teams/${milestone.team._id}`,
      });
    }

    res.json({ success: true, data: milestone });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/milestones/team/:teamId/timeline
exports.getTeamTimeline = async (req, res, next) => {
  try {
    const milestones = await Milestone.find({ team: req.params.teamId })
      .populate('project', 'title')
      .populate('deliverable.submittedBy', 'fullName')
      .sort({ order: 1 });

    // Get task stats for each milestone
    const milestonesWithStats = await Promise.all(
      milestones.map(async milestone => {
        const tasks = await Task.find({ milestone: milestone._id });
        const taskStats = {
          total: tasks.length,
          completed: tasks.filter(t => t.status === 'Completed').length,
          inProgress: tasks.filter(t => t.status === 'In Progress').length,
          backlog: tasks.filter(t => t.status === 'Backlog').length,
          completionPercent: tasks.length > 0
            ? Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100)
            : 0,
        };
        return { ...milestone.toJSON(), taskStats };
      })
    );

    res.json({ success: true, data: milestonesWithStats });
  } catch (err) {
    next(err);
  }
};
