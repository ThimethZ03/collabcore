const { User, Team, Project, Task, Conflict, Milestone } = require('../models');
const { detectTeamRisk, formatMembersForML } = require('../utils/mlClient');

// GET /api/v1/analytics/overview
exports.getOverview = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student', active: { $ne: false } });
    const teamsFormed = await Team.countDocuments();
    const projectsAssigned = await Project.countDocuments({ status: 'In Progress' });
    const activeConflicts = await Conflict.countDocuments({ status: 'Open' });

    const teams = await Team.find();
    const avgTeamScore = teams.length > 0
      ? Math.round(teams.reduce((sum, t) => sum + (t.suitabilityScore || 0), 0) / teams.length)
      : 0;

    res.json({
      success: true,
      data: { totalStudents, teamsFormed, projectsAssigned, avgTeamScore, activeConflicts },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/skill-distribution
exports.getSkillDistribution = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student', active: { $ne: false } });
    const skillMap = {};

    students.forEach(s => {
      if (s.skills && s.skills.length > 0) {
        s.skills.forEach(skill => {
          skillMap[skill.name] = (skillMap[skill.name] || 0) + 1;
        });
      }
    });

    const data = Object.entries(skillMap)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/role-coverage
exports.getRoleCoverage = async (req, res, next) => {
  try {
    const requiredRoles = ['Project Manager', 'Software Developer', 'UI/UX Designer', 'QA Tester', 'Business Analyst'];
    const teams = await Team.find().populate('members.user', 'preferredRole');
    const totalTeams = teams.length;

    const data = requiredRoles.map(role => {
      const count = teams.filter(team =>
        team.members.some(m => m.role === role || (m.user && m.user.preferredRole === role))
      ).length;
      return { role, count, total: totalTeams };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/task-completion-by-team
exports.getTaskCompletionByTeam = async (req, res, next) => {
  try {
    const teams = await Team.find({}, 'name');
    const data = await Promise.all(
      teams.map(async team => {
        const tasks = await Task.find({ team: team._id });
        return {
          team: team.name,
          teamId: team._id,
          completed: tasks.filter(t => t.status === 'Completed').length,
          inProgress: tasks.filter(t => t.status === 'In Progress' || t.status === 'Under Review').length,
          backlog: tasks.filter(t => t.status === 'Backlog' || t.status === 'To Do').length,
          total: tasks.length,
        };
      })
    );

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/team-progress-over-time
exports.getTeamProgressOverTime = async (req, res, next) => {
  try {
    const weeks = parseInt(req.query.weeks) || 8;
    const teams = await Team.find({}, 'name');
    const now = new Date();
    const data = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekLabel = `Week ${weeks - i}`;
      const teamData = await Promise.all(
        teams.map(async team => {
          const totalTasks = await Task.countDocuments({
            team: team._id,
            createdAt: { $lte: weekEnd },
          });
          const completedTasks = await Task.countDocuments({
            team: team._id,
            status: 'Completed',
            updatedAt: { $lte: weekEnd },
          });
          const completionPercent = totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;
          return { name: team.name, completionPercent };
        })
      );

      data.push({ week: weekLabel, teams: teamData });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/skill-gaps
exports.getSkillGaps = async (req, res, next) => {
  try {
    const teams = await Team.find()
      .populate('members.user', 'skills')
      .populate('assignedProject', 'requiredSkills title');

    const data = teams
      .filter(team => team.assignedProject)
      .map(team => {
        const teamSkills = new Set();
        team.members.forEach(m => {
          if (m.user && m.user.skills) {
            m.user.skills.forEach(s => teamSkills.add(s.name.toLowerCase()));
          }
        });

        const requiredSkills = team.assignedProject.requiredSkills || [];
        const missingSkills = requiredSkills.filter(
          s => !teamSkills.has(s.toLowerCase())
        );

        let severity = 'Low';
        const missingRatio = requiredSkills.length > 0
          ? missingSkills.length / requiredSkills.length
          : 0;
        if (missingRatio > 0.5) severity = 'High';
        else if (missingRatio > 0.25) severity = 'Medium';

        return {
          team: team.name,
          teamId: team._id,
          project: team.assignedProject.title,
          missingSkills,
          severity,
        };
      });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/analytics/risk-scan
exports.triggerRiskScan = async (req, res, next) => {
  try {
    const teams = await Team.find().populate('members.user');
    const results = [];

    for (const team of teams) {
      const tasks = await Task.find({ team: team._id });
      const milestones = await Milestone.find({ team: team._id });
      const missedMilestones = milestones.filter(m => m.status === 'Overdue').length;

      let daysSinceCommit = 10;
      if (tasks.length > 0) {
        const sortedTasks = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt);
        const lastUpdated = sortedTasks[0].updatedAt;
        const diff = Date.now() - new Date(lastUpdated).getTime();
        daysSinceCommit = Math.floor(diff / (1000 * 60 * 60 * 24));
      }

      // Build ML-compatible member payload with proper skill level conversion
      const membersPayload = formatMembersForML(
        team.members
          .filter(m => m.user)
          .map(m => {
            const memberTasks = tasks.filter(t => t.assignee && t.assignee.toString() === m.user._id.toString());
            // Attach taskCount so formatMembersForML can pick it up
            const userWithTaskCount = Object.assign(Object.create(m.user), { taskCount: memberTasks.length });
            return { user: userWithTaskCount, role: m.role || '' };
          })
      );

      if (membersPayload.length === 0) continue;

      const risk = await detectTeamRisk(membersPayload, 0.7, {
        days_since_last_commit: daysSinceCommit,
        missed_milestones: missedMilestones,
        avg_response_time_hours: 12,
      });

      team.riskLevel = risk.risk_level;
      team.riskScore = risk.risk_score;
      team.riskFlags = risk.flags;
      await team.save();

      if (risk.risk_level === 'High') {
        const conflictType = missedMilestones > 0 ? 'Delayed Milestone' : 'Low Participation';
        await Conflict.findOneAndUpdate(
          { team: team._id, status: 'Open', conflictType },
          {
            team: team._id,
            conflictType,
            severity: 'High',
            description: `ML Early Risk Warning (Risk Score: ${risk.risk_score}%). Flags: ${risk.flags.join(', ')}`,
            relatedUsers: membersPayload.map(m => m._id),
            status: 'Open',
          },
          { upsert: true, new: true }
        );
      }

      results.push({
        team: team.name,
        riskLevel: risk.risk_level,
        riskScore: risk.risk_score,
        flags: risk.flags,
      });
    }

    res.json({
      success: true,
      message: 'Risk scan completed successfully',
      data: results,
    });
  } catch (err) {
    next(err);
  }
};
