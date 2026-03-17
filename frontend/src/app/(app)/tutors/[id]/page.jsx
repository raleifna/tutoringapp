// src/app/(app)/tutors/[id]/page.jsx - Tutor detail page
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  GlobeAltIcon,
  MapPinIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { tutorApi } from '../../../../lib/api-entry';

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const getTutorName = (tutor) => {
  const firstName = tutor?.user?.firstName || '';
  const lastName = tutor?.user?.lastName || '';
  return `${firstName} ${lastName}`.trim() || 'Tutor';
};

const getAvatarUrl = (tutor) => {
  if (tutor?.user?.avatar) return tutor.user.avatar;
  const name = getTutorName(tutor);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`;
};

const formatRating = (rating) => {
  const value = Number.parseFloat(rating || 0);
  if (Number.isNaN(value)) return '0.0';
  return value.toFixed(1);
};

const formatRate = (amount, currency = 'AUD') => {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return `$0 ${currency}`;
  return `$${value} ${currency}`;
};

export default function TutorDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('about');

  // Stage 2 priority #1
  const {
    data: tutorData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tutor', id],
    queryFn: () => tutorApi.getById(id),
    enabled: !!id,
  });

  // Stage 2 priority #2
  const {
    data: availabilityData,
    isLoading: isAvailabilityLoading,
  } = useQuery({
    queryKey: ['tutor-availability', id],
    queryFn: () => tutorApi.getAvailability(id),
    enabled: !!id,
  });

  const tutor = tutorData?.data?.data;
  const availability = availabilityData?.data?.data || [];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-red-600 mb-2">{error?.response?.data?.message || 'Failed to load tutor detail.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => refetch()} className="btn-primary btn-sm">
            Retry
          </button>
          <Link href="/search" className="text-sm text-primary-600 hover:underline">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-600 mb-3">Tutor not found.</p>
        <Link href="/search" className="btn-primary btn-sm">
          Browse Tutors
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <Link href="/search" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
        <ArrowLeftIcon className="w-4 h-4" />
        Back to search
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <img
            src={getAvatarUrl(tutor)}
            alt={getTutorName(tutor)}
            className="w-24 h-24 rounded-full object-cover border border-gray-100"
          />

          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{getTutorName(tutor)}</h1>
                  {tutor.isVerified && <CheckBadgeIcon className="w-5 h-5 text-primary-600" />}
                </div>
                <p className="text-gray-600 text-sm mt-0.5">{tutor.headline || 'Expert Tutor'}</p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2">
                  <span className="inline-flex items-center gap-1">
                    <StarIcon className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-800 font-medium">{formatRating(tutor.rating)}</span>
                  </span>
                  <span>{tutor.totalSessions || 0} sessions</span>
                  {tutor.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      {tutor.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">{formatRate(tutor.hourlyRate, tutor.currency)}</p>
                <p className="text-xs text-gray-400">per hour</p>
              </div>
            </div>

            {Array.isArray(tutor.sessionTypes) && tutor.sessionTypes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tutor.sessionTypes.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[11px] text-primary-700"
                  >
                    {String(item).replace('_', '-')}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">
              Booking form will be added in later stage.
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className={`px-4 py-2.5 -mb-px text-sm font-medium border-b-2 ${
            activeTab === 'about'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          About
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={`px-4 py-2.5 -mb-px text-sm font-medium border-b-2 ${
            activeTab === 'availability'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Availability
        </button>
      </div>

      {activeTab === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-semibold text-gray-900 mb-2">About</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{tutor.bio || 'No bio yet.'}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Subjects</h2>
              {Array.isArray(tutor.subjects) && tutor.subjects.length > 0 ? (
                <div className="space-y-2">
                  {tutor.subjects.map((item) => {
                    const subjectName = item?.subject?.name || item?.name || 'Subject';
                    const category = item?.subject?.category || item?.category || '';
                    const level = item?.level || 'All Levels';
                    const key = item?.id || `${subjectName}-${level}`;

                    return (
                      <div key={key} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{subjectName}</p>
                          {category && <p className="text-xs text-gray-400">{category}</p>}
                        </div>
                        <span className="text-xs text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-2 py-0.5">
                          {level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No subjects listed.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
              <div className="space-y-3 text-sm">
                {Number(tutor.yearsExperience) > 0 && (
                  <div className="flex items-start gap-2">
                    <BriefcaseIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Experience</p>
                      <p className="font-medium text-gray-700">{tutor.yearsExperience} years</p>
                    </div>
                  </div>
                )}

                {tutor.education && (
                  <div className="flex items-start gap-2">
                    <AcademicCapIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Education</p>
                      <p className="font-medium text-gray-700 text-xs leading-relaxed">
                        {Array.isArray(tutor.education)
                          ? tutor.education
                              .map((item) => [item?.degree, item?.field, item?.institution].filter(Boolean).join(', '))
                              .filter(Boolean)
                              .join(' | ')
                          : String(tutor.education)}
                      </p>
                    </div>
                  </div>
                )}

                {Array.isArray(tutor.languages) && tutor.languages.length > 0 && (
                  <div className="flex items-start gap-2">
                    <GlobeAltIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Languages</p>
                      <p className="font-medium text-gray-700">{tutor.languages.join(', ')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'availability' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Weekly Availability</h2>

          {isAvailabilityLoading ? (
            <p className="text-sm text-gray-500">Loading availability...</p>
          ) : availability.length === 0 ? (
            <p className="text-sm text-gray-500">No availability set.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2">Day</th>
                    <th className="pb-2">From</th>
                    <th className="pb-2">To</th>
                  </tr>
                </thead>
                <tbody>
                  {availability.map((slot, index) => (
                    <tr key={`${slot.dayOfWeek}-${slot.startTime}-${index}`} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 font-medium text-gray-800">
                        {WEEKDAY_LABELS[Number(slot.dayOfWeek)] || slot.dayOfWeek}
                      </td>
                      <td className="py-2.5 text-gray-600">{slot.startTime}</td>
                      <td className="py-2.5 text-gray-600">{slot.endTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
