'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { notificationApi } from '../lib/api-entry';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  BellIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

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


const NotificationBox = ({ currentUserId }) => {

  const router = useRouter();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  // ============= notifications ===============
    const { data: notificationsData, refetch: fetchNotifications } = useQuery({
      queryKey: ['notifications', currentUserId],
      queryFn: () => notificationApi.search({ 
        page: 1, 
        limit: 10 
      }),
      enabled: !!currentUserId,
      keepPreviousData: true,
    });

    const recentNotifications = notificationsData?.data?.data?.notifications || [];
    const notifications = notificationsData?.data?.data?.notifications || [];
  
    const unreadCount = notifications.filter(n => !n.read).length;
  
    const handleNotificationClick = () => {
      setIsNotificationOpen(!isNotificationOpen);
    };
  
    const handleMarkAsRead = async (notificationId) => {
      try {
        await notificationApi.markAsRead(notificationId);
        fetchNotifications();
        toast.success('Notification marked as read');
      } catch (error) {
        toast.error('Failed to mark notification as read');
      }
    };
  
    const handleMarkAllAsRead = async () => {
      try {
        await notificationApi.markAsRead('all');
        fetchNotifications();
        toast.success('All notifications marked as read');
      } catch (error) {
        toast.error('Failed to mark all notifications as read');
      }
    };
  
    const handleNotificationAction = (notification) => {
      if (notification.link) {
        router.push(notification.link);
        setIsNotificationOpen(false);
      }
    };
  
    
  
    // ============= notifications ===============

  return (
    <>
        <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
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
            <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white shadow-lg sm:w-80">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-right text-xs font-medium text-primary-600 hover:text-primary-700"
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
                      className={`cursor-pointer border-b border-gray-50 p-3 transition-colors hover:bg-gray-50 ${
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
    
    </>
  );
};

export default NotificationBox;
