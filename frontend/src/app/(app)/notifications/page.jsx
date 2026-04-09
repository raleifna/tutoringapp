// src/app/(app)/notifications/page.jsx - Notifications list page
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  BellIcon, 
  CalendarDaysIcon, 
  CheckCircleIcon, 
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon 
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../../lib/store';
import toast from 'react-hot-toast';
import { notificationApi } from '../../../lib/api';
import BackButton from '../../../components/BackButton';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

const STATUS_VALUES = new Set(STATUS_TABS.map((item) => item.value));

const getInitialStatus = (value) => {
  const next = String(value || '').toLowerCase();
  return STATUS_VALUES.has(next) ? next : '';
};

const formatTimeAgo = (timestamp) => {
  // timestamp is string, convert to Date object
  if (typeof timestamp === 'string') {
    timestamp = new Date(timestamp);
  }

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

const getNotificationTypeIcon = (type) => {
  switch (type) {
    case 'booking':
      return CalendarDaysIcon;
    case 'message':
      return BellIcon;
    case 'payment':
      return CheckCircleIcon;
    case 'review':
      return BellIcon;
    default:
      return BellIcon;
  }
};

const getNotificationTypeColor = (type) => {
  switch (type) {
    case 'booking':
      return 'bg-blue-100 text-blue-600';
    case 'message':
      return 'bg-green-100 text-green-600';
    case 'payment':
      return 'bg-purple-100 text-purple-600';
    case 'review':
      return 'bg-amber-100 text-amber-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

function NotificationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const fromParam = (searchParams.get('from') || '').toLowerCase();
  const { user } = useAuthStore();
  const currentUserId = user?.id || '';
  const [activeStatus, setActiveStatus] = useState(() => getInitialStatus(statusParam));
  const [page, setPage] = useState(1);
  const showBackButton = Boolean(fromParam);
  
  const fallbackBackHrefMap = {
    home: '/',
    dashboard: '/dashboard',
    bookings: '/bookings',
    search: '/search',
    profile: '/profile',
  };
  const fallbackBackHref = fallbackBackHrefMap[fromParam] || '/';

  useEffect(() => {
    setActiveStatus(getInitialStatus(statusParam));
    setPage(1);
  }, [statusParam]);

  const handleBack = () => {
    router.push(fallbackBackHref);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['notifications', currentUserId, activeStatus, page],
    queryFn: () => notificationApi.search({ 
      status: activeStatus, 
      page, 
      limit: 10 
    }),
    enabled: !!currentUserId,
    keepPreviousData: true,
  });

  const notifications = data?.data?.data?.notifications || [];
  const pagination = data?.data?.data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.page || page;

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      refetch();
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAsRead('all');
      refetch();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-gray-600">Stay updated with your tutoring activities</p>
        </div>
        {showBackButton && (
          <BackButton
            onClick={handleBack}
          />
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">Manage unread items and review activity updates.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
          <button
              onClick={handleMarkAllAsRead}
              className="btn-secondary btn-sm gap-1.5"
              disabled={isFetching}
          >
              <CheckCircleIcon className="w-4 h-4" />
              Mark All as Read
          </button>
          <button
              onClick={async () => { await notificationApi.addTestsData(); refetch(); }}
              className="btn-secondary btn-sm gap-1.5"
              disabled={isFetching}
          >
              <CheckCircleIcon className="w-4 h-4" />
              Add 20 Test Data
          </button>
        </div>
      </div>

      {/* Header Actions */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setActiveStatus(tab.value);
                setPage(1);
              }}
              className={`flex-1 whitespace-nowrap px-3 py-2.5 -mb-px text-center text-sm font-medium border-b-2 transition-colors ${
                activeStatus === tab.value
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700 mb-2">
            {error?.response?.data?.message || 'Failed to load notifications.'}
          </p>
          <button type="button" onClick={() => refetch()} className="btn-primary btn-sm">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !isError && notifications.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <BellIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">No notifications found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {activeStatus ? `No ${activeStatus} notifications` : "You don't have any notifications yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onClick={handleNotificationClick}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && isFetching && (
        <p className="text-xs text-gray-400 text-center">Updating notifications...</p>
      )}

      {!isLoading && !isError && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => value - 1)}
            disabled={currentPage <= 1}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((value) => value + 1)}
            disabled={currentPage >= totalPages}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationCard({ notification, onMarkAsRead, onClick }) {
  const IconComponent = getNotificationTypeIcon(notification.type);
  
  return (
    <div
      onClick={() => onClick(notification)}
      className={`bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-100 transition-all cursor-pointer ${
        !notification.read ? 'bg-blue-50/30 border-blue-200' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationTypeColor(notification.type)}`}>
          <IconComponent className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {notification.title}
              </h3>
              <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
            </div>
            
            <div className="flex items-center gap-2">
              {!notification.read && (
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
              <span className="text-xs text-gray-400">
                {formatTimeAgo(notification.timestamp)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${
              notification.type === 'booking' ? 'bg-blue-100 text-blue-700' :
              notification.type === 'message' ? 'bg-green-100 text-green-700' :
              notification.type === 'payment' ? 'bg-purple-100 text-purple-700' :
              notification.type === 'review' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {notification.type}
            </span>
            
            {!notification.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <EyeIcon className="w-3 h-3" />
                Mark as read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsPageFallback() {
  return (
    <div className="space-y-5">
      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse h-24" />
        ))}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsPageFallback />}>
      <NotificationsPageContent />
    </Suspense>
  );
}
