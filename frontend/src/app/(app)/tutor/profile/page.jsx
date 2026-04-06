// src/app/(app)/tutor/profile/page.jsx - Tutor Profile Management
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LockClosedIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { tutorApi, subjectApi } from '../../../../lib/api-entry';
import AvailabilityCalendar from '../../../../components/AvailabilityCalendar';
import { cloneSlots } from '../../../../lib/availability-calendar';

const MAX_VERIFICATION_FILES = 5;
const MAX_VERIFICATION_FILE_SIZE = 5 * 1024 * 1024;
const MAX_VERIFICATION_TOTAL_SIZE = 25 * 1024 * 1024;

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

const formatEducationItem = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return [item.degree, item.field, item.institution, item.year, item.text]
    .filter(Boolean)
    .join(', ');
};

const formatCertificationItem = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return [item.name, item.issuer, item.year, item.url, item.text].filter(Boolean).join(' | ');
};

const getApplicationFiles = (items) => {
  return Array.isArray(items) ? items.filter((item) => item && typeof item === 'object' && item.url) : [];
};

const getApplicationNotes = (items) => {
  return Array.isArray(items)
    ? items
        .filter((item) => item && typeof item === 'object' && item.text && !item.url)
        .map((item) => item.text)
        .join('\n')
    : '';
};

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
  const [currentWeekAvailability, setCurrentWeekAvailability] = useState([]);
  const [hasCurrentWeekAvailabilityOverride, setHasCurrentWeekAvailabilityOverride] = useState(false);
  const [showCurrentWeekEditor, setShowCurrentWeekEditor] = useState(false);
  const [mySubjects, setMySubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [applicationSummary, setApplicationSummary] = useState('');
  const [applicationNotes, setApplicationNotes] = useState('');
  const [applicationExperienceYears, setApplicationExperienceYears] = useState('0');
  const [applicationFiles, setApplicationFiles] = useState([]);
  const [applicationFileError, setApplicationFileError] = useState('');

  const {
    data: profileData,
    isLoading: profileLoading,
    isError: profileError,
    error: profileQueryError,
  } = useQuery({
    queryKey: ['my-tutor-profile'],
    queryFn: () => tutorApi.getMyProfile(),
  });

  const {
    data: subjectsData,
    isLoading: subjectsLoading,
    isError: subjectsError,
    error: subjectsQueryError,
  } = useQuery({
    queryKey: ['all-subjects'],
    queryFn: () => subjectApi.getAll(),
  });

  const profile = profileData?.data?.data;
  const allSubjects = subjectsData?.data?.data?.subjects || [];
  const isApproved = profile?.status === 'ACTIVE';
  const latestReviewAction = profile?.latestReviewAction;
  const existingApplicationFiles = getApplicationFiles(profile?.certifications);
  const existingApplicationNotes = getApplicationNotes(profile?.certifications);

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

    setAvailability(cloneSlots(profile.availability || []));
    setCurrentWeekAvailability(
      cloneSlots(profile.currentWeekEffectiveAvailability || profile.availability || [])
    );
    setHasCurrentWeekAvailabilityOverride(Boolean(profile.hasCurrentWeekAvailabilityOverride));
    setShowCurrentWeekEditor(Boolean(profile.hasCurrentWeekAvailabilityOverride));

    setMySubjects(profile.subjects || []);
    setApplicationSummary(
      Array.isArray(profile.education)
        ? profile.education.map(formatEducationItem).filter(Boolean).join('\n')
        : profile.education || ''
    );
    setApplicationNotes(getApplicationNotes(profile.certifications));
    setApplicationExperienceYears(String(profile.yearsExperience || 0));
    setApplicationFiles([]);
    setApplicationFileError('');
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
      queryClient.invalidateQueries({ queryKey: ['tutor-availability'] });
    },
    onError: () => {
      toast.error('Failed to update availability');
    },
  });

  const updateCurrentWeekAvailabilityMutation = useMutation({
    mutationFn: (slots) => tutorApi.updateCurrentWeekAvailability(slots),
    onSuccess: () => {
      toast.success('This week availability updated');
      queryClient.invalidateQueries({ queryKey: ['my-tutor-profile'] });
      queryClient.invalidateQueries({ queryKey: ['tutor-availability'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update this week availability');
    },
  });

  const clearCurrentWeekAvailabilityMutation = useMutation({
    mutationFn: () => tutorApi.clearCurrentWeekAvailability(),
    onSuccess: () => {
      toast.success('This week is back to your regular schedule');
      queryClient.invalidateQueries({ queryKey: ['my-tutor-profile'] });
      queryClient.invalidateQueries({ queryKey: ['tutor-availability'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to clear this week availability');
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

  const applicationMutation = useMutation({
    mutationFn: (formData) => tutorApi.updateApplication(formData),
    onSuccess: () => {
      toast.success('Verification materials resubmitted');
      queryClient.invalidateQueries({ queryKey: ['my-tutor-profile'] });
      setApplicationFiles([]);
      setApplicationFileError('');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to resubmit verification materials');
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
    updateAvailabilityMutation.mutate(availability);
  };

  const handleToggleCurrentWeekEditor = () => {
    setShowCurrentWeekEditor((current) => {
      if (!current && !hasCurrentWeekAvailabilityOverride) {
        setCurrentWeekAvailability(cloneSlots(availability));
      }
      return !current;
    });
  };

  const handleSaveCurrentWeekAvailability = () => {
    updateCurrentWeekAvailabilityMutation.mutate(currentWeekAvailability);
  };

  const handleClearCurrentWeekAvailability = () => {
    clearCurrentWeekAvailabilityMutation.mutate();
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

    addSubjectMutation.mutate({ subjectId: selectedSubjectId, level: selectedLevel });
  };

  const handleRemoveSubject = (subjectId) => {
    removeSubjectMutation.mutate(subjectId);
  };

  const handleApplicationFilesChange = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length > MAX_VERIFICATION_FILES) {
      setApplicationFiles([]);
      setApplicationFileError(`Upload up to ${MAX_VERIFICATION_FILES} verification files`);
      return;
    }

    if (files.some((file) => file.size > MAX_VERIFICATION_FILE_SIZE)) {
      setApplicationFiles([]);
      setApplicationFileError('Each verification file must be 5MB or smaller');
      return;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_VERIFICATION_TOTAL_SIZE) {
      setApplicationFiles([]);
      setApplicationFileError('Total upload size must stay within 25MB');
      return;
    }

    setApplicationFiles(files);
    setApplicationFileError('');
  };

  const handleApplicationResubmit = () => {
    const fallbackSummary = Array.isArray(profile?.education)
      ? profile.education.map(formatEducationItem).filter(Boolean).join('\n')
      : profile?.education || '';
    const summaryForSubmit = applicationSummary.trim() || String(fallbackSummary || '').trim();

    if (!summaryForSubmit) {
      toast.error('Education summary is required');
      return;
    }

    if (applicationFiles.length === 0 && existingApplicationFiles.length === 0) {
      setApplicationFileError('Upload at least one verification file');
      return;
    }

    const formData = new FormData();
    formData.append('tutorEducationSummary', summaryForSubmit);
    formData.append(
      'tutorExperienceYears',
      String(applicationExperienceYears || profile?.yearsExperience || '0')
    );
    if (applicationNotes.trim()) {
      formData.append('tutorSupportingNotes', applicationNotes);
    }
    applicationFiles.forEach((file) => formData.append('verificationFiles', file));
    applicationMutation.mutate(formData);
  };

  if (profileLoading || subjectsLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3" />
        <div className="card p-6 h-48" />
      </div>
    );
  }

  if (profileError || subjectsError || !profile) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="card p-6">
          <h1 className="page-title">Tutor Profile</h1>
          <p className="text-sm text-gray-600 mt-3">
            {profileQueryError?.response?.data?.message ||
              subjectsQueryError?.response?.data?.message ||
              'Tutor profile data is unavailable for this account.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-5xl mx-auto space-y-5">
      <Link href="/tutor/dashboard" className="absolute top-0 right-0 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
        <span>←</span> Back
      </Link>

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

      <div className="space-y-4">
        {(existingApplicationFiles.length > 0 || existingApplicationNotes) && (
          <div className="card p-5 space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900">Submitted verification files</h3>
              {existingApplicationFiles.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {existingApplicationFiles.map((item, index) => {
                    const text =
                      item.originalName || item.fileName || formatCertificationItem(item);
                    return text ? (
                      <a
                        key={`${text}-${index}`}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-sm text-primary-700 rounded-xl border border-blue-100 bg-white px-3 py-2 hover:bg-blue-50"
                      >
                        {text}
                      </a>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-2">No verification files submitted.</p>
              )}
            </div>

            {existingApplicationNotes && (
              <div>
                <h3 className="font-semibold text-gray-900">Supporting notes</h3>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                  {existingApplicationNotes}
                </p>
              </div>
            )}
          </div>
        )}

        {!isApproved && (
          <>
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Update verification materials</h3>
              <p className="text-sm text-gray-500 mt-1">
                You can update only your verification submission here while approval is pending.
              </p>
            </div>

            <div>
              <label className="label">Education / Qualifications Summary</label>
              <textarea
                value={applicationSummary}
                onChange={(event) => setApplicationSummary(event.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Summarise your qualifications and teaching background"
              />
            </div>

            <div>
              <label className="label">Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                value={applicationExperienceYears}
                onChange={(event) => setApplicationExperienceYears(event.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Additional Notes</label>
              <textarea
                value={applicationNotes}
                onChange={(event) => setApplicationNotes(event.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Optional notes for the reviewer"
              />
            </div>

            <div>
              <label className="label">Upload New Verification Files</label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,image/*"
                className="input py-3"
                onChange={handleApplicationFilesChange}
              />
              {applicationFileError && <p className="error-text">{applicationFileError}</p>}
              {applicationFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {applicationFiles.map((file) => (
                    <span
                      key={`${file.name}-${file.size}`}
                      className="badge bg-blue-50 text-blue-700 text-xs"
                    >
                      {file.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleApplicationResubmit}
              disabled={applicationMutation.isPending}
              className="btn-primary"
            >
              {applicationMutation.isPending ? 'Submitting...' : 'Resubmit Verification Materials'}
            </button>
          </div>

          <div className="card p-5 border-yellow-200 bg-yellow-50/70">
            <div className="flex items-start gap-3">
              <LockClosedIcon className="w-5 h-5 text-yellow-700 mt-0.5" />
              <div>
                <h2 className="font-semibold text-gray-900">Tutor profile locked until approval</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Your verification submission is still being reviewed. Public tutor profile fields
                  stay locked until approval.
                </p>
              </div>
            </div>
          </div>

          {latestReviewAction?.description && (
            <div className="card p-5 border-blue-200 bg-blue-50/70">
              <h3 className="font-semibold text-gray-900">Latest admin feedback</h3>
              <p className="text-sm text-gray-600 mt-2">{latestReviewAction.description}</p>
            </div>
          )}

          </>
        )}
      </div>

      {isApproved && (
        <>
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
          <div>
            <h3 className="font-semibold text-gray-900">Weekly Availability</h3>
            <p className="mt-1 text-sm text-gray-500">Click cells to toggle 1-hour blocks across the full 24-hour day.</p>
          </div>

          <AvailabilityCalendar slots={availability} mode="edit" onChange={setAvailability} />

          <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500">
            {availability.length === 0
              ? 'No availability selected yet.'
              : `${availability.length} weekly availability block${availability.length > 1 ? 's' : ''} selected.`}
          </div>

          <button
            type="button"
            onClick={handleSaveAvailability}
            disabled={updateAvailabilityMutation.isPending}
            className="btn-primary"
          >
            {updateAvailabilityMutation.isPending ? 'Saving...' : 'Save Availability'}
          </button>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Temporary Modify This Week</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Use a separate current-week table when you need one-off changes. Students will see this week&apos;s temporary timetable instead of the regular weekly schedule.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleCurrentWeekEditor}
                className="btn-secondary"
              >
                {showCurrentWeekEditor
                  ? 'Hide This Week Editor'
                  : hasCurrentWeekAvailabilityOverride
                    ? 'Edit This Week Override'
                    : 'Open This Week Editor'}
              </button>
            </div>

            {hasCurrentWeekAvailabilityOverride && (
              <div className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-sm text-amber-800">
                A temporary schedule is active for this week. Students are currently seeing the override below for the current week only.
              </div>
            )}

            {showCurrentWeekEditor && (
              <div className="space-y-4">
                <AvailabilityCalendar
                  slots={currentWeekAvailability}
                  mode="edit"
                  onChange={setCurrentWeekAvailability}
                  fixedWeekOffset={0}
                  hideWeekNavigation
                  title="This Week Only"
                />

                <div className="rounded-xl bg-white/80 px-3 py-2 text-sm text-gray-600">
                  {currentWeekAvailability.length === 0
                    ? 'No hours selected for this week. Saving now will make you unavailable for the current week.'
                    : `${currentWeekAvailability.length} current-week availability block${currentWeekAvailability.length > 1 ? 's' : ''} selected.`}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveCurrentWeekAvailability}
                    disabled={updateCurrentWeekAvailabilityMutation.isPending}
                    className="btn-primary"
                  >
                    {updateCurrentWeekAvailabilityMutation.isPending
                      ? 'Saving This Week...'
                      : 'Save This Week Only'}
                  </button>

                  <button
                    type="button"
                    onClick={handleClearCurrentWeekAvailability}
                    disabled={
                      !hasCurrentWeekAvailabilityOverride ||
                      clearCurrentWeekAvailabilityMutation.isPending
                    }
                    className="btn-secondary"
                  >
                    {clearCurrentWeekAvailabilityMutation.isPending
                      ? 'Clearing...'
                      : 'Clear Temporary Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
          )}
        </>
      )}
    </div>
  );
}
