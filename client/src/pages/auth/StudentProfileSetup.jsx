import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../../components/common';
import {
  User, Code, Heart, Calendar, CheckCircle, ChevronRight,
  ChevronLeft, Check, Phone, Building, GraduationCap, X, Plus,
  Briefcase, Palette, Bug, BarChart3, Users as UsersIcon, Lightbulb,
} from 'lucide-react';

const SKILLS_DATA = {
  Frontend: ['React', 'Angular', 'Vue', 'HTML/CSS', 'JavaScript', 'TypeScript', 'Svelte', 'Next.js'],
  Backend: ['Node.js', 'Python', 'Java', 'C#', 'PHP', 'Ruby', 'Go', 'Rust'],
  Database: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase', 'SQLite'],
  Mobile: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Ionic'],
  DevOps: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'CI/CD', 'Linux', 'Nginx'],
  Testing: ['Jest', 'Selenium', 'Cypress', 'JUnit', 'PyTest'],
  Design: ['Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator'],
};

const SOFT_SKILLS = [
  'Leadership', 'Communication', 'Problem Solving', 'Time Management',
  'Teamwork', 'Creativity', 'Adaptability', 'Critical Thinking',
  'Conflict Resolution', 'Presentation',
];

const ROLES = [
  { value: 'Project Manager', icon: Briefcase, desc: 'Lead the team, manage timelines and deliverables' },
  { value: 'Software Developer', icon: Code, desc: 'Build and implement core application features' },
  { value: 'UI/UX Designer', icon: Palette, desc: 'Design user interfaces and experience flows' },
  { value: 'QA Tester', icon: Bug, desc: 'Ensure quality through testing and bug tracking' },
  { value: 'Business Analyst', icon: BarChart3, desc: 'Analyze requirements and bridge stakeholders' },
  { value: 'No Preference', icon: UsersIcon, desc: 'Open to any role based on team needs' },
];

const FACULTIES = [
  'Computer Science', 'Information Technology', 'Software Engineering',
  'Electrical Engineering', 'Mechanical Engineering', 'Business Administration',
  'Data Science', 'Cybersecurity', 'Other',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STEPS = [
  { label: 'Personal Info', icon: User },
  { label: 'Technical Skills', icon: Code },
  { label: 'Soft Skills & Role', icon: Heart },
  { label: 'Availability', icon: Calendar },
  { label: 'Review & Submit', icon: CheckCircle },
];

export default function StudentProfileSetup() {
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [skillCategory, setSkillCategory] = useState('Frontend');

  // Form state
  const [formData, setFormData] = useState({
    phone: user?.phone || '',
    yearOfStudy: user?.yearOfStudy || '',
    faculty: user?.faculty || '',
    skills: user?.skills || [],
    softSkills: user?.softSkills || [],
    preferredRole: user?.preferredRole || '',
    availabilityHours: user?.availabilityHours || 20,
    availableDays: user?.availableDays || [],
    projectInterests: user?.projectInterests || [],
    preferredTopics: user?.preferredTopics || '',
  });

  const [interestInput, setInterestInput] = useState('');

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Skill toggle
  const toggleSkill = (skillName, category) => {
    setFormData(prev => {
      const exists = prev.skills.find(s => s.name === skillName);
      if (exists) {
        return { ...prev, skills: prev.skills.filter(s => s.name !== skillName) };
      }
      return {
        ...prev,
        skills: [...prev.skills, { name: skillName, category, proficiency: 'Beginner' }],
      };
    });
  };

  const updateProficiency = (skillName, proficiency) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map(s => s.name === skillName ? { ...s, proficiency } : s),
    }));
  };

  const toggleSoftSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      softSkills: prev.softSkills.includes(skill)
        ? prev.softSkills.filter(s => s !== skill)
        : [...prev.softSkills, skill],
    }));
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !formData.projectInterests.includes(trimmed)) {
      updateField('projectInterests', [...formData.projectInterests, trimmed]);
      setInterestInput('');
    }
  };

  const removeInterest = (interest) => {
    updateField('projectInterests', formData.projectInterests.filter(i => i !== interest));
  };

  // Step validation
  const validateStep = (step) => {
    switch (step) {
      case 0: return true; // Personal info — mostly read-only
      case 1: return formData.skills.length > 0;
      case 2: return formData.softSkills.length > 0 && formData.preferredRole !== '';
      case 3: return formData.availableDays.length > 0;
      case 4: return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await updateUser(formData);
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-bg dark:bg-dark-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-lg font-bold text-text-primary dark:text-text-inverted">CollabCore</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 pb-20">
        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isCompleted = idx < currentStep;
              const isActive = idx === currentStep;
              return (
                <div key={step.label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isCompleted
                          ? 'bg-primary dark:bg-dark-primaryAccent text-white'
                          : isActive
                          ? 'bg-primary dark:bg-dark-primaryAccent text-white ring-4 ring-primary/20 dark:ring-dark-primaryAccent/20'
                          : 'bg-surface-card dark:bg-dark-card border-2 border-surface-border dark:border-dark-border text-text-muted'
                      }`}
                    >
                      {isCompleted ? <Check size={18} /> : <StepIcon size={18} />}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium hidden sm:block ${
                        isActive
                          ? 'text-primary dark:text-dark-primaryAccent font-semibold'
                          : isCompleted
                          ? 'text-primary dark:text-dark-primaryAccent'
                          : 'text-text-muted'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 mx-2 mt-[-20px] sm:mt-[-8px]">
                      <div className="h-0.5 bg-surface-border dark:bg-dark-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary dark:bg-dark-primaryAccent transition-all duration-300"
                          style={{ width: idx < currentStep ? '100%' : '0%' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content Card */}
        <div className="bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-xl shadow-sm p-6 mb-6">
          {/* Step 1 - Personal Info */}
          {currentStep === 0 && (
            <div>
              <h2 className="text-xl font-semibold text-text-primary dark:text-text-inverted mb-1">Personal Information</h2>
              <p className="text-text-secondary dark:text-text-secondary text-sm mb-6">Review your basic info and add optional details.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1">Full Name</label>
                  <input
                    type="text"
                    value={user?.fullName || ''}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-input dark:bg-dark-input border border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted opacity-60 cursor-not-allowed"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1">Student ID</label>
                    <input
                      type="text"
                      value={user?.studentId || ''}
                      readOnly
                      className="w-full px-4 py-2.5 rounded-lg bg-surface-input dark:bg-dark-input border border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted opacity-60 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="w-full px-4 py-2.5 rounded-lg bg-surface-input dark:bg-dark-input border border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted opacity-60 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1">
                    <Phone size={14} className="inline mr-1" />
                    Phone Number <span className="text-text-muted">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-input dark:bg-dark-input border border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted placeholder-text-muted focus:ring-2 focus:ring-primary dark:focus:ring-dark-primaryAccent focus:border-primary dark:focus:border-dark-primaryAccent outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1">
                      <GraduationCap size={14} className="inline mr-1" />
                      Year of Study
                    </label>
                    <select
                      value={formData.yearOfStudy}
                      onChange={e => updateField('yearOfStudy', e.target.value ? parseInt(e.target.value) : '')}
                      className="w-full px-4 py-2.5 rounded-lg bg-surface-input dark:bg-dark-input border border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted focus:ring-2 focus:ring-primary dark:focus:ring-dark-primaryAccent outline-none transition-all"
                    >
                      <option value="">Select year</option>
                      {[1, 2, 3, 4].map(y => (
                        <option key={y} value={y}>Year {y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1">
                      <Building size={14} className="inline mr-1" />
                      Faculty
                    </label>
                    <select
                      value={formData.faculty}
                      onChange={e => updateField('faculty', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-surface-input dark:bg-dark-input border border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted focus:ring-2 focus:ring-primary dark:focus:ring-dark-primaryAccent outline-none transition-all"
                    >
                      <option value="">Select faculty</option>
                      {FACULTIES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 - Technical Skills */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-text-primary dark:text-text-inverted mb-1">Technical Skills</h2>
              <p className="text-text-secondary dark:text-text-secondary text-sm mb-6">
                Select your skills and rate your proficiency. ({formData.skills.length} selected)
              </p>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {Object.keys(SKILLS_DATA).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSkillCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      skillCategory === cat
                        ? 'bg-primary-light text-primary dark:bg-dark-primaryLight dark:text-dark-primaryAccent'
                        : 'bg-surface-bg dark:bg-dark-elevated text-text-secondary dark:text-text-secondary hover:bg-surface-border/30 dark:hover:bg-dark-border/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Skill Buttons */}
              <div className="space-y-3">
                {SKILLS_DATA[skillCategory].map(skill => {
                  const selected = formData.skills.find(s => s.name === skill);
                  return (
                    <div key={skill} className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSkill(skill, skillCategory)}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-all border ${
                          selected
                            ? 'bg-primary text-white border-primary dark:bg-dark-primaryAccent dark:border-dark-primaryAccent dark:text-dark-bg'
                            : 'bg-surface-input dark:bg-dark-input border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted hover:border-primary dark:hover:border-dark-primaryAccent'
                        }`}
                      >
                        {selected && <Check size={14} className="inline mr-2" />}
                        {skill}
                      </button>
                      {selected && (
                        <select
                          value={selected.proficiency}
                          onChange={e => updateProficiency(skill, e.target.value)}
                          className="px-2 py-2 rounded-lg text-xs bg-surface-input dark:bg-dark-input border border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted focus:ring-1 focus:ring-primary dark:focus:ring-dark-primaryAccent outline-none"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected skills summary */}
              {formData.skills.length > 0 && (
                <div className="mt-6 pt-4 border-t border-surface-border dark:border-dark-border">
                  <p className="text-xs font-medium text-text-secondary dark:text-text-secondary mb-2">Selected Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map(s => (
                      <span
                        key={s.name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-light text-primary-dark dark:bg-dark-primaryLight dark:text-dark-primaryAccent"
                      >
                        {s.name}
                        <button onClick={() => toggleSkill(s.name, s.category)} className="hover:text-danger">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 - Soft Skills & Role */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-text-primary dark:text-text-inverted mb-1">Soft Skills & Role Preference</h2>
              <p className="text-text-secondary dark:text-text-secondary text-sm mb-6">Select your soft skills and preferred team role.</p>

              {/* Soft Skills */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted mb-3">Soft Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {SOFT_SKILLS.map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleSoftSkill(skill)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        formData.softSkills.includes(skill)
                          ? 'bg-primary text-white border-primary dark:bg-dark-primaryAccent dark:border-dark-primaryAccent dark:text-dark-bg'
                          : 'bg-surface-input dark:bg-dark-input border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted hover:border-primary dark:hover:border-dark-primaryAccent'
                      }`}
                    >
                      {formData.softSkills.includes(skill) && <Check size={12} className="inline mr-1" />}
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Preference */}
              <div>
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted mb-3">Preferred Role</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLES.map(role => {
                    const RoleIcon = role.icon;
                    const isSelected = formData.preferredRole === role.value;
                    return (
                      <button
                        key={role.value}
                        onClick={() => updateField('preferredRole', role.value)}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-primary dark:border-dark-primaryAccent bg-primary-light dark:bg-dark-primaryLight'
                            : 'border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card hover:border-primary/50 dark:hover:border-dark-primaryAccent/50'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-primary dark:bg-dark-primaryAccent text-white'
                              : 'bg-surface-bg dark:bg-dark-elevated text-text-secondary dark:text-text-secondary'
                          }`}
                        >
                          <RoleIcon size={20} />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isSelected ? 'text-primary-dark dark:text-dark-primaryAccent' : 'text-text-primary dark:text-text-inverted'}`}>
                            {role.value}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-text-secondary mt-0.5">{role.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 4 - Availability & Interests */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-text-primary dark:text-text-inverted mb-1">Availability & Interests</h2>
              <p className="text-text-secondary dark:text-text-secondary text-sm mb-6">Tell us when you&apos;re available and what interests you.</p>

              {/* Hours Slider */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-primary dark:text-text-inverted">Weekly Availability</label>
                  <span className="text-sm font-semibold text-primary dark:text-dark-primaryAccent">{formData.availabilityHours} hours/week</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={formData.availabilityHours}
                  onChange={e => updateField('availabilityHours', parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-border dark:bg-dark-border accent-primary dark:accent-dark-primaryAccent"
                />
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>5 hrs</span>
                  <span>40 hrs</span>
                </div>
              </div>

              {/* Day Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-primary dark:text-text-inverted mb-3">Available Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`w-14 h-14 rounded-xl text-sm font-semibold transition-all border-2 ${
                        formData.availableDays.includes(day)
                          ? 'bg-primary dark:bg-dark-primaryAccent text-white border-primary dark:border-dark-primaryAccent'
                          : 'bg-surface-input dark:bg-dark-input border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted hover:border-primary dark:hover:border-dark-primaryAccent'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Interests */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-primary dark:text-text-inverted mb-2">Project Interests</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={interestInput}
                    onChange={e => setInterestInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    placeholder="Type an interest and press Enter"
                    className="flex-1 px-4 py-2.5 rounded-lg bg-surface-input dark:bg-dark-input border border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted placeholder-text-muted focus:ring-2 focus:ring-primary dark:focus:ring-dark-primaryAccent outline-none transition-all"
                  />
                  <button
                    onClick={addInterest}
                    className="px-3 py-2 rounded-lg bg-primary dark:bg-dark-primaryAccent text-white hover:bg-primary-hover transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {formData.projectInterests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.projectInterests.map(interest => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-primary-light text-primary-dark dark:bg-dark-primaryLight dark:text-dark-primaryAccent"
                      >
                        {interest}
                        <button onClick={() => removeInterest(interest)} className="hover:text-danger">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Preferred Topics */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-primary dark:text-text-inverted">Preferred Topics</label>
                  <span className="text-xs text-text-muted">{formData.preferredTopics.length}/200</span>
                </div>
                <textarea
                  value={formData.preferredTopics}
                  onChange={e => e.target.value.length <= 200 && updateField('preferredTopics', e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="Describe topics or project areas you'd like to work on..."
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-input dark:bg-dark-input border border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted placeholder-text-muted focus:ring-2 focus:ring-primary dark:focus:ring-dark-primaryAccent outline-none transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 5 - Review & Submit */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-text-primary dark:text-text-inverted mb-1">Review & Submit</h2>
              <p className="text-text-secondary dark:text-text-secondary text-sm mb-6">Review your information before submitting.</p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-danger text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {/* Personal Info Summary */}
                <div className="border border-surface-border dark:border-dark-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted flex items-center gap-2">
                      <User size={16} /> Personal Info
                    </h3>
                    <button onClick={() => setCurrentStep(0)} className="text-xs text-primary dark:text-dark-primaryAccent hover:underline">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-text-muted">Name:</span> <span className="text-text-primary dark:text-text-inverted">{user?.fullName}</span></div>
                    <div><span className="text-text-muted">ID:</span> <span className="text-text-primary dark:text-text-inverted">{user?.studentId}</span></div>
                    <div><span className="text-text-muted">Phone:</span> <span className="text-text-primary dark:text-text-inverted">{formData.phone || 'N/A'}</span></div>
                    <div><span className="text-text-muted">Year:</span> <span className="text-text-primary dark:text-text-inverted">{formData.yearOfStudy || 'N/A'}</span></div>
                    <div><span className="text-text-muted">Faculty:</span> <span className="text-text-primary dark:text-text-inverted">{formData.faculty || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Skills Summary */}
                <div className="border border-surface-border dark:border-dark-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted flex items-center gap-2">
                      <Code size={16} /> Technical Skills ({formData.skills.length})
                    </h3>
                    <button onClick={() => setCurrentStep(1)} className="text-xs text-primary dark:text-dark-primaryAccent hover:underline">Edit</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map(s => (
                      <span key={s.name} className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-light text-primary-dark dark:bg-dark-primaryLight dark:text-dark-primaryAccent">
                        {s.name} · {s.proficiency}
                      </span>
                    ))}
                    {formData.skills.length === 0 && <span className="text-sm text-text-muted">No skills selected</span>}
                  </div>
                </div>

                {/* Soft Skills & Role Summary */}
                <div className="border border-surface-border dark:border-dark-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted flex items-center gap-2">
                      <Heart size={16} /> Soft Skills & Role
                    </h3>
                    <button onClick={() => setCurrentStep(2)} className="text-xs text-primary dark:text-dark-primaryAccent hover:underline">Edit</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.softSkills.map(s => (
                      <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{s}</span>
                    ))}
                  </div>
                  <p className="text-sm text-text-secondary dark:text-text-secondary">
                    <span className="text-text-muted">Preferred Role:</span> <span className="font-medium text-text-primary dark:text-text-inverted">{formData.preferredRole || 'Not selected'}</span>
                  </p>
                </div>

                {/* Availability Summary */}
                <div className="border border-surface-border dark:border-dark-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted flex items-center gap-2">
                      <Calendar size={16} /> Availability & Interests
                    </h3>
                    <button onClick={() => setCurrentStep(3)} className="text-xs text-primary dark:text-dark-primaryAccent hover:underline">Edit</button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-text-muted">Hours:</span> <span className="text-text-primary dark:text-text-inverted font-medium">{formData.availabilityHours} hrs/week</span></p>
                    <p><span className="text-text-muted">Days:</span> <span className="text-text-primary dark:text-text-inverted">{formData.availableDays.join(', ') || 'None'}</span></p>
                    {formData.projectInterests.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {formData.projectInterests.map(i => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{i}</span>
                        ))}
                      </div>
                    )}
                    {formData.preferredTopics && <p className="text-text-secondary dark:text-text-secondary italic">&quot;{formData.preferredTopics}&quot;</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentStep === 0
                ? 'opacity-0 pointer-events-none'
                : 'bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverted hover:bg-surface-bg dark:hover:bg-dark-elevated'
            }`}
          >
            <ChevronLeft size={16} /> Previous
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                validateStep(currentStep)
                  ? 'bg-primary dark:bg-dark-primaryAccent text-white hover:bg-primary-hover dark:hover:bg-primary-dark'
                  : 'bg-surface-border dark:bg-dark-border text-text-muted cursor-not-allowed'
              }`}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary dark:bg-dark-primaryAccent text-white hover:bg-primary-hover dark:hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={16} /> Complete Setup
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
