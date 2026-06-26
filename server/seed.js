/**
 * CollabCore Comprehensive Database Seeder
 * 
 * Creates fully connected mock data for testing:
 * - Coordinator, Mentors, and Students (assigned, unassigned, and with incomplete profiles)
 * - Projects with varying statuses
 * - Teams with assigned students, mentors, projects, and suitability scores
 * - Milestones (Completed, In Progress, Overdue) and submitted deliverables
 * - Kanban Tasks with comments, statuses, priorities, labels, and hours logged
 * - Evaluations with score breakdowns and tags
 * - Open Conflicts (Workload imbalance, Missing skills)
 * - Notifications for users
 * 
 * Run: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Team = require('./models/Team');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Milestone = require('./models/Milestone');
const Evaluation = require('./models/Evaluation');
const Conflict = require('./models/Conflict');
const Notification = require('./models/Notification');

async function seed() {
  try {
    let uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/collabcore';
    
    // Append database name if not present
    if (uri.includes('mongodb+srv://') && !uri.includes('.net/')) {
      uri = uri.replace('.net', '.net/collabcore');
    } else if (uri.includes('mongodb+srv://') && uri.endsWith('.net')) {
      uri += '/collabcore';
    }

    console.log(`Connecting to MongoDB: ${uri}`);
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB.\n');

    // 1. Clear all existing data
    console.log('Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      Team.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      Milestone.deleteMany({}),
      Evaluation.deleteMany({}),
      Conflict.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('✓ Cleared all collections successfully.\n');

    // 2. Seed Coordinator
    console.log('Seeding Coordinator...');
    const coordinator = await User.create({
      fullName: 'Admin Coordinator',
      email: 'coordinator@collabcore.com',
      password: 'Coord@123',
      role: 'coordinator',
      profileComplete: true,
      active: true,
    });
    console.log(`✓ Seeded Coordinator: ${coordinator.email}`);

    // 3. Seed Projects
    console.log('Seeding Projects...');
    const projectsData = [
      {
        title: 'CollabCore Collaboration Platform',
        description: 'An all-in-one portal for university students and coordinators to collaborate on group projects, track milestones, manage tasks, and conduct peer evaluations.',
        requiredSkills: ['React', 'Node.js', 'Express', 'MongoDB', 'TailwindCSS'],
        difficultyLevel: 'Medium',
        maxTeamsAllowed: 2,
        status: 'In Progress',
        createdBy: coordinator._id,
      },
      {
        title: 'AI-Powered Resume Screen & Parser',
        description: 'An automated system that parses uploaded PDF resumes, matches candidate profiles against custom job listings, and scores matching suitability using Natural Language Processing.',
        requiredSkills: ['Python', 'Flask', 'TensorFlow', 'React', 'NLP'],
        difficultyLevel: 'Hard',
        maxTeamsAllowed: 1,
        status: 'In Progress',
        createdBy: coordinator._id,
      },
      {
        title: 'Smart Agri-IoT Soil Monitoring System',
        description: 'IoT-enabled agricultural analytics platform utilizing ESP32 microcontroller sensors, MQTT data transmission protocols, and an interactive data visualization dashboard.',
        requiredSkills: ['C++', 'IoT', 'MQTT', 'Node-RED', 'Data Visualization'],
        difficultyLevel: 'Hard',
        maxTeamsAllowed: 1,
        status: 'Available',
        createdBy: coordinator._id,
      },
      {
        title: 'E-Commerce Microservices Architecture',
        description: 'A scalable web shop architecture separated into catalog, cart, order, and payment services using Node.js and Go microservices, Redis caching, and Docker/Kubernetes setups.',
        requiredSkills: ['Go', 'Docker', 'Kubernetes', 'gRPC', 'Redis'],
        difficultyLevel: 'Hard',
        maxTeamsAllowed: 2,
        status: 'Available',
        createdBy: coordinator._id,
      },
      {
        title: 'Online Interactive Code Sandbox',
        description: 'A browser-based editor that compiles and executes Python, JavaScript, and Java code securely within containerized sandboxes, providing real-time console feedback.',
        requiredSkills: ['React', 'Docker', 'WebSockets', 'Node.js', 'Bash'],
        difficultyLevel: 'Medium',
        maxTeamsAllowed: 1,
        status: 'Completed',
        createdBy: coordinator._id,
      },
    ];

    const projects = await Project.create(projectsData);
    console.log(`✓ Seeded ${projects.length} Projects.`);

    // 4. Seed Mentors
    console.log('Seeding Mentors...');
    const mentorsData = [
      {
        fullName: 'Dr. Sarah Mitchell',
        email: 'mentor@collabcore.com',
        password: 'Mentor@123',
        role: 'mentor',
        faculty: 'Computer Science & Engineering',
        profileComplete: true,
        active: true,
        bio: 'Associate Professor focusing on Software Engineering methodologies, HCI, and full-stack development patterns.',
      },
      {
        fullName: 'Prof. Charles Xavier',
        email: 'mentor2@collabcore.com',
        password: 'Mentor@123',
        role: 'mentor',
        faculty: 'Information Technology',
        profileComplete: true,
        active: true,
        bio: 'Senior Lecturer researching Machine Learning, Distributed Systems, and NLP pipelines.',
      },
    ];

    const mentors = await User.create(mentorsData);
    console.log(`✓ Seeded ${mentors.length} Mentors.`);

    // 5. Seed Students
    console.log('Seeding Students...');
    const studentsData = [
      {
        fullName: 'Alex Johnson',
        email: 'student@collabcore.com',
        password: 'Student@123',
        role: 'student',
        studentId: 'STU-2026-001',
        yearOfStudy: 3,
        faculty: 'Computer Science',
        profileComplete: true,
        active: true,
        bio: 'Frontend enthusiast and UI designer. Experienced with React and CSS animations.',
        skills: [
          { name: 'React', category: 'Frontend', proficiency: 'Advanced' },
          { name: 'TailwindCSS', category: 'Frontend', proficiency: 'Advanced' },
          { name: 'JavaScript', category: 'Frontend', proficiency: 'Intermediate' },
        ],
        softSkills: ['Communication', 'Teamwork', 'Detail-oriented'],
        preferredRole: 'UI/UX Designer',
        availabilityHours: 20,
        availableDays: ['Mon', 'Wed', 'Fri'],
        projectInterests: ['CollabCore Collaboration Platform', 'Online Interactive Code Sandbox'],
      },
      {
        fullName: 'Maria Chen',
        email: 'student2@collabcore.com',
        password: 'Student@123',
        role: 'student',
        studentId: 'STU-2026-002',
        yearOfStudy: 3,
        faculty: 'Computer Science',
        profileComplete: true,
        active: true,
        bio: 'Back-end engineer focusing on Node/Express RESTful APIs, database design, and caching.',
        skills: [
          { name: 'Node.js', category: 'Backend', proficiency: 'Advanced' },
          { name: 'Express', category: 'Backend', proficiency: 'Intermediate' },
          { name: 'MongoDB', category: 'Backend', proficiency: 'Intermediate' },
        ],
        softSkills: ['Problem Solving', 'Adaptability'],
        preferredRole: 'Software Developer',
        availabilityHours: 18,
        availableDays: ['Tue', 'Thu', 'Fri'],
        projectInterests: ['CollabCore Collaboration Platform', 'E-Commerce Microservices Architecture'],
      },
      {
        fullName: 'David Miller',
        email: 'student3@collabcore.com',
        password: 'Student@123',
        role: 'student',
        studentId: 'STU-2026-003',
        yearOfStudy: 4,
        faculty: 'Software Engineering',
        profileComplete: true,
        active: true,
        bio: 'Python developer interested in AI development, model training, and database integrations.',
        skills: [
          { name: 'Python', category: 'Backend', proficiency: 'Advanced' },
          { name: 'SQL', category: 'Backend', proficiency: 'Advanced' },
          { name: 'Git', category: 'DevOps', proficiency: 'Intermediate' },
        ],
        softSkills: ['Leadership', 'Analytical Thinking'],
        preferredRole: 'Project Manager',
        availabilityHours: 22,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu'],
        projectInterests: ['AI-Powered Resume Screen & Parser'],
      },
      {
        fullName: 'Emily Davis',
        email: 'student4@collabcore.com',
        password: 'Student@123',
        role: 'student',
        studentId: 'STU-2026-004',
        yearOfStudy: 4,
        faculty: 'Software Engineering',
        profileComplete: true,
        active: true,
        bio: 'Machine learning practitioner. Familiar with PyTorch, NLP, and model evaluation.',
        skills: [
          { name: 'Python', category: 'Backend', proficiency: 'Advanced' },
          { name: 'TensorFlow', category: 'Backend', proficiency: 'Intermediate' },
          { name: 'Figma', category: 'Design', proficiency: 'Beginner' },
        ],
        softSkills: ['Critical Thinking', 'Active Listening'],
        preferredRole: 'Software Developer',
        availabilityHours: 15,
        availableDays: ['Wed', 'Thu', 'Fri'],
        projectInterests: ['AI-Powered Resume Screen & Parser'],
      },
      {
        fullName: 'Ryan Garcia',
        email: 'student5@collabcore.com',
        password: 'Student@123',
        role: 'student',
        studentId: 'STU-2026-005',
        yearOfStudy: 2,
        faculty: 'Computer Science',
        profileComplete: false, // Incomplete profile to test the signup setup wizard!
        active: true,
      },
      {
        fullName: 'Sophia Wilson',
        email: 'student6@collabcore.com',
        password: 'Student@123',
        role: 'student',
        studentId: 'STU-2026-006',
        yearOfStudy: 3,
        faculty: 'Information Technology',
        profileComplete: true, // Complete but unassigned student to test student-without-team states!
        active: true,
        bio: 'DevOps learner, docker packaging, and automated scripting.',
        skills: [
          { name: 'Docker', category: 'DevOps', proficiency: 'Intermediate' },
          { name: 'Linux', category: 'DevOps', proficiency: 'Intermediate' },
        ],
        softSkills: ['Teamwork', 'Communication'],
        preferredRole: 'QA Tester',
        availabilityHours: 12,
        availableDays: ['Mon', 'Tue'],
        projectInterests: ['E-Commerce Microservices Architecture', 'Online Interactive Code Sandbox'],
      },
    ];

    const students = await User.create(studentsData);
    console.log(`✓ Seeded ${students.length} Students.`);

    const alex = students.find(s => s.email === 'student@collabcore.com');
    const maria = students.find(s => s.email === 'student2@collabcore.com');
    const david = students.find(s => s.email === 'student3@collabcore.com');
    const emily = students.find(s => s.email === 'student4@collabcore.com');
    const ryan = students.find(s => s.email === 'student5@collabcore.com');
    const sophia = students.find(s => s.email === 'student6@collabcore.com');
    const sarah = mentors.find(m => m.email === 'mentor@collabcore.com');
    const charles = mentors.find(m => m.email === 'mentor2@collabcore.com');

    // 6. Seed Teams
    console.log('Seeding Teams...');
    const teamsData = [
      {
        name: 'Team Alpha',
        members: [
          { user: alex._id, role: 'UI/UX Designer' },
          { user: maria._id, role: 'Software Developer' },
        ],
        assignedProject: projects[0]._id, // CollabCore Platform
        mentor: sarah._id,
        suitabilityScore: 88,
        status: 'Active',
        notes: 'Working on CollabCore Portal. Commendable backend-frontend skill pairing.',
      },
      {
        name: 'Team Beta',
        members: [
          { user: david._id, role: 'Project Manager' },
          { user: emily._id, role: 'Software Developer' },
        ],
        assignedProject: projects[1]._id, // AI Resume Scanner
        mentor: charles._id,
        suitabilityScore: 92,
        status: 'Active',
        notes: 'Working on AI Resume Parser. Strong Python background, lacking dedicated frontend resource.',
      },
    ];

    const teams = await Team.create(teamsData);
    console.log(`✓ Seeded ${teams.length} Teams.`);

    const teamAlpha = teams.find(t => t.name === 'Team Alpha');
    const teamBeta = teams.find(t => t.name === 'Team Beta');

    // 7. Update Users and Projects with Team relationships
    console.log('Linking Users and Projects with Teams...');
    await Promise.all([
      // Update students in Team Alpha
      User.findByIdAndUpdate(alex._id, { team: teamAlpha._id, assignedMentor: sarah._id }),
      User.findByIdAndUpdate(maria._id, { team: teamAlpha._id, assignedMentor: sarah._id }),
      // Update students in Team Beta
      User.findByIdAndUpdate(david._id, { team: teamBeta._id, assignedMentor: charles._id }),
      User.findByIdAndUpdate(emily._id, { team: teamBeta._id, assignedMentor: charles._id }),
      // Update Projects
      Project.findByIdAndUpdate(projects[0]._id, { assignedTeam: teamAlpha._id, status: 'In Progress' }),
      Project.findByIdAndUpdate(projects[1]._id, { assignedTeam: teamBeta._id, status: 'In Progress' }),
    ]);
    console.log('✓ References linked successfully.');

    // 8. Seed Milestones
    console.log('Seeding Milestones...');
    const milestoneDate = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const milestonesData = [
      // Team Alpha Milestones
      {
        name: 'System Requirements & Architecture',
        description: 'Compile the software requirements specification (SRS) and architecture schema.',
        team: teamAlpha._id,
        project: projects[0]._id,
        dueDate: milestoneDate(-15),
        status: 'Completed',
        order: 1,
        deliverable: {
          filename: 'CollabCore_SRS_v1.pdf',
          url: 'uploads/CollabCore_SRS_v1.pdf',
          submittedAt: milestoneDate(-16),
          submittedBy: alex._id,
        },
      },
      {
        name: 'Database Schema & Setup',
        description: 'Define Mongoose models, indexes, and connection logic.',
        team: teamAlpha._id,
        project: projects[0]._id,
        dueDate: milestoneDate(-5),
        status: 'Completed',
        order: 2,
        deliverable: {
          filename: 'CollabCore_DB_Design.pdf',
          url: 'uploads/CollabCore_DB_Design.pdf',
          submittedAt: milestoneDate(-6),
          submittedBy: maria._id,
        },
      },
      {
        name: 'Core API Controllers',
        description: 'Build backend handlers for authentication, teams, and project controllers.',
        team: teamAlpha._id,
        project: projects[0]._id,
        dueDate: milestoneDate(5),
        status: 'In Progress',
        order: 3,
      },
      {
        name: 'Frontend Routing & Views',
        description: 'Connect UI screens, set up state management and routing.',
        team: teamAlpha._id,
        project: projects[0]._id,
        dueDate: milestoneDate(25),
        status: 'Upcoming',
        order: 4,
      },

      // Team Beta Milestones
      {
        name: 'Dataset Formulation & Selection',
        description: 'Gather resumes, sanitize text, and define parser models.',
        team: teamBeta._id,
        project: projects[1]._id,
        dueDate: milestoneDate(-10),
        status: 'Completed',
        order: 1,
        deliverable: {
          filename: 'AI_Resume_Dataset_Proposal.pdf',
          url: 'uploads/AI_Resume_Dataset_Proposal.pdf',
          submittedAt: milestoneDate(-11),
          submittedBy: emily._id,
        },
      },
      {
        name: 'Parser Model Training',
        description: 'Train classifier model and build REST API endpoints.',
        team: teamBeta._id,
        project: projects[1]._id,
        dueDate: milestoneDate(-2), // Past due!
        status: 'Overdue',
        order: 2,
      },
      {
        name: 'Web Dashboard Mockup',
        description: 'Draft the frontend layout for uploading and scanning resumes.',
        team: teamBeta._id,
        project: projects[1]._id,
        dueDate: milestoneDate(15),
        status: 'Upcoming',
        order: 3,
      },
    ];

    const milestones = await Milestone.create(milestonesData);
    console.log(`✓ Seeded ${milestones.length} Milestones.`);

    const alphaM1 = milestones.find(m => m.name === 'System Requirements & Architecture');
    const alphaM2 = milestones.find(m => m.name === 'Database Schema & Setup');
    const alphaM3 = milestones.find(m => m.name === 'Core API Controllers');
    const betaM1 = milestones.find(m => m.name === 'Dataset Formulation & Selection');
    const betaM2 = milestones.find(m => m.name === 'Parser Model Training');

    // 9. Seed Kanban Tasks
    console.log('Seeding Kanban Tasks...');
    const tasksData = [
      // Team Alpha Tasks
      {
        title: 'Draft Figma User Profiles',
        description: 'Design the mockup screens for the student profile setup flow and coordinator dashboard panels.',
        team: teamAlpha._id,
        assignee: alex._id,
        createdBy: coordinator._id,
        status: 'Completed',
        priority: 'High',
        label: 'Design',
        dueDate: milestoneDate(-18),
        milestone: alphaM1._id,
        hoursLogged: 12,
        comments: [
          { author: maria._id, text: 'Great wireframes. Matches the light blue brand guidelines.', createdAt: milestoneDate(-17) },
          { author: sarah._id, text: 'Excellent visual heirarchy, approved.', createdAt: milestoneDate(-17) },
        ],
        subtasks: [
          { title: 'Figma mockups for Student Wizard', completed: true },
          { title: 'Review feedback with Coordinator', completed: true },
        ],
      },
      {
        title: 'Write User Schema & Rules',
        description: 'Implement the User schema with validators for skills, categories, and roles.',
        team: teamAlpha._id,
        assignee: maria._id,
        createdBy: maria._id,
        status: 'Completed',
        priority: 'High',
        label: 'Dev',
        dueDate: milestoneDate(-8),
        milestone: alphaM2._id,
        hoursLogged: 6,
        subtasks: [
          { title: 'Draft schema constraints', completed: true },
          { title: 'Write pre-save password hash hook', completed: true },
        ],
      },
      {
        title: 'Implement Auth Controllers',
        description: 'Write register, login, profile check, and JWT verification endpoints.',
        team: teamAlpha._id,
        assignee: maria._id,
        createdBy: coordinator._id,
        status: 'In Progress',
        priority: 'High',
        label: 'Dev',
        dueDate: milestoneDate(2),
        milestone: alphaM3._id,
        hoursLogged: 10,
        comments: [
          { author: alex._id, text: 'Let me know when the login endpoint is ready so I can test context auth state.', createdAt: milestoneDate(-1) },
        ],
        subtasks: [
          { title: 'JWT Sign & Verify functions', completed: true },
          { title: 'Validate request bodies', completed: false },
          { title: 'Reset OTP controllers', completed: false },
        ],
      },
      {
        title: 'Configure Jest Tests',
        description: 'Write mock unit tests for the MongoDB models.',
        team: teamAlpha._id,
        assignee: alex._id,
        createdBy: sarah._id,
        status: 'To Do',
        priority: 'Medium',
        label: 'QA',
        dueDate: milestoneDate(10),
        milestone: alphaM3._id,
        hoursLogged: 0,
        subtasks: [
          { title: 'Install packages & configure babel', completed: false },
          { title: 'User validation test suite', completed: false },
        ],
      },
      {
        title: 'Format API Documentation',
        description: 'Update README.md with detailed request and response payloads.',
        team: teamAlpha._id,
        assignee: alex._id,
        createdBy: alex._id,
        status: 'Backlog',
        priority: 'Low',
        label: 'Docs',
        dueDate: milestoneDate(14),
        hoursLogged: 0,
      },

      // Team Beta Tasks
      {
        title: 'Select ML Frameworks',
        description: 'Evaluate PyTorch vs TensorFlow performance constraints on large resume parses.',
        team: teamBeta._id,
        assignee: emily._id,
        createdBy: charles._id,
        status: 'Completed',
        priority: 'Medium',
        label: 'Dev',
        dueDate: milestoneDate(-12),
        milestone: betaM1._id,
        hoursLogged: 16,
        subtasks: [
          { title: 'Evaluate library dependency trees', completed: true },
          { title: 'Perform text parsing benchmark tests', completed: true },
        ],
      },
      {
        title: 'Build Parser RegEx Rules',
        description: 'Construct extraction rules to extract emails, phones, and university names.',
        team: teamBeta._id,
        assignee: emily._id,
        createdBy: david._id,
        status: 'In Progress',
        priority: 'High',
        label: 'Dev',
        dueDate: milestoneDate(-1), // Past due!
        milestone: betaM2._id,
        hoursLogged: 14,
        comments: [
          { author: charles._id, text: 'Ensure the regex checks for sparse spacing formats.', createdAt: milestoneDate(-3) },
        ],
        subtasks: [
          { title: 'Write parser tests', completed: false },
          { title: 'Email/Phone extraction rules', completed: true },
        ],
      },
      {
        title: 'Design Dashboard Home UI',
        description: 'Create frontend mockups for PDF file upload dropzone.',
        team: teamBeta._id,
        assignee: david._id,
        createdBy: david._id,
        status: 'To Do',
        priority: 'Medium',
        label: 'Design',
        dueDate: milestoneDate(8),
        hoursLogged: 2,
        subtasks: [
          { title: 'Create Tailwind drag-drop container mockup', completed: false },
        ],
      },
    ];

    const tasks = await Task.create(tasksData);
    console.log(`✓ Seeded ${tasks.length} Tasks.`);

    // 10. Seed Evaluations
    console.log('Seeding Evaluations...');
    const evaluationsData = [
      // Milestone 1 Evaluations for Team Alpha
      {
        student: alex._id,
        mentor: sarah._id,
        milestone: alphaM1._id,
        team: teamAlpha._id,
        technicalQuality: 88,
        collaboration: 95,
        taskCompletion: 100,
        innovation: 90,
        writtenFeedback: 'Alex excelled at coordinating the design systems and gathering requirements documentation. Communication has been top-notch.',
        strengthTags: ['User Experience', 'Proactivity', 'Written Communication'],
        improvementTags: ['Technical Architecture Depth'],
        status: 'Submitted',
        mark: 92,
      },
      {
        student: maria._id,
        mentor: sarah._id,
        milestone: alphaM1._id,
        team: teamAlpha._id,
        technicalQuality: 95,
        collaboration: 90,
        taskCompletion: 90,
        innovation: 85,
        writtenFeedback: 'Maria drafted a solid tech stack proposal and mapped database relationships clearly. Very consistent performance.',
        strengthTags: ['Backend Logic', 'Database Design', 'Technical Writing'],
        improvementTags: ['Visual Layout Input'],
        status: 'Submitted',
        mark: 92,
      },

      // Milestone 2 Evaluations (Draft)
      {
        student: alex._id,
        mentor: sarah._id,
        milestone: alphaM2._id,
        team: teamAlpha._id,
        technicalQuality: 75,
        collaboration: 85,
        taskCompletion: 80,
        innovation: 70,
        writtenFeedback: 'Alex supported the schema draft definitions, although the work was predominantly backend code led by Maria. Needs to balance contributions.',
        strengthTags: ['Cooperation'],
        improvementTags: ['Backend Coding Integration'],
        status: 'Draft', // Draft to show mentor edits and student hidden states!
        mark: 78,
      },

      // Team Beta Milestone 1
      {
        student: emily._id,
        mentor: charles._id,
        milestone: betaM1._id,
        team: teamBeta._id,
        technicalQuality: 92,
        collaboration: 90,
        taskCompletion: 95,
        innovation: 92,
        writtenFeedback: 'Emily performed exceptional research on classifier options and laid down high-quality training scripts.',
        strengthTags: ['Research Quality', 'Coding Skills'],
        improvementTags: ['Regular Task Syncs'],
        status: 'Submitted',
        mark: 93,
      },
    ];

    const evaluations = await Evaluation.create(evaluationsData);
    console.log(`✓ Seeded ${evaluations.length} Evaluations.`);

    // 11. Seed Conflicts
    console.log('Seeding Conflicts...');
    const conflictsData = [
      {
        team: teamAlpha._id,
        conflictType: 'Workload Imbalance',
        severity: 'Medium',
        description: 'Maria is currently leading both database setup and API development (16+ hours logged) while Alex focuses on wireframes and document updates. Work distribution needs adjustment to ensure both learn coding practices.',
        relatedUsers: [alex._id, maria._id],
        status: 'Open',
      },
      {
        team: teamBeta._id,
        conflictType: 'Missing Skills',
        severity: 'High',
        description: 'Both team members have high machine learning and Python capability but lack frontend React/Web experience. The team needs support in structuring their web-app dashboard.',
        relatedUsers: [david._id, emily._id],
        status: 'Open',
      },
    ];

    const conflicts = await Conflict.create(conflictsData);
    console.log(`✓ Seeded ${conflicts.length} Conflicts.`);

    // 12. Seed Notifications
    console.log('Seeding Notifications...');
    const notificationsData = [
      // Alex Notifications
      {
        recipient: alex._id,
        type: 'feedback',
        title: 'Evaluation Submitted',
        body: 'Dr. Sarah Mitchell submitted your evaluation for Milestone 1.',
        read: false,
        link: '/student/feedback',
      },
      {
        recipient: alex._id,
        type: 'task',
        title: 'New Task Assigned',
        body: 'You have been assigned to: "Configure Jest Tests".',
        read: true,
        link: '/student/tasks',
      },
      // Mentor Sarah Notifications
      {
        recipient: sarah._id,
        type: 'alert',
        title: 'Conflict Flagged',
        body: 'A workload imbalance conflict has been auto-flagged for Team Alpha.',
        read: false,
        link: '/mentor/conflicts',
      },
      // Coordinator Notifications
      {
        recipient: coordinator._id,
        type: 'evaluation',
        title: 'Milestone Deliverable Submitted',
        body: 'Team Alpha uploaded "CollabCore_DB_Design.pdf" for Milestone 2.',
        read: false,
        link: '/coordinator/projects',
      },
    ];

    const notifications = await Notification.create(notificationsData);
    console.log(`✓ Seeded ${notifications.length} Notifications.`);

    console.log('\n============================================================');
    console.log('         CollabCore Testing Seed Data Summary');
    console.log('============================================================');
    console.log('  COORDINATOR ACCOUNT:');
    console.log('  - Email:    coordinator@collabcore.com');
    console.log('  - Password: Coord@123');
    console.log('  - Role:     coordinator');
    console.log('------------------------------------------------------------');
    console.log('  MENTOR ACCOUNTS:');
    console.log('  - Email:    mentor@collabcore.com   (Dr. Sarah Mitchell - CSE)');
    console.log('  - Email:    mentor2@collabcore.com  (Prof. Charles Xavier - IT)');
    console.log('  - Password: Mentor@123');
    console.log('  - Role:     mentor');
    console.log('------------------------------------------------------------');
    console.log('  STUDENT ACCOUNTS:');
    console.log('  - Email:    student@collabcore.com  (Alex Johnson - Team Alpha)');
    console.log('  - Email:    student2@collabcore.com (Maria Chen - Team Alpha)');
    console.log('  - Email:    student3@collabcore.com (David Miller - Team Beta)');
    console.log('  - Email:    student4@collabcore.com (Emily Davis - Team Beta)');
    console.log('  - Email:    student5@collabcore.com (Ryan Garcia - Profile Incomplete)');
    console.log('  - Email:    student6@collabcore.com (Sophia Wilson - Profile Complete, Unassigned)');
    console.log('  - Password: Student@123');
    console.log('  - Role:     student');
    console.log('============================================================\n');

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
