/**
 * node_integration/controller_snippets.js
 * ─────────────────────────────────────────
 * Copy-paste snippets for your existing Express controllers.
 * Each snippet shows WHERE and HOW to add ML calls.
 *
 * ⚠  These are ADDITIONS to your existing code, not replacements.
 */

// ══════════════════════════════════════════════════════════════
//  SNIPPET A — teamController.js
//  After saving formed teams, score each one with ML
// ══════════════════════════════════════════════════════════════

const { predictTeamQuality } = require('../utils/mlClient');

// ADD THESE TWO LINES to your Team Mongoose model (models/Team.js):
//   mlScore: { type: Number,  default: null },
//   mlLabel: { type: String,  default: null },

// Inside your POST /formation/run handler, AFTER teams are saved:
async function enrichTeamsWithMLScore(savedTeams) {
  for (const team of savedTeams) {
    const populatedMembers = await team.populate('members').execPopulate?.()
      ?? (await (await team.populate('members')).members);

    const memberPayload = populatedMembers.map(m => ({
      _id:          m._id.toString(),
      name:         m.name,
      role:         m.role ?? '',
      skills:       m.skills ?? [],
      taskCount:    m.tasks?.length ?? 0,
      availability: 0.7,
    }));

    const ml = await predictTeamQuality(memberPayload, team.availabilityOverlap ?? 0.7);
    team.mlScore = ml.score;
    team.mlLabel = ml.label;
    await team.save();
  }
}


// ══════════════════════════════════════════════════════════════
//  SNIPPET B — taskController.js
//  When auto-assigning a task, rank eligible students first
// ══════════════════════════════════════════════════════════════

const { rankStudentsForTask } = require('../utils/mlClient');

// Replace your current random/round-robin assignment with:
async function assignTaskWithML(task, eligibleStudents) {
  const { rankings } = await rankStudentsForTask(
    eligibleStudents.map(s => ({
      _id:       s._id.toString(),
      name:      s.name,
      role:      s.role ?? '',
      skills:    s.skills ?? [],
      taskCount: s.tasks?.length ?? 0,
      availability: 0.75,
    })),
    {
      requiredSkills: task.requiredSkills ?? [],
      urgency:        task.priority === 'High' ? 5
                    : task.priority === 'Low'  ? 1 : 3,
    }
  );

  // Pick top-ranked student
  const best = rankings[0];
  if (!best) return null;

  task.assignedTo = best.studentId;
  task.mlAssignmentScore = best.score;
  await task.save();

  return best;
}


// ══════════════════════════════════════════════════════════════
//  SNIPPET C — analyticsController.js
//  Nightly risk scan — flag struggling teams
// ══════════════════════════════════════════════════════════════

const { detectTeamRisk }   = require('../utils/mlClient');
const Team                 = require('../models/Team');
const Conflict             = require('../models/Conflict');
const Notification         = require('../models/Notification');

// Run this as a cron job (e.g. every night at midnight):
async function nightlyRiskScan() {
  const activeTeams = await Team.find({ status: 'active' }).populate('members');

  for (const team of activeTeams) {
    const daysSinceCommit = computeDaysSinceLastCommit(team);  // your own helper

    const risk = await detectTeamRisk(
      team.members.map(m => ({
        _id:       m._id.toString(),
        name:      m.name,
        role:      m.role ?? '',
        skills:    m.skills ?? [],
        taskCount: m.tasks?.length ?? 0,
      })),
      team.availabilityOverlap ?? 0.7,
      {
        days_since_last_commit:  daysSinceCommit,
        missed_milestones:       team.missedMilestones ?? 0,
        avg_response_time_hours: team.avgResponseTime ?? 0,
      }
    );

    // Save risk to team document
    team.riskLevel = risk.risk_level;
    team.riskScore = risk.risk_score;
    team.riskFlags = risk.flags;
    await team.save();

    // If High risk → create a Conflict record + notify mentor
    if (risk.risk_level === 'High') {
      await Conflict.findOneAndUpdate(
        { teamId: team._id, resolved: false, type: 'ML_RISK' },
        {
          teamId:      team._id,
          type:        'ML_RISK',
          description: `ML detected high risk. Flags: ${risk.flags.join('; ')}`,
          riskScore:   risk.risk_score,
          resolved:    false,
        },
        { upsert: true, new: true }
      );

      await Notification.create({
        userId:  team.mentorId,
        message: `⚠ Team "${team.name}" flagged as HIGH RISK (score: ${risk.risk_score}). Flags: ${risk.flags.join(', ')}`,
        type:    'RISK_ALERT',
        teamId:  team._id,
      });
    }
  }

  console.log(`[Risk Scan] Completed for ${activeTeams.length} teams`);
}

// Helper — compute days since last task update (proxy for commit activity)
function computeDaysSinceLastCommit(team) {
  if (!team.lastActivityAt) return 999;
  const diff = Date.now() - new Date(team.lastActivityAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}


// ══════════════════════════════════════════════════════════════
//  SNIPPET D — Add to server/.env
// ══════════════════════════════════════════════════════════════
/*
  # ML Microservice
  ML_SERVICE_URL=http://localhost:8000
*/


// ══════════════════════════════════════════════════════════════
//  SNIPPET E — Optional: expose ML health in your /api/health route
// ══════════════════════════════════════════════════════════════

const { isMlServiceHealthy } = require('../utils/mlClient');

// In your health-check route handler:
async function fullHealthCheck(req, res) {
  const mlOk = await isMlServiceHealthy();
  res.json({
    api:      'ok',
    database: 'ok',   // check mongoose.connection.readyState === 1
    ml:       mlOk ? 'ok' : 'degraded',
  });
}

module.exports = {
  enrichTeamsWithMLScore,
  assignTaskWithML,
  nightlyRiskScan,
  fullHealthCheck,
};
