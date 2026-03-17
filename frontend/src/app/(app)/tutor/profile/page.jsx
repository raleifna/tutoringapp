// src/app/(app)/tutor/profile/page.jsx - Tutor Profile Management
'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { tutorApi, subjectApi } from '../../../../lib/api';

const DAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
];

const SESSION_TYPES = ['ONLINE', 'IN_PERSON', 'HYBRID'];

const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all', label: 'All Levels' },
];

const CURRENCIES = ['AUD', 'USD', 'GBP', 'EUR'];

const MOCK_PROFILE = {
  headline: 'Mathematics and Programming Tutor',
  status: 'ACTIVE',
  bio: 'I enjoy helping students build confidence through clear explanations and practice.',
  hourlyRate: 55,
  currency: 'AUD',
  location: 'Sydney, NSW',
  sessionTypes: ['ONLINE', 'IN_PERSON'],
  yearsExperience: 3,
  education: 'BSc Computer Science, UNSW, 2023',
  languages: ['English', 'Mandarin'],
  subjects: [
    {
      id: 1,
      subjectId: 1,
      level: 'advanced',
      subject: { id: 1, name: 'Mathematics', category: 'STEM' },
    },
    {
      id: 2,
      subjectId: 2,
      level: 'intermediate',
      subject: { id: 2, name: 'Programming', category: 'Technology' },
    },
  ],
  availability: [
    { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
    { dayOfWeek: 3, startTime: '14:00', endTime: '18:00' },
  ],
};

const MOCK_SUBJECTS = [
  { id: 1, name: 'Mathematics', category: 'STEM' },
  { id: 2, name: 'Programming', category: 'Technology' },
  { id: 3, name: 'Physics', category: 'STEM' },
  { id: 4, name: 'English', category: 'Language' },
];

const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export default function TutorProfilePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    headline: '',
    bio: '',
    hourlyRate: 50,
    currency: 'AUD',
    location: '',
    sessionTypes: ['ONLINE'],
    yearsExperience: 0,
    education: '',
    languages: '',
  });
  const [availability, setAvailability] = useState([]);
  const [mySubjects, setMySubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');

  const {
    data: profileData,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery({
    queryKey: ['my-tutor-profile'],
    queryFn: () => tutorApi.getMyProfile(),
  });

  const {
    data: subjectsData,
    isLoading: subjectsLoading,
    isError: subjectsError,
  } = useQuery({
    queryKey: ['all-subjects'],
    queryFn: () => subjectApi.getAll(),
  });

  const profile = profileData?.data?.data || MOCK_PROFILE;
  const allSubjects = subjectsData?.data?.data?.subjects || MOCK_SUBJECTS;
  const isPreviewMode = profileError || subjectsError;

  useEffect(() => {
    if (!profile) return;

    setProfileForm({
      headline: profile.headline || '',
      bio: profile.bio || '',
      hourlyRate: profile.hourlyRate || 50,
      currency: profile.currency || 'AUD',
      location: profile.location || '',
      sessionTypes: profile.sessionTypes || ['ONLINE'],
      yearsExperience: profile.yearsExperience || 0,
      education: Array.isArray(profile.education)
        ? profile.education.join('\n')
        : profile.education || '',
      languages: Array.isArray(profile.languages) ? profile.languages.join(', ') : '',
    });

    setAvailability(
      (profile.availability || []).map((slot) => ({
        dayOfWeek: String(slot.dayOfWeek),
        startTime: slot.startTime,
        endTime: slot.endTime,
      }))
    );

    setMySubjects(profile.subjects || []);
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload) => tutorApi.updateProfile(payload),
    onSuccess: () => {
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['my-tutor-profile'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: (slots) => tutorApi.updateAvailability(slots),
    onSuccess: () => {
      toast.success('Availability updated');
      queryClient.invalidateQueries({ queryKey: ['my-tutor-profile'] });
    },
    onError: () => {
      toast.error('Failed to update availability');
    },
  });

  const addSubjectMutation = useMutation({
    mutationFn: ({ subjectId, level }) => tutorApi.addSubject(subjectId, { level }),
    onSuccess: () => {
      toast.success('Subject added');
      queryClient.invalidateQueries({ queryKey: ['my-tutor-profile'] });
      setSelectedSubjectId('');
      setSelectedLevel('all');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to add subject');
    },
  });

  const removeSubjectMutation = useMutation({
    mutationFn: (subjectId) => tutorApi.removeSubject(subjectId),
    onSuccess: () => {
      toast.success('Subject removed');
      queryClient.invalidateQueries({ queryKey: ['my-tutor-profile'] });
    },
    onError: () => {
      toast.error('Failed to remove subject');
    },
  });

  const handleProfileChange = (key, value) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSessionType = (type) => {
    setProfileForm((prev) => {
      const current = prev.sessionTypes || [];
      const next = current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type];
      return { ...prev, sessionTypes: next };
    });
  };

  const handleSaveProfile = () => {
    if (!profileForm.hourlyRate || Number(profileForm.hourlyRate) <= 0) {
      toast.error('Hourly rate must be greater than 0');
      return;
    }

    if (!profileForm.sessionTypes || profileForm.sessionTypes.length === 0) {
      toast.error('Select at least one session type');
      return;
    }

    const payload = {
      ...profileForm,
      hourlyRate: Number(profileForm.hourlyRate),
      yearsExperience: Number(profileForm.yearsExperience || 0),
      languages: profileForm.languages
        ? profileForm.languages
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      education: profileForm.education
        ? profileForm.education
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    };

    if (isPreviewMode) {
      toast.success('Profile updated (preview mode)');
      return;
    }

    updateProfileMutation.mutate(payload);
  };

  const addAvailabilitySlot = () => {
    setAvailability((prev) => [
      ...prev,
      { dayOfWeek: '1', startTime: '09:00', endTime: '17:00' },
    ]);
  };

  const removeAvailabilitySlot = (index) => {
    setAvailability((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (index, key, value) => {
    setAvailability((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [key]: value } : slot))
    );
  };

  const handleSaveAvailability = () => {
    if (isPreviewMode) {
      toast.success('Availability updated (preview mode)');
      return;
    }

    updateAvailabilityMutation.mutate(availability);
  };

  const currentSubjectIds = mySubjects.map((item) => item.subjectId);
  const availableSubjects = allSubjects.filter((subject) => !currentSubjectIds.includes(subject.id));

  const handleAddSubject = () => {
    if (!selectedSubjectId) {
      toast.error('Select a subject first');
      return;
    }

    const subject = allSubjects.find((item) => String(item.id) === String(selectedSubjectId));
    if (!subject) {
      toast.error('Selected subject is invalid');
      return;
    }

    if (isPreviewMode) {
      setMySubjects((prev) => [
        ...prev,
        {
          id: Date.now(),
          subjectId: subject.id,
          level: selectedLevel,
          subject,
        },
      ]);
      setSelectedSubjectId('');
      setSelectedLevel('all');
      toast.success('Subject added (preview mode)');
      return;
    }

    addSubjectMutation.mutate({ subjectId: selectedSubjectId, level: selectedLevel });
  };

  const handleRemoveSubject = (subjectId) => {
    if (isPreviewMode) {
      setMySubjects((prev) => prev.filter((item) => item.subjectId !== subjectId));
      toast.success('Subject removed (preview mode)');
      return;
    }

    removeSubjectMutation.mutate(subjectId);
  };

  if (profileLoading || subjectsLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3" />
        <div className="card p-6 h-48" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Tutor Profile</h1>
        <p className="text-gray-600 mt-1">
          Status:{' '}
          <span
            className={cn(
              'font-medium',
              profile?.status === 'ACTIVE' && 'text-green-600',
              profile?.status === 'PENDING' && 'text-yellow-600',
              profile?.status === 'SUSPENDED' && 'text-red-600'
            )}
          >
            {profile?.status || '-'}
          </span>
        </p>
      </div>

      {isPreviewMode && (
        <div className="card p-4 border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-800">
            Preview mode: tutor profile data is currently using local mock content for frontend
            testing.
          </p>
        </div>
      )}

      <div className="border-b border-gray-200 flex gap-1">
        {['profile', 'subjects', 'availability'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 -mb-px text-sm font-medium capitalize border-b-2 transition-colors',
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">Headline</label>
            <input
              value={profileForm.headline}
              onChange={(e) => handleProfileChange('headline', e.target.value)}
              className="input"
              placeholder="e.g. Mathematics Tutor with 5 years experience"
            />
          </div>

          <div>
            <label className="label">About / Bio</label>
            <textarea
              value={profileForm.bio}
              onChange={(e) => handleProfileChange('bio', e.target.value)}
              rows={5}
              className="input resize-none"
              placeholder="Describe your teaching style and experience..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Hourly Rate</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={profileForm.hourlyRate}
                onChange={(e) => handleProfileChange('hourlyRate', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Currency</label>
              <select
                value={profileForm.currency}
                onChange={(e) => handleProfileChange('currency', e.target.value)}
                className="input"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Location</label>
            <input
              value={profileForm.location}
              onChange={(e) => handleProfileChange('location', e.target.value)}
              className="input"
              placeholder="e.g. Sydney, NSW"
            />
          </div>

          <div>
            <label className="label">Session Types</label>
            <div className="flex gap-3 flex-wrap">
              {SESSION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleSessionType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                    profileForm.sessionTypes.includes(type)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                  )}
                >
                  {type.replace('_', '-')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                value={profileForm.yearsExperience}
                onChange={(e) => handleProfileChange('yearsExperience', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Languages Spoken</label>
              <input
                value={profileForm.languages}
                onChange={(e) => handleProfileChange('languages', e.target.value)}
                className="input"
                placeholder="English, Mandarin"
              />
            </div>
          </div>

          <div>
            <label className="label">Education / Qualifications</label>
            <textarea
              value={profileForm.education}
              onChange={(e) => handleProfileChange('education', e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="e.g. BSc Mathematics, UNSW, 2023"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            className="btn-primary"
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Update Profile'}
          </button>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">My Subjects</h3>
            {mySubjects.length === 0 ? (
              <p className="text-sm text-gray-400">No subjects added yet</p>
            ) : (
              <div className="space-y-2">
                {mySubjects.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <span className="font-medium text-sm text-gray-900">
                        {item.subject?.name}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        ({item.subject?.category})
                      </span>
                      <span className="badge bg-blue-50 text-blue-700 text-xs ml-2">
                        {item.level || 'All Levels'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(item.subjectId)}
                      disabled={removeSubjectMutation.isPending}
                      className="p-1.5 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Add Subject</h3>
            <div className="flex gap-3">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="input flex-1"
              >
                <option value="">Select a subject...</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.category})
                  </option>
                ))}
              </select>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="input w-36"
              >
                {LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddSubject}
                disabled={!selectedSubjectId || addSubjectMutation.isPending}
                className="btn-primary gap-1.5 flex-shrink-0"
              >
                <PlusIcon className="w-4 h-4" /> Add
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'availability' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Weekly Availability</h3>
            <button type="button" onClick={addAvailabilitySlot} className="btn-secondary btn-sm gap-1.5">
              <PlusIcon className="w-4 h-4" /> Add Slot
            </button>
          </div>

          {availability.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No availability added. Click &quot;Add Slot&quot; to start.
            </p>
          ) : (
            <div className="space-y-3">
              {availability.map((slot, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    value={slot.dayOfWeek}
                    onChange={(e) => updateSlot(index, 'dayOfWeek', e.target.value)}
                    className="input flex-1"
                  >
                    {DAY_OPTIONS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                    className="input w-28"
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                    className="input w-28"
                  />
                  <button
                    type="button"
                    onClick={() => removeAvailabilitySlot(index)}
                    className="p-2 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveAvailability}
            disabled={updateAvailabilityMutation.isPending}
            className="btn-primary"
          >
            {updateAvailabilityMutation.isPending ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      )}
    </div>
  );
}
