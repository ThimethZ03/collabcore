/**
 * server/utils/mlClient.js
 * ─────────────────────────
 * HTTP client for the CollabCore ML microservice.
 * Called from teamController.js, taskController.js, and analyticsController.js.
 *
 * All functions degrade gracefully — if the ML service is down,
 * they return { score: null, label: 'Unknown' } so the app still works.
 */

const axios = require('axios');

const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT = 6000;  // 6 seconds

/** @param {string} path  @param {object} body */
async function mlPost(path, body) {
  try {
    const res = await axios.post(`${ML_BASE}${path}`, body, { timeout: TIMEOUT });
    return res.data;
  } catch (err) {
    const status = err.response?.status ?? 'NO_RESPONSE';
    console.warn(`[ML] POST ${path} failed (${status}):`, err.message);
    return null;
  }
}


// ─── 1. Team Quality ──────────────────────────────────────────────────────────

/**
 * Predict whether a team composition is likely to succeed.
 *
 * @param {Array<{skills, role, taskCount, availability}>} members
 * @param {number} availabilityOverlap  0-1
 * @returns {Promise<{score: number|null, label: string, confidence: number|null}>}
 *
 * Usage (teamController.js):
 *   const ml = await predictTeamQuality(team.members, 0.75);
 *   team.mlScore = ml.score;
 *   team.mlLabel = ml.label;
 */
async function predictTeamQuality(members, availabilityOverlap = 0.7) {
  const result = await mlPost('/predict/team-quality', {
    members,
    availability_overlap: availabilityOverlap,
  });
  return result ?? { score: null, label: 'Unknown', confidence: null };
}


// ─── 2. Task Assignment ────────────────────────────────────────────────────────

/**
 * Rank a list of students for a given task.
 *
 * @param {Array<object>} students  — array of user documents with skills
 * @param {{ requiredSkills: Array, urgency: number }} task
 * @returns {Promise<{rankings: Array<{studentId, name, score, recommendation}>}>}
 *
 * Usage (taskController.js):
 *   const { rankings } = await rankStudentsForTask(eligibleStudents, task);
 *   // rankings[0] is the top pick
 */
async function rankStudentsForTask(students, task) {
  const result = await mlPost('/predict/task-assignment', { students, task });
  return result ?? { rankings: students.map(s => ({
    studentId:      s._id?.toString(),
    name:           s.name,
    score:          0,
    recommendation: 'Available',
  }))};
}


// ─── 3. Risk Detection ────────────────────────────────────────────────────────

/**
 * Detect whether a team is at risk.
 *
 * @param {Array<object>}   members
 * @param {number}          availabilityOverlap
 * @param {{days_since_last_commit?, missed_milestones?, avg_response_time_hours?}} extraContext
 * @returns {Promise<{risk_level: string, risk_score: number, flags: string[]}>}
 *
 * Usage (analyticsController.js):
 *   const risk = await detectTeamRisk(team.members, team.availabilityOverlap, {
 *     days_since_last_commit: daysSinceCommit,
 *     missed_milestones: team.missedMilestones,
 *   });
 *   if (risk.risk_level === 'High') { /* create Conflict doc *\/ }
 */
async function detectTeamRisk(members, availabilityOverlap = 0.7, extraContext = null) {
  const body = {
    members,
    availability_overlap: availabilityOverlap,
  };
  if (extraContext) body.extra_context = extraContext;

  const result = await mlPost('/predict/risk', body);
  return result ?? { risk_level: 'Unknown', risk_score: null, flags: [] };
}


// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * Check if the ML service is reachable and models are loaded.
 * @returns {Promise<boolean>}
 */
async function isMlServiceHealthy() {
  try {
    const res = await axios.get(`${ML_BASE}/health`, { timeout: 3000 });
    return res.data?.models_loaded === true;
  } catch {
    return false;
  }
}


module.exports = {
  predictTeamQuality,
  rankStudentsForTask,
  detectTeamRisk,
  isMlServiceHealthy,
};
