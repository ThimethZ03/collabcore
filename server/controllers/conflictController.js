const { Conflict, Notification, User } = require('../models');

// GET /api/v1/conflicts
exports.getConflicts = async (req, res, next) => {
  try {
    const { team, type, severity, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (team) filter.team = team;
    if (type) filter.conflictType = type;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Conflict.countDocuments(filter);

    const conflicts = await Conflict.find(filter)
      .populate('team', 'name')
      .populate('relatedUsers', 'fullName email')
      .populate('resolvedBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: conflicts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: conflicts,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/conflicts/:id
exports.getConflictById = async (req, res, next) => {
  try {
    const conflict = await Conflict.findById(req.params.id)
      .populate('team', 'name members')
      .populate('relatedUsers', 'fullName email avatar')
      .populate('resolvedBy', 'fullName');

    if (!conflict) {
      return res.status(404).json({ success: false, message: 'Conflict not found' });
    }

    res.json({ success: true, data: conflict });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/conflicts/:id/resolve
exports.resolveConflict = async (req, res, next) => {
  try {
    const { resolutionNote } = req.body;

    const conflict = await Conflict.findById(req.params.id);
    if (!conflict) {
      return res.status(404).json({ success: false, message: 'Conflict not found' });
    }

    conflict.status = 'Resolved';
    conflict.resolvedAt = new Date();
    conflict.resolvedBy = req.user._id;
    conflict.resolutionNote = resolutionNote || '';
    await conflict.save();

    // Notify coordinators
    const coordinators = await User.find({ role: 'coordinator', active: { $ne: false } });
    await Promise.all(
      coordinators.map(coord =>
        Notification.create({
          recipient: coord._id,
          type: 'alert',
          title: 'Conflict Resolved',
          body: `A "${conflict.conflictType}" conflict has been resolved by ${req.user.fullName}.`,
          link: '/coordinator/teams',
        })
      )
    );

    res.json({ success: true, data: conflict });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/conflicts/notify-coordinator
exports.notifyCoordinator = async (req, res, next) => {
  try {
    const { conflictId } = req.body;

    const conflict = await Conflict.findById(conflictId).populate('team', 'name');
    if (!conflict) {
      return res.status(404).json({ success: false, message: 'Conflict not found' });
    }

    const coordinators = await User.find({ role: 'coordinator', active: { $ne: false } });
    await Promise.all(
      coordinators.map(coord =>
        Notification.create({
          recipient: coord._id,
          type: 'alert',
          title: `Conflict Alert: ${conflict.conflictType}`,
          body: `${req.user.fullName} flagged a ${conflict.severity} severity "${conflict.conflictType}" conflict in team "${conflict.team.name}". ${conflict.description}`,
          link: '/coordinator/teams',
        })
      )
    );

    res.json({ success: true, message: 'Coordinators notified successfully' });
  } catch (err) {
    next(err);
  }
};
