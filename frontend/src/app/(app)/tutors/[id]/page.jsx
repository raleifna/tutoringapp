// src/app/(app)/tutors/[id]/page.jsx - Tutor detail page
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  GlobeAltIcon,
  MapPinIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { bookingApi, messageApi, tutorApi } from '../../../../lib/api-entry';
import { getAvatarUrl } from '../../../../lib/avatar';
import { BOOKING_DURATIONS } from '../../../../lib/tutor-options';
import { useAuthStore } from '../../../../lib/store';
import AvailabilityCalendar from '../../../../components/AvailabilityCalendar';
import BackButton from '../../../../components/BackButton';

const bookingSchema = z.object({
  subjectId: z.string().min(1, 'Please select a subject'),
  sessionType: z.enum(['ONLINE', 'IN_PERSON', 'HYBRID']),
  scheduledAt: z.string().min(1, 'Please select a date and time'),
  duration: z.coerce.number().min(30).max(360),
  bookingPeriod: z.string().optional(),
  notes: z.string().optional(),
});

const BOOKING_PERIOD_OPTIONS = [
  { value: '1_WEEK', label: '1 week', weeks: 1 },
  { value: '2_WEEKS', label: '2 weeks', weeks: 2 },
  { value: '1_MONTH', label: '1 month (4 weeks)', weeks: 4 },
  { value: '2_MONTHS', label: '2 months (8 weeks)', weeks: 8 },
  { value: '3_MONTHS', label: '3 months (12 weeks)', weeks: 12 },
];

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

const getVerifiedQualificationItems = (tutor) => {
  if (!Array.isArray(tutor?.certifications)) return [];

  return tutor.certifications
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      if (item.kind === 'file') return String(item.description || '').trim();
      return String(item.text || item.name || '').trim();
    })
    .filter(Boolean);
};

const getBookingPeriod = (value) =>
  BOOKING_PERIOD_OPTIONS.find((option) => option.value === value) || BOOKING_PERIOD_OPTIONS[0];

const addWeeks = (date, weeks) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + weeks * 7);
  return nextDate;
};

const createRecurringGroupId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `booking-series-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const formatBookingDate = (value) =>
  new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const getBookingErrorMessage = (error) =>
  error?.response?.data?.errors?.[0]?.message ||
  error?.response?.data?.message ||
  error?.message ||
  'Booking failed';

const buildRecurringBookingDates = (selectedSlots, periodWeeks) => {
  const dateMap = new Map();

  selectedSlots.forEach((slot) => {
    for (let weekIndex = 0; weekIndex < periodWeeks; weekIndex += 1) {
      const date = addWeeks(slot.date, weekIndex);
      dateMap.set(date.toISOString(), date);
    }
  });

  return [...dateMap.values()].sort((left, right) => left - right);
};

const getConflictingPreviewDates = (dates, duration, bookedSlots = []) => {
  const bookingDuration = Number(duration || 60);

  return dates.filter((date) => {
    const start = new Date(date);
    const end = new Date(start.getTime() + bookingDuration * 60 * 1000);

    return bookedSlots.some((slot) => {
      const bookedStart = new Date(slot?.scheduledAt);
      if (Number.isNaN(bookedStart.getTime())) return false;

      const bookedEnd = new Date(bookedStart.getTime() + Number(slot?.duration || 60) * 60 * 1000);
      return bookedStart < end && bookedEnd > start;
    });
  });
};

export default function TutorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('about');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const from = searchParams.get('from');
  const returnTo = searchParams.get('returnTo') || '';
  const searchFrom = (searchParams.get('searchFrom') || '').toLowerCase();
  const isFromTutorDashboard = from === 'tutor-dashboard';
  const fallbackBackHref = isFromTutorDashboard
    ? '/tutor/dashboard'
    : searchFrom
      ? `/search?from=${encodeURIComponent(searchFrom)}`
      : '/search';
  const backHref = returnTo || fallbackBackHref;
  const backLabel = 'Back';
  const showBackButton = Boolean(returnTo || isFromTutorDashboard || searchFrom || from);
  const tutorDetailHref = (() => {
    const params = searchParams.toString();
    return params ? `/tutors/${id}?${params}` : `/tutors/${id}`;
  })();

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
  const verifiedQualificationItems = getVerifiedQualificationItems(tutor);
  const availabilityState = availabilityData?.data?.data || {};
  const availability = availabilityState?.availability || [];
  const currentWeekAvailability = availabilityState?.currentWeekEffectiveAvailability || availability;
  const bookedSlots = availabilityState?.bookedSlots || [];
  const hasCurrentWeekAvailabilityOverride = Boolean(
    availabilityState?.hasCurrentWeekAvailabilityOverride
  );
  const isSelf = !!user && (user.id === tutor?.userId || user.id === tutor?.user?.id);
  const isLearner = user?.role === 'LEARNER';
  const isGuest = !user;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      subjectId: '',
      sessionType: 'ONLINE',
      scheduledAt: '',
      duration: 60,
      bookingPeriod: '1_WEEK',
      notes: '',
    },
  });
  const watchedBookingPeriod = watch('bookingPeriod');
  const watchedDuration = watch('duration');
  const selectedPeriod = getBookingPeriod(watchedBookingPeriod);
  const previewBookingDates = buildRecurringBookingDates(selectedSlots, selectedPeriod.weeks);
  const previewDuration = Number(watchedDuration || 0);
  const previewAmount =
    previewBookingDates.length * (Number(tutor?.hourlyRate || 0) * (previewDuration / 60));
  const conflictingPreviewDates = getConflictingPreviewDates(
    previewBookingDates,
    previewDuration,
    bookedSlots
  );

  const bookMutation = useMutation({
    mutationFn: (data) => {
      if (!selectedSlots.length) {
        throw new Error('Please select at least one available time slot');
      }

      const selectedSubject = tutor?.subjects?.find((item) => {
        const subjectId = String(item?.subjectId || item?.subject?.id || item?.id || '');
        return subjectId === String(data.subjectId);
      });

      const selectedSubjectName = selectedSubject?.subject?.name || selectedSubject?.name;
      if (!selectedSubjectName) {
        throw new Error('Please select a valid subject');
      }

      const period = getBookingPeriod(data.bookingPeriod);
      const bookingDates = buildRecurringBookingDates(selectedSlots, period.weeks);
      const recurringGroupId = bookingDates.length > 1 ? createRecurringGroupId() : undefined;
      const results = [];

      return (async () => {
        for (const date of bookingDates) {
          try {
            const response = await bookingApi.create({
              tutorId: id,
              subjectId: data.subjectId,
              subject: selectedSubjectName,
              sessionType: data.sessionType,
              scheduledAt: date.toISOString(),
              duration: Number(data.duration),
              notes: data.notes,
              recurringType: bookingDates.length > 1 ? 'WEEKLY' : 'ONE_OFF',
              ...(recurringGroupId ? { recurringGroupId } : {}),
            });
            results.push({ status: 'fulfilled', date, response });
          } catch (error) {
            results.push({ status: 'rejected', date, error });
          }
        }

        const successfulResponses = results
          .filter((result) => result.status === 'fulfilled')
          .sort((left, right) => left.date - right.date)
          .map((result) => result.response);
        const failedBookings = results
          .filter((result) => result.status === 'rejected')
          .sort((left, right) => left.date - right.date)
          .map((result) => ({
            date: result.date,
            message: getBookingErrorMessage(result.error),
          }));

        return {
          successfulResponses,
          failedBookings,
          totalCount: bookingDates.length,
        };
      })();
    },
    onSuccess: ({ successfulResponses, failedBookings, totalCount }) => {
      const successCount = successfulResponses.length;
      const failureCount = failedBookings.length;

      if (successCount === 0) {
        const firstFailure = failedBookings[0];
        toast.error(firstFailure?.message || 'No booking requests were created');
        return;
      }

      if (failureCount > 0) {
        const failedDates = failedBookings
          .slice(0, 3)
          .map((booking) => formatBookingDate(booking.date))
          .join(', ');
        const extraCount = failureCount > 3 ? ` +${failureCount - 3} more` : '';
        toast(
          `Booked ${successCount} of ${totalCount} sessions. Conflicts: ${failedDates}${extraCount}.`
        );
      } else {
        toast.success(
          totalCount > 1
            ? `${totalCount} sessions booked successfully.`
            : 'Session booked successfully.'
        );
      }

      reset();
      setSelectedSlots([]);
      setShowBookingForm(false);
      queryClient.invalidateQueries({ queryKey: ['tutor-availability', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings', user?.id, false] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: ['myBookings', 'dashboard', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['myBookings', 'calendar', user?.id] });
      const bookingId = successfulResponses?.[0]?.data?.data?.id;
      if (successCount === 1 && totalCount === 1 && bookingId) {
        router.push(`/bookings/${bookingId}`);
        return;
      }
      router.push('/bookings');
    },
    onError: (err) => {
      const message =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Booking failed';
      toast.error(message);
    },
  });

  const messageMutation = useMutation({
    mutationFn: () => messageApi.createConversation(tutor.userId),
    onSuccess: (res) => {
      const nextParams = new URLSearchParams();
      nextParams.set('conversationId', res.data.data.id);
      nextParams.set('returnTo', tutorDetailHref);
      router.push(`/messages?${nextParams.toString()}`);
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message || err?.message || 'Could not start conversation';
      toast.error(message);
    },
  });

  const requireLogin = () => {
    toast('Please log in to book a session.');
    router.push(`/login?next=/tutors/${id}`);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlots((current) => {
      const exists = current.some((item) => item.key === slot.key);
      const next = exists
        ? current.filter((item) => item.key !== slot.key)
        : [...current, slot].sort((left, right) => left.date - right.date);

      setValue('scheduledAt', next[0]?.date.toISOString() || '', { shouldValidate: true });
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 py-6">
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
          {showBackButton && (
            <BackButton href={backHref} label={backLabel} />
          )}
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-600 mb-3">Tutor not found.</p>
        {showBackButton && (
          <BackButton href={backHref} label={backLabel} />
        )}
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 space-y-5">
      {showBackButton && (
        <div className="flex justify-end">
          <BackButton href={backHref} label={backLabel} />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <img
            src={getAvatarUrl(tutor?.user?.avatar, tutor?.user?.firstName, tutor?.user?.lastName, {
              fallbackName: 'Tutor',
            })}
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

              <div className="text-left sm:text-right">
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

            {!isSelf && (isLearner || isGuest) && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isGuest) return requireLogin();
                    setSelectedSlots([]);
                    setShowBookingForm(true);
                  }}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <CalendarDaysIcon className="w-4 h-4" />
                  {isGuest ? 'Log In to Book' : 'Book a Session'}
                </button>

                {!isGuest && (
                  <button
                    type="button"
                    onClick={() => messageMutation.mutate()}
                    disabled={messageMutation.isPending}
                    className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    {messageMutation.isPending ? 'Opening' : 'Message Tutor'}
                  </button>
                )}
              </div>
            )}
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
                              .map((item) =>
                                [item?.degree, item?.field, item?.institution, item?.text]
                                  .filter(Boolean)
                                  .join(', ')
                              )
                              .filter(Boolean)
                              .join(' | ')
                          : String(tutor.education)}
                      </p>
                    </div>
                  </div>
                )}

                {tutor.isVerified && verifiedQualificationItems.length > 0 && (
                  <div className="flex items-start gap-2">
                    <CheckBadgeIcon className="w-4 h-4 text-primary-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Verified Qualifications</p>
                      <div className="mt-1 space-y-1">
                        {verifiedQualificationItems.map((item, index) => (
                          <p key={`${item}-${index}`} className="font-medium text-gray-700 text-xs leading-relaxed">
                            {item}
                          </p>
                        ))}
                      </div>
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

      {showBookingForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Book a Session with {getTutorName(tutor)}</h2>

            <form onSubmit={handleSubmit((data) => bookMutation.mutate(data))} className="space-y-4">
              <div>
                <label className="label">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select {...register('subjectId')} className="input">
                  <option value="">Select subject...</option>
                  {tutor.subjects?.map((item) => {
                    const subjectId = String(item?.subjectId || item?.subject?.id || item?.id || '');
                    const subjectName = item?.subject?.name || item?.name || 'Subject';
                    return (
                      <option key={subjectId} value={subjectId}>
                        {subjectName}
                      </option>
                    );
                  })}
                </select>
                {errors.subjectId && <p className="error-text">{errors.subjectId.message}</p>}
              </div>

              <div>
                <label className="label">
                  Session Type <span className="text-red-500">*</span>
                </label>
                <select {...register('sessionType')} className="input">
                  {(Array.isArray(tutor.sessionTypes) && tutor.sessionTypes.length > 0
                    ? tutor.sessionTypes
                    : ['ONLINE', 'IN_PERSON', 'HYBRID']
                  ).map((item) => (
                    <option key={item} value={item}>
                      {String(item).replace('_', '-')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">
                  Dates & Times <span className="text-red-500">*</span>
                </label>
                <p className="mb-2 text-sm text-gray-500">
                  Click multiple available cells to send more than one booking request.
                </p>
                {hasCurrentWeekAvailabilityOverride && (
                  <p className="mb-2 text-sm text-amber-700">
                    This week includes temporary availability changes from the tutor.
                  </p>
                )}
                <input type="hidden" {...register('scheduledAt')} />
                <AvailabilityCalendar
                  slots={availability}
                  currentWeekSlots={currentWeekAvailability}
                  hasCurrentWeekOverride={hasCurrentWeekAvailabilityOverride}
                  bookedSlots={bookedSlots}
                  mode="select"
                  selectedKeys={selectedSlots.map((slot) => slot.key)}
                  onSelect={handleSlotSelect}
                />
                {selectedSlots.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Selected {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSlots.map((slot) => (
                        <span
                          key={slot.key}
                          className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs text-primary-700"
                        >
                          {slot.date.toLocaleString('en-AU')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {errors.scheduledAt && <p className="error-text">{errors.scheduledAt.message}</p>}
              </div>

              <div>
                <label className="label">Duration (minutes)</label>
                <select {...register('duration')} className="input">
                  {BOOKING_DURATIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} minutes
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Booking period</label>
                <select {...register('bookingPeriod')} className="input">
                  {BOOKING_PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Repeats weekly on the same day and time. If one week fails, later weeks will still be submitted.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Booking summary
                </p>
                {previewBookingDates.length > 0 ? (
                  <div className="mt-2 space-y-1 text-gray-700">
                    <p>
                      {previewBookingDates.length} booking request
                      {previewBookingDates.length === 1 ? '' : 's'} will be created across{' '}
                      {selectedPeriod.weeks} week{selectedPeriod.weeks === 1 ? '' : 's'}.
                    </p>
                    <p>
                      Estimated total:{' '}
                      <span className="font-semibold text-gray-900">
                        {formatRate(previewAmount, tutor?.currency || 'AUD')}
                      </span>
                    </p>
                    {conflictingPreviewDates.length > 0 && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {conflictingPreviewDates.length} selected session
                        {conflictingPreviewDates.length === 1 ? ' has' : 's have'} a time conflict. If you continue,
                        only the available sessions will be booked.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-gray-600">
                    Select at least one available time slot to preview the recurring booking.
                  </p>
                )}
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  className="input resize-none"
                  placeholder="Topics you'd like to cover..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={bookMutation.isPending} className="btn-primary flex-1">
                  {bookMutation.isPending ? 'Sending...' : selectedSlots.length > 1 ? 'Send Requests' : 'Send Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
