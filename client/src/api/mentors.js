import api from './axios';

export const getMentors = () =>
  api.get('/mentors');

export const getMentorTeams = (mentorId) =>
  api.get(`/mentors/${mentorId}/teams`);

export const assignTeamToMentor = (mentorId, teamId) =>
  api.patch(`/mentors/${mentorId}/assign-team/${teamId}`);
