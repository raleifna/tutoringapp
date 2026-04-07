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
  CheckCircleIcon,
  StarIcon,
  UserCircleIcon,
  BellIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../../lib/store';
import { bookingApi } from '../../../lib/api-entry';
import toast from 'react-hot-toast';

const getAvatarUrl = (avatar, firstName, lastName) => {
  if (avatar) return avatar;
  const name = `${firstName || ''} ${lastName || ''}`.trim() || 'Tutor';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`;
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

const getStatusClass = (status) => {
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (status === 'ACCEPTED') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (status === 'COMPLETED') return 'bg-green-50 text-green-700 border border-green-200';
  if (status === 'CANCELLED') return 'bg-gray-100 text-gray-700 border border-gray-200';
  if (status === 'DECLINED') return 'bg-red-50 text-red-700 border border-red-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
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

const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const currentUserId = user?.id || '';

  useEffect(() => {
    setMounted(true);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const handleMarkAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    toast.success('Notification marked as read');
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
    setIsNotificationOpen(false);
  };

  const handleNotificationAction = (notification) => {
    if (notification.link) {
      router.push(notification.link);
      setIsNotificationOpen(false);
    }
  };

  const recentNotifications = notifications.slice(0, 10);

  const displayName = mounted ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : '';
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['myBookings', 'dashboard', currentUserId],
    queryFn: () => bookingApi.getMyBookings({ limit: 5 }),
    enabled: !!currentUserId,
  });

  const bookings = bookingsData?.data?.data?.bookings || [];
  const totalBookings = bookingsData?.data?.data?.pagination?.total || 0;
  const completedCount = bookings.filter((item) => item.status === 'COMPLETED').length;
  const pendingCount = bookings.filter((item) => item.status === 'PENDING').length;
  const upcomingCount = bookings.filter((item) => item.status === 'ACCEPTED').length;

  const summaryItems = [
    {
      label: 'Total Bookings',
      value: totalBookings,
      icon: CalendarDaysIcon,
      color: 'bg-blue-100 text-blue-600',
      href: '/bookings?from=dashboard',
    },
    {
      label: 'Completed',
      value: completedCount,
      icon: CheckCircleIcon,
      color: 'bg-green-100 text-green-600',
      href: '/bookings?from=dashboard&status=COMPLETED',
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
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-5 text-white -mx-4 -mt-4 px-8 pt-6 rounded-t-none relative">
        <p className="text-primary-200 text-xs font-medium mb-0.5">Good day 👋</p>
        <h1 className="text-xl font-bold">
          {displayName}
        </h1>
        <p className="text-primary-200 text-sm mt-1">Ready to continue learning?</p>
        
        {/* Notification Bell Button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={handleNotificationClick}
            className="relative p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <BellIcon className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* Notification Dropdown */}
          {isNotificationOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              
              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <BellIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => handleNotificationAction(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {notification.message}
                          </p>
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                            title="Mark as read"
                          >
                            <EyeIcon className="w-3 h-3 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Footer */}
              <div className="p-3 border-t border-gray-100">
                <Link
                  href="/notifications"
                  className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                  onClick={() => setIsNotificationOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>
        
        <button onClick={handleLogout} className="btn-secondary mt-4">
          Log out
        </button>
        <Link href="/profile" className="btn-secondary mt-2 ml-2">
          My Profile
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {summaryItems.map((item) => (
          <Link key={item.label} href={item.href} className="card p-4 hover:shadow-md transition-shadow">
            <div
              className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center mb-2.5`}
            >
              <item.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{isLoading ? '-' : item.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Bookings</h2>
          <Link href="/bookings?from=dashboard" className="text-xs text-primary-600 font-medium">
            View all →
          </Link>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
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
            bookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}?from=dashboard`}
                className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors"
              >
                <img
                  src={getAvatarUrl(
                    booking.tutorProfile?.user?.avatar,
                    booking.tutorProfile?.user?.firstName,
                    booking.tutorProfile?.user?.lastName
                  )}
                  alt={booking.tutorProfile?.user?.firstName || 'Tutor'}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {booking.subject || 'Session'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    with {booking.tutorProfile?.user?.firstName || 'Tutor'} ·{' '}
                    {formatDate(booking.scheduledAt)}
                  </p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getStatusClass(booking.status)}`}>
                  {(booking.status || '').toLowerCase()}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Continue to the tutor search page and explore available tutors.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
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