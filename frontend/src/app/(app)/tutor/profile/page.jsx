// src/app/(app)/tutor/profile/page.jsx - Tutor Profile Management
'use client';

import { useQuery } from '@tanstack/react-query';
import { tutorApi, subjectApi } from '../../../../lib/api';

const MOCK_PROFILE = {
  headline: 'Mathematics and Programming Tutor',
  status: 'ACTIVE',
  bio: 'I enjoy helping students build confidence through clear explanations and practice.',
  hourlyRate: 55,
  currency: 'AUD',
  location: 'Sydney, NSW',
  sessionTypes: ['ONLINE', 'IN_PERSON'],
  yearsExperience: 3,
};

const MOCK_SUBJECTS = [
  { id: 1, name: 'Mathematics' },
  { id: 2, name: 'Programming' },
  { id: 3, name: 'Physics' },
];

export default function TutorProfilePage() {
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
        <p className="text-gray-600 mt-1">Manage your tutor information</p>
      </div>

      {isPreviewMode && (
        <div className="card p-4 border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-800">
            Preview mode: tutor profile data is currently using local mock content for frontend
            testing.
          </p>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Profile Data</h2>
        <p className="text-sm text-gray-600">Headline: {profile?.headline || '-'}</p>
        <p className="text-sm text-gray-600">Status: {profile?.status || '-'}</p>
        <p className="text-sm text-gray-600">Bio: {profile?.bio || '-'}</p>
        <p className="text-sm text-gray-600">Hourly Rate: {profile?.hourlyRate || '-'} {profile?.currency || ''}</p>
        <p className="text-sm text-gray-600">Location: {profile?.location || '-'}</p>
        <p className="text-sm text-gray-600">
          Session Types: {Array.isArray(profile?.sessionTypes) ? profile.sessionTypes.join(', ') : '-'}
        </p>
        <p className="text-sm text-gray-600">Years of Experience: {profile?.yearsExperience ?? '-'}</p>
        <p className="text-sm text-gray-600">Subjects loaded: {allSubjects.length}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {allSubjects.map((subject) => (
            <span key={subject.id} className="badge bg-blue-50 text-blue-700">
              {subject.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
