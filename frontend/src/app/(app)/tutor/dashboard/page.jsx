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
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { bookingApi, tutorApi } from '../../../../lib/api-entry';
import { useAuthStore } from '../../../../lib/store';

const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

const formatCurrency = (amount, currency = 'AUD') => {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return '$0';
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency || 'AUD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value}`;
  }
};

const formatDate = (dateTime) => {
  if (!dateTime) return '-';
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDuration = (minutes) => {
  const value = Number(minutes || 0);
  if (!value) return '0 mins';
  if (value % 60 === 0) return `${value / 60} hr`;
  return `${value} mins`;
};

const getAvatarUrl = (avatar, firstName, lastName) => {
  if (avatar) return avatar;
  const name = `${firstName || ''} ${lastName || ''}`.trim() || 'Learner';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`;
};

export default function TutorDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayName = mounted ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : '';

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['tutor-requests', 'PENDING'],
    queryFn: () => bookingApi.getTutorBookings({ status: 'PENDING', limit: 5 }),
  });

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['tutor-bookings', 'ACCEPTED'],
    queryFn: () => bookingApi.getTutorBookings({ status: 'ACCEPTED', limit: 5 }),
  });

  const { data: allBookingsData } = useQuery({
    queryKey: ['tutor-bookings-all'],
    queryFn: () => bookingApi.getTutorBookings({ limit: 100 }),
  });

  const { data: myProfileData } = useQuery({
    queryKey: ['tutor-public-profile-id'],
    queryFn: () => tutorApi.getMyProfile(),
    enabled: user?.role === 'TUTOR',
  });

  const requests = requestsData?.data?.data?.bookings || [];
  const upcomingBookings = upcomingData?.data?.data?.bookings || [];
  const allBookings = allBookingsData?.data?.data?.bookings || [];

  const completedBookings = allBookings.filter((booking) => booking.status === 'COMPLETED');
  const totalEarnings = completedBookings.reduce(
    (sum, booking) => sum + Number(booking.totalAmount || 0),
    0
  );
  const tutorPublicId = myProfileData?.data?.data?.id || user?.tutorProfileId || null;
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

  if (!user?.tutorProfile && !user?.tutorProfileId) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <StarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Complete Your Tutor Profile</h2>
        <p className="text-gray-500 mb-6 text-sm">
          Set up your profile to start receiving booking requests from learners.
        </p>
        <Link href="/tutor/profile" className="btn-primary">
          Set Up Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-5 text-white -mx-4 -mt-4 px-8 pt-6 rounded-t-none">
        <p className="text-primary-200 text-xs font-medium mb-0.5">Good day 👋</p>
        <h1 className="text-xl font-bold">{displayName}</h1>
        <p className="text-primary-200 text-sm mt-1">Welcome back, {user?.firstName}! Here's your overview.</p>
        <button onClick={handleLogout} className="btn-secondary mt-4">
          Log out
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        <div className="flex items-center justify-between mb-4">
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
                  href={`/bookings/${booking.id}?from=tutor-requests`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={getAvatarUrl(learner?.avatar, learner?.firstName, learner?.lastName)}
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
                  <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Upcoming Sessions</h2>
          <Link
            href="/bookings"
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
                  href={`/bookings/${booking.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={getAvatarUrl(learner?.avatar, learner?.firstName, learner?.lastName)}
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
                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
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
              <ArrowRightIcon className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
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
