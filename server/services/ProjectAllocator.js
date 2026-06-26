const { Project, Team, Conflict } = require('../models');

/**
 * Score a (project, team) pair
 */
function scoreAllocation(project, team) {
  // Skill match score
  const requiredSkills = project.requiredSkills || [];
  const teamSkills = new Set();
  team.members.forEach((m) => {
    if (m.user && m.user.skills) {
      m.user.skills.forEach((s) => teamSkills.add(s.name.toLowerCase()));
    }
  });

  const overlap = requiredSkills.filter((s) =>
    teamSkills.has(s.toLowerCase())
  ).length;
  const skillMatchScore =
    requiredSkills.length > 0 ? (overlap / requiredSkills.length) * 100 : 50;

  // Preference score
  const preferenceScore =
    project.preferenceList &&
    project.preferenceList.some(
      (p) => p.toString() === team._id.toString()
    )
      ? 100
      : 0;

  // Fairness score (stub)
  const fairnessScore = 50;

  // Weighted allocation score
  const allocationScore = Math.round(
    skillMatchScore * 0.6 + preferenceScore * 0.3 + fairnessScore * 0.1
  );

  return {
    skillMatchScore: Math.round(skillMatchScore),
    preferenceScore,
    fairnessScore,
    allocationScore,
  };
}

/**
 * Run project allocation algorithm
 */
async function runAllocation() {
  // Get available projects and unassigned teams
  const projects = await Project.find({
    status: 'Available',
    assignedTeam: null,
  });

  const teams = await Team.find({
    assignedProject: null,
    status: { $in: ['Forming', 'Active'] },
  }).populate('members.user', 'skills');

  if (projects.length === 0 || teams.length === 0) {
    return {
      assigned: [],
      conflicts: [],
      message: 'No available projects or unassigned teams',
    };
  }

  // Score all (project, team) pairs
  const pairs = [];
  for (const project of projects) {
    for (const team of teams) {
      const scores = scoreAllocation(project, team);
      pairs.push({
        project,
        team,
        scores,
      });
    }
  }

  // Sort by allocation score descending
  pairs.sort((a, b) => b.scores.allocationScore - a.scores.allocationScore);

  // Greedy assignment
  const assignedProjects = new Set();
  const assignedTeams = new Set();
  const assignments = [];

  for (const pair of pairs) {
    const pid = pair.project._id.toString();
    const tid = pair.team._id.toString();

    if (!assignedProjects.has(pid) && !assignedTeams.has(tid)) {
      assignedProjects.add(pid);
      assignedTeams.add(tid);
      assignments.push(pair);
    }
  }

  // Persist assignments
  for (const { project, team } of assignments) {
    await Project.findByIdAndUpdate(project._id, {
      assignedTeam: team._id,
      status: 'In Progress',
    });
    await Team.findByIdAndUpdate(team._id, {
      assignedProject: project._id,
      status: 'Active',
    });
  }

  // Detect duplicate projects
  const allConflicts = [];
  const allProjects = await Project.find({ status: 'In Progress' });

  for (let i = 0; i < allProjects.length; i++) {
    for (let j = i + 1; j < allProjects.length; j++) {
      const titleA = allProjects[i].title.toLowerCase();
      const titleB = allProjects[j].title.toLowerCase();

      // Simple similarity check
      if (titleA === titleB || titleA.includes(titleB) || titleB.includes(titleA)) {
        // Mark duplicates
        await Project.findByIdAndUpdate(allProjects[j]._id, {
          isDuplicate: true,
          duplicateOf: allProjects[i]._id,
        });

        if (allProjects[j].assignedTeam) {
          const existing = await Conflict.findOne({
            team: allProjects[j].assignedTeam,
            conflictType: 'Duplicate Project',
            status: 'Open',
          });
          if (!existing) {
            const conflict = await Conflict.create({
              team: allProjects[j].assignedTeam,
              conflictType: 'Duplicate Project',
              severity: 'Medium',
              description: `Project "${allProjects[j].title}" appears to be a duplicate of "${allProjects[i].title}"`,
            });
            allConflicts.push(conflict);
          }
        }
      }
    }
  }

  return {
    assigned: assignments.map((a) => ({
      project: { _id: a.project._id, title: a.project.title },
      team: { _id: a.team._id, name: a.team.name },
      scores: a.scores,
    })),
    conflicts: allConflicts,
  };
}

/**
 * Preview allocation scores without committing
 */
async function previewAllocation() {
  const projects = await Project.find({
    status: 'Available',
    assignedTeam: null,
  });

  const teams = await Team.find({
    assignedProject: null,
    status: { $in: ['Forming', 'Active'] },
  }).populate('members.user', 'skills');

  const pairs = [];
  for (const project of projects) {
    for (const team of teams) {
      const scores = scoreAllocation(project, team);
      pairs.push({
        project: { _id: project._id, title: project.title },
        team: { _id: team._id, name: team.name },
        scores,
      });
    }
  }

  pairs.sort((a, b) => b.scores.allocationScore - a.scores.allocationScore);

  return pairs;
}

module.exports = { runAllocation, previewAllocation, scoreAllocation };
