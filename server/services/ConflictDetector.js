const { Team, Task, Milestone, Conflict, Project } = require('../models');

/**
 * Detect conflicts for a given team
 * Creates Conflict documents and returns the array
 */
async function detectConflicts(teamId) {
  const conflicts = [];
  const team = await Team.findById(teamId)
    .populate('members.user', 'fullName skills')
    .populate('assignedProject', 'title requiredSkills');

  if (!team) return conflicts;

  // 1. Check missing skills vs project requirements
  if (team.assignedProject && team.assignedProject.requiredSkills) {
    const teamSkills = new Set();
    team.members.forEach((m) => {
      if (m.user && m.user.skills) {
        m.user.skills.forEach((s) => teamSkills.add(s.name.toLowerCase()));
      }
    });

    const requiredSkills = team.assignedProject.requiredSkills;
    const missingSkills = requiredSkills.filter(
      (s) => !teamSkills.has(s.toLowerCase())
    );

    if (missingSkills.length > 0) {
      const existing = await Conflict.findOne({
        team: teamId,
        conflictType: 'Missing Skills',
        status: 'Open',
      });
      if (!existing) {
        const conflict = await Conflict.create({
          team: teamId,
          conflictType: 'Missing Skills',
          severity: missingSkills.length > 2 ? 'High' : 'Medium',
          description: `Team is missing required skills: ${missingSkills.join(', ')}`,
          relatedUsers: team.members.map((m) => m.user._id || m.user),
        });
        conflicts.push(conflict);
      }
    }
  }

  // 2. Check workload imbalance (>60% tasks on one member)
  const tasks = await Task.find({ team: teamId });
  if (tasks.length > 0 && team.members.length > 1) {
    const taskCounts = {};
    team.members.forEach((m) => {
      const uid = (m.user._id || m.user).toString();
      taskCounts[uid] = 0;
    });

    tasks.forEach((t) => {
      if (t.assignee) {
        const aid = t.assignee.toString();
        if (taskCounts[aid] !== undefined) {
          taskCounts[aid]++;
        }
      }
    });

    const totalTasks = tasks.length;
    for (const [userId, count] of Object.entries(taskCounts)) {
      if (count / totalTasks > 0.6) {
        const existing = await Conflict.findOne({
          team: teamId,
          conflictType: 'Workload Imbalance',
          status: 'Open',
        });
        if (!existing) {
          const conflict = await Conflict.create({
            team: teamId,
            conflictType: 'Workload Imbalance',
            severity: 'Medium',
            description: `One member has ${count}/${totalTasks} tasks (>${Math.round(60)}%)`,
            relatedUsers: [userId],
          });
          conflicts.push(conflict);
        }
        break;
      }
    }
  }

  // 3. Check low participation (0 completed, >5 assigned)
  if (tasks.length > 0) {
    for (const member of team.members) {
      const uid = (member.user._id || member.user).toString();
      const memberTasks = tasks.filter(
        (t) => t.assignee && t.assignee.toString() === uid
      );
      const completedTasks = memberTasks.filter(
        (t) => t.status === 'Completed'
      );

      if (memberTasks.length > 5 && completedTasks.length === 0) {
        const existing = await Conflict.findOne({
          team: teamId,
          conflictType: 'Low Participation',
          status: 'Open',
          relatedUsers: uid,
        });
        if (!existing) {
          const conflict = await Conflict.create({
            team: teamId,
            conflictType: 'Low Participation',
            severity: 'High',
            description: `Member has ${memberTasks.length} assigned tasks but 0 completed`,
            relatedUsers: [uid],
          });
          conflicts.push(conflict);
        }
      }
    }
  }

  // 4. Check delayed milestones
  const milestones = await Milestone.find({
    team: teamId,
    dueDate: { $lt: new Date() },
    status: { $ne: 'Completed' },
  });

  for (const ms of milestones) {
    const existing = await Conflict.findOne({
      team: teamId,
      conflictType: 'Delayed Milestone',
      status: 'Open',
      description: { $regex: ms.name },
    });
    if (!existing) {
      const conflict = await Conflict.create({
        team: teamId,
        conflictType: 'Delayed Milestone',
        severity: 'High',
        description: `Milestone "${ms.name}" is past due date (${ms.dueDate.toISOString().split('T')[0]})`,
        relatedUsers: team.members.map((m) => m.user._id || m.user),
      });
      conflicts.push(conflict);
    }
  }

  return conflicts;
}

module.exports = { detectConflicts };
