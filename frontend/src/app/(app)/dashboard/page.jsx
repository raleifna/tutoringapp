// src/app/(app)/dashboard/page.jsx - Learner Dashboard
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  StarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../../lib/store';
import { bookingApi } from '../../../lib/api-entry';
import BookingCalendar from '../../../components/BookingCalendar';
import { getAvatarUrl } from '../../../lib/avatar';
import { formatBookingStatus, getBookingStatusClass as getStatusClass } from '../../../lib/booking-status';
import { formatShortDateTime as formatDate } from '../../../lib/formatters';

const getTutorDetailHref = (booking, returnTo = '/dashboard') => {
  const tutorId = booking?.tutorProfile?.id || booking?.tutor?.id || booking?.tutorId;
  if (!tutorId) return null;
  return `/tutors/${tutorId}?returnTo=${encodeURIComponent(returnTo)}`;
};

// Mock notification data - replace with actual API calls
const mockNotifications = [
  {
    id: 1,
    type: 'booking',
    title: 'New Booking Request',
    message: 'John Smith requested a Math session for tomorrow',
    timestamp: new Date(Date.now() - 300000), // 5 minutes ago
    read: false,
    link: '/tutor/requests'
  },
  {
    id: 2,
    type: 'booking',
    title: 'Booking Confirmed',
    message: 'Your Science session with Dr. Brown has been confirmed',
    timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
    read: false,
    link: '/bookings'
  },
  {
    id: 3,
    type: 'system',
    title: 'System Update',
    message: 'New features available! Check out the updated dashboard',
    timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    read: true,
    link: '/dashboard'
  },
  {
    id: 4,
    type: 'message',
    title: 'New Message',
    message: 'You have a new message from your tutor',
    timestamp: new Date(Date.now() - 7200000), // 2 hours ago
    read: true,
    link: '/messages'
  },
  {
    id: 5,
    type: 'booking',
    title: 'Session Reminder',
    message: 'Your English session starts in 1 hour',
    timestamp: new Date(Date.now() - 86400000), // 1 day ago
    read: true,
    link: '/bookings'
  }
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const currentUserId = user?.id || '';
  const currentLocationLabel = user?.ipLocationLabel?.trim() || null;

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const timeZone = user?.timeZone?.trim() || 'Australia/Sydney';

  const formattedTime = time.toLocaleTimeString({
    timeZone: timeZone,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayName = mounted ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : '';
  console.log(user);
  const {
    data: bookingsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['myBookings', 'dashboard', currentUserId],
    queryFn: () => bookingApi.getMyBookings({ limit: 5 }),
    enabled: mounted && !!accessToken && !!currentUserId,
  });

  // fetch more bookings for the calendar view
  const { data: calendarData } = useQuery({
    queryKey: ['myBookings', 'calendar', currentUserId],
    queryFn: () => bookingApi.getMyBookings({ limit: 50 }),
    enabled: mounted && !!accessToken && !!currentUserId,
  });
  const calendarBookings = calendarData?.data?.data?.bookings || [];

  const bookings = bookingsData?.data?.data?.bookings || [];
  const totalBookings = bookingsData?.data?.data?.pagination?.total || 0;
  const completedCount = bookings.filter((item) => item.status === 'COMPLETED').length;
  const unpaidCount = bookings.filter((item) => item.status === 'UNPAID').length;
  const pendingCount = bookings.filter((item) => item.status === 'PENDING').length;
  const upcomingCount = bookings.filter((item) => item.status === 'ACCEPTED').length;

  const summaryItems = [
    {
      label: 'Unpaid',
      value: unpaidCount,
      icon: ClockIcon,
      color: 'bg-orange-100 text-orange-600',
      href: '/bookings?from=dashboard&status=UNPAID',
    },
    {
      label: 'Pending',
      value: pendingCount,
      icon: ClockIcon,
      color: 'bg-amber-100 text-amber-600',
      href: '/bookings?from=dashboard&status=PENDING',
    },
    {
      label: 'Upcoming',
      value: upcomingCount,
      icon: StarIcon,
      color: 'bg-purple-100 text-purple-600',
      href: '/bookings?from=dashboard&status=ACCEPTED',
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="space-y-5">
      {/* welcome Header */}
      <div className="flex rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 p-4 text-white sm:p-5 items-center">
        <div className='flex-1'>
          <p className="text-primary-200 text-xs font-medium mb-0.5">Good day 👋</p>
          <h1 className="text-xl font-bold">
            {displayName}
          </h1>
          <p className="text-primary-200 text-sm mt-1">Ready to continue learning?</p>
          <div className="mt-4 flex flex-wrap gap-2 pr-12 sm:pr-0">
            <button onClick={handleLogout} className="btn-secondary btn-sm rounded-full px-4">
              Log out
            </button>
          </div>
        </div>
        <div className='text-xl font-bold'>
          {currentLocationLabel} {formattedTime}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3">
        {summaryItems.map((item) => (
          <Link key={item.label} href={item.href} className="card p-4 hover:shadow-md transition-shadow">
            <div
              className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center mb-2.5`}
            >
              <item.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading && !bookingsData ? '-' : item.value}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Recent Bookings</h2>
          <Link href="/bookings?from=dashboard" className="text-xs text-primary-600 font-medium">
            View all →
          </Link>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading && !bookingsData ? (
            <div className="py-8 px-4 text-sm text-gray-500">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="py-10 text-center text-gray-500 px-4">
              <CalendarDaysIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-700 mb-1">No bookings yet</p>
              <p className="text-xs text-gray-400 mb-4">Start by finding a tutor</p>
              <Link href="/search?from=dashboard" className="btn-primary btn-sm rounded-full">
                Book a session
              </Link>
            </div>
          ) : (
            bookings.map((booking) => {
              const tutorDetailHref = getTutorDetailHref(booking, '/dashboard');

              return (
                <div
                  key={booking.id}
                  className="flex items-start gap-3 px-4 py-3 transition-colors active:bg-gray-50"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {tutorDetailHref ? (
                      <Link
                        href={tutorDetailHref}
                        className="group rounded-full transition-transform hover:scale-[1.03]"
                      >
                        <img
                          src={getAvatarUrl(
                            booking.tutorProfile?.user?.avatar,
                            booking.tutorProfile?.user?.firstName,
                            booking.tutorProfile?.user?.lastName,
                            { fallbackName: 'Tutor' }
                          )}
                          alt={booking.tutorProfile?.user?.firstName || 'Tutor'}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-0 transition-shadow group-hover:shadow-md group-hover:ring-2 group-hover:ring-sky-100"
                        />
                      </Link>
                    ) : (
                      <img
                        src={getAvatarUrl(
                          booking.tutorProfile?.user?.avatar,
                          booking.tutorProfile?.user?.firstName,
                          booking.tutorProfile?.user?.lastName,
                          { fallbackName: 'Tutor' }
                        )}
                        alt={booking.tutorProfile?.user?.firstName || 'Tutor'}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <Link
                      href={`/bookings/${booking.id}?returnTo=${encodeURIComponent('/dashboard')}&from=dashboard`}
                      className="min-w-0 flex-1 rounded-xl p-1 -m-1 transition-colors hover:bg-gray-50"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {booking.subject || 'Session'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        with {booking.tutorProfile?.user?.firstName || 'Tutor'} ·{' '}
                        {formatDate(booking.scheduledAt)}
                      </p>
                    </Link>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`mt-0.5 text-[11px] px-2 py-0.5 rounded-full font-medium ${getStatusClass(booking.status)}`}>
                      {formatBookingStatus(booking.status)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isFetching && bookingsData && (
        <p className="text-xs text-gray-400 text-center">Refreshing dashboard...</p>
      )}

      <div className="card p-4">
        <BookingCalendar
          bookings={calendarBookings}
          isTutor={false}
          returnTo="/dashboard"
        />
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/search?from=dashboard"
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Find Tutor</div>
              <div className="text-xs text-gray-500">Search tutors by subject</div>
            </div>
          </Link>

          <Link
            href="/bookings?from=dashboard"
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <CalendarDaysIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">My Bookings</div>
              <div className="text-xs text-gray-500">View session details</div>
            </div>
          </Link>

          <Link
            href="/messages"
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Messages</div>
              <div className="text-xs text-gray-500">Open your chats</div>
            </div>
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <UserCircleIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">My Profile</div>
              <div className="text-xs text-gray-500">Update info & password</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
