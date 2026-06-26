const { User, Team } = require('../models');

/**
 * GET /api/v1/mentors
 * Get all mentors
 */
const getMentors = async (req, res, next) => {
  try {
    const mentors = await User.find({ role: 'mentor', active: { $ne: false } })
      .select('fullName email phone faculty bio avatar');

    res.status(200).json({
      success: true,
      count: mentors.length,
      data: mentors,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/mentors/:mentorId/teams
 * Get teams for a mentor
 */
const getMentorTeams = async (req, res, next) => {
  try {
    const { mentorId } = req.params;

    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== 'mentor') {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found',
      });
    }

    const teams = await Team.find({ mentor: mentorId })
      .populate('members.user', 'fullName email studentId')
      .populate('assignedProject', 'title status');

    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/mentors/:mentorId/assign-team/:teamId
 * Coordinator assigns a team to a mentor
 */
const assignTeamToMentor = async (req, res, next) => {
  try {
    const { mentorId, teamId } = req.params;

    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== 'mentor') {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found',
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Assign mentor to team
    team.mentor = mentorId;
    await team.save();

    // Update all team members to have this mentor assigned
    const memberIds = team.members.map((m) => m.user);
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $set: { assignedMentor: mentorId } }
    );

    // Send notifications to mentor and students
    const Notification = require('../models/Notification');

    await Notification.create({
      recipient: mentorId,
      type: 'system',
      title: 'New Team Assignment',
      body: `You have been assigned as the mentor for team "${team.name}".`,
      link: '/mentor/dashboard',
    });

    for (const studentId of memberIds) {
      await Notification.create({
        recipient: studentId,
        type: 'system',
        title: 'Mentor Assigned',
        body: `Mentor "${mentor.fullName}" has been assigned to your team "${team.name}".`,
        link: '/student/team',
      });
    }

    const updatedTeam = await Team.findById(teamId)
      .populate('members.user', 'fullName email')
      .populate('mentor', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Team assigned to mentor successfully',
      data: updatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMentors,
  getMentorTeams,
  assignTeamToMentor,
};
