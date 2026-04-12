// src/app/(app)/tutor/dashboard/page.jsx - Tutor Dashboard
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  CalendarDaysIcon,
  CurrencyDollarIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { bookingApi, tutorApi } from '../../../../lib/api-entry';
import { getAvatarUrl } from '../../../../lib/avatar';
import { formatCurrency, formatDuration, formatShortDateTime as formatDate } from '../../../../lib/formatters';
import { useAuthStore } from '../../../../lib/store';
import { cn } from '../../../../lib/utils';

export default function TutorDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const currentUserId = user?.id || '';

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['tutor-requests', currentUserId, 'PENDING'],
    queryFn: () => bookingApi.getTutorBookings({ status: 'PENDING', limit: 5 }),
    enabled: mounted && !!currentUserId,
  });

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['tutor-bookings', currentUserId, 'ACCEPTED'],
    queryFn: () => bookingApi.getTutorBookings({ status: 'ACCEPTED', limit: 5 }),
    enabled: mounted && !!currentUserId,
  });

  const { data: allBookingsData } = useQuery({
    queryKey: ['tutor-bookings-all', currentUserId],
    queryFn: () => bookingApi.getTutorBookings({ limit: 100 }),
    enabled: mounted && !!currentUserId,
  });

  const { data: myProfileData, isLoading: myProfileLoading } = useQuery({
    queryKey: ['tutor-public-profile-id', currentUserId],
    queryFn: () => tutorApi.getMyProfile(),
    enabled: mounted && user?.role === 'TUTOR' && !!currentUserId,
    retry: false,
  });

  const requests = requestsData?.data?.data?.bookings || [];
  const upcomingBookings = upcomingData?.data?.data?.bookings || [];
  const allBookings = allBookingsData?.data?.data?.bookings || [];
  const myProfile = myProfileData?.data?.data || null;
  const tutorProfileId = myProfile?.id || user?.tutorProfileId || user?.tutorProfile?.id || null;
  const tutorProfileStatus = myProfile?.status || user?.tutorProfile?.status || null;
  const hasTutorProfile = Boolean(tutorProfileId);
  const shouldWaitForTutorProfile =
    mounted && user?.role === 'TUTOR' && !!currentUserId && myProfileLoading && !user?.tutorProfile;

  const completedBookings = allBookings.filter((booking) => booking.status === 'COMPLETED');
  const totalEarnings = completedBookings.reduce(
    (sum, booking) => sum + Number(booking.totalAmount || 0),
    0
  );
  const tutorPublicId = tutorProfileId;
  const viewAsLearnerHref = tutorPublicId ? `/tutors/${tutorPublicId}` : '/tutor/profile';
  const viewAsLearnerNavHref = viewAsLearnerHref.startsWith('/tutors/')
    ? `${viewAsLearnerHref}?from=tutor-dashboard`
    : viewAsLearnerHref;

  const stats = [
    {
      label: 'Pending Requests',
      value: requestsData?.data?.data?.pagination?.total || 0,
      icon: ClockIcon,
      color: 'text-yellow-600 bg-yellow-50',
      href: '/tutor/requests?status=PENDING',
    },
    {
      label: 'Upcoming Sessions',
      value: upcomingData?.data?.data?.pagination?.total || 0,
      icon: CalendarDaysIcon,
      color: 'text-blue-600 bg-blue-50',
      href: '/tutor/requests?status=ACCEPTED',
    },
    {
      label: 'Completed Sessions',
      value: completedBookings.length,
      icon: CheckCircleIcon,
      color: 'text-green-600 bg-green-50',
      href: '/tutor/requests?status=COMPLETED',
    },
    {
      label: 'Total Earnings',
      value: formatCurrency(totalEarnings),
      icon: CurrencyDollarIcon,
      color: 'text-purple-600 bg-purple-50',
      href: null,
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!mounted) {
    return <div className="space-y-5" />;
  }

  if (shouldWaitForTutorProfile) {
    return <div className="space-y-5" />;
  }

  if (!hasTutorProfile || tutorProfileStatus !== 'ACTIVE') {
    const title = !hasTutorProfile
      ? 'Complete Your Tutor Profile'
      : tutorProfileStatus === 'PENDING'
        ? 'Tutor Verification In Review'
        : 'Tutor Verification Required';
    const description = !hasTutorProfile
      ? 'Set up your profile to start receiving booking requests from learners.'
      : tutorProfileStatus === 'PENDING'
        ? 'Your tutor application is under admin review. Open your profile to review your submission.'
        : 'Your tutor profile is not active yet. Open your profile to review feedback and update your submission.';
    const actionLabel = !hasTutorProfile ? 'Set Up Profile' : 'Open Tutor Profile';

    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <StarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 mb-6 text-sm">{description}</p>
        <Link href="/tutor/profile" className="btn-primary">
          {actionLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 p-4 text-white sm:p-5">
        <p className="text-primary-200 text-xs font-medium mb-0.5">Good day 👋</p>
        <h1 className="text-xl font-bold">{displayName}</h1>
        <p className="text-primary-200 text-sm mt-1">Welcome back, {user?.firstName}! Here's your overview.</p>
        <div className="mt-4 pr-12 sm:pr-0">
          <button onClick={handleLogout} className="btn-secondary">
            Log out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'card p-4',
              stat.href && 'cursor-pointer hover:shadow-md transition-shadow'
            )}
          >
            {stat.href ? (
              <Link href={stat.href} className="block h-full">
                <StatCardContent stat={stat} />
              </Link>
            ) : (
              <StatCardContent stat={stat} />
            )}
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Pending Requests</h2>
          <Link
            href="/tutor/requests"
            className="text-sm text-primary-600 hover:underline flex items-center gap-1"
          >
            View all <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        {requestsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No pending requests</p>
        ) : (
          <div className="space-y-2">
            {requests.map((booking) => {
              const learner = booking.learner;
              return (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}?returnTo=${encodeURIComponent('/tutor/dashboard')}&from=tutor-dashboard`}
                  className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                >
                  <img
                    src={getAvatarUrl(learner?.avatar, learner?.firstName, learner?.lastName, {
                      fallbackName: 'Learner',
                      ignoreTemporary: true,
                    })}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">
                      {learner?.firstName} {learner?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {booking.subject} · {formatDate(booking.scheduledAt)}
                    </p>
                  </div>
                  <span className="mt-0.5 shrink-0 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    Pending
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Upcoming Sessions</h2>
          <Link
            href="/bookings?from=tutor-dashboard"
            className="text-sm text-primary-600 hover:underline flex items-center gap-1"
          >
            View all <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        {upcomingLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : upcomingBookings.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No upcoming sessions</p>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.map((booking) => {
              const learner = booking.learner;
              return (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}?returnTo=${encodeURIComponent('/tutor/dashboard')}&from=tutor-dashboard`}
                  className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                >
                  <img
                    src={getAvatarUrl(learner?.avatar, learner?.firstName, learner?.lastName, {
                      fallbackName: 'Learner',
                      ignoreTemporary: true,
                    })}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">
                      {learner?.firstName} {learner?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {booking.subject} · {formatDate(booking.scheduledAt)} ·{' '}
                      {formatDuration(booking.duration)}
                    </p>
                  </div>
                  <span className="mt-0.5 shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    Confirmed
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Manage Profile',
            desc: 'Update subjects, rates, availability',
            href: '/tutor/profile',
            color: 'bg-primary-600',
          },
          {
            label: 'Booking Requests',
            desc: 'Accept or decline requests',
            href: '/tutor/requests',
            color: 'bg-green-600',
          },
          {
            label: 'Messages',
            desc: 'Open learner chats',
            href: '/messages',
            color: 'bg-blue-600',
          },
          {
            label: 'View as Learner',
            desc: 'See your public profile',
            href: viewAsLearnerNavHref,
            color: 'bg-purple-600',
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="card p-5 hover:shadow-md transition-shadow group"
          >
            <div
              className={cn(
                'w-10 h-10 rounded-lg mb-3 flex items-center justify-center',
                item.color
              )}
            >
              {item.label === 'Messages' ? (
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
              ) : (
                <ArrowRightIcon className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
              )}
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">{item.label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCardContent({ stat }) {
  return (
    <div className="flex h-full min-w-0 flex-col gap-2.5">
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0',
          stat.color
        )}
      >
        <stat.icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-2xl font-bold text-gray-900">
          {stat.value}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 whitespace-nowrap">
          {stat.label}
        </p>
      </div>
    </div>
  );
}
