// src/app/(app)/admin/dashboard/page.jsx - Admin Dashboard
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  UsersIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { adminApi } from '../../../../lib/api-entry';

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 2,
  }).format(value);
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

const getBookingStatusStyle = (status) => {
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (status === 'ACCEPTED') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (status === 'COMPLETED') return 'bg-green-50 text-green-700 border border-green-200';
  if (status === 'CANCELLED') return 'bg-gray-100 text-gray-700 border border-gray-200';
  if (status === 'DECLINED') return 'bg-red-50 text-red-700 border border-red-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
};

export default function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard(),
    refetchInterval: 60000,
  });

  const dashboard = data?.data?.data || {};
  const overview = dashboard?.overview || {};
  const recentBookings = Array.isArray(dashboard?.recentBookings) ? dashboard.recentBookings : [];

  const statCards = [
    {
      label: 'Total Users',
      value: overview.totalUsers ?? 0,
      icon: UsersIcon,
      iconColor: 'bg-blue-100 text-blue-600',
      href: '/admin/users',
    },
    {
      label: 'Total Tutors',
      value: overview.totalTutors ?? 0,
      icon: AcademicCapIcon,
      iconColor: 'bg-green-100 text-green-600',
      href: '/admin/tutors',
    },
    {
      label: 'Total Bookings',
      value: overview.totalBookings ?? 0,
      icon: CalendarDaysIcon,
      iconColor: 'bg-purple-100 text-purple-600',
      href: '/admin/operations?tab=bookings',
    },
    {
      label: 'Revenue (AUD)',
      value: formatCurrency(overview.totalRevenue || 0),
      icon: CurrencyDollarIcon,
      iconColor: 'bg-orange-100 text-orange-600',
      href: '/admin/analytics',
    },
    {
      label: 'Pending Tutors',
      value: overview.pendingTutors ?? 0,
      icon: ClockIcon,
      iconColor: 'bg-amber-100 text-amber-600',
      href: '/admin/tutors',
    },
  ];

  const quickActions = [
    { label: 'User Management', href: '/admin/users', icon: UsersIcon },
    { label: 'Tutor Review', href: '/admin/tutors', icon: AcademicCapIcon },
    { label: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
    { label: 'Operations', href: '/admin/operations', icon: CalendarDaysIcon },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-5 text-white -mx-4 -mt-4 px-8 pt-6 rounded-t-none">
        <p className="text-primary-200 text-xs font-medium mb-0.5">Admin Panel</p>
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <p className="text-primary-200 text-sm mt-1">Platform overview and key metrics</p>
      </div>

      {isError ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-red-600 mb-3">Failed to load dashboard data</p>
          <button type="button" onClick={() => refetch()} className="btn-primary btn-sm">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {(isLoading ? Array.from({ length: 6 }) : statCards).map((item, index) => {
              if (isLoading) {
                return <div key={index} className="card h-28 animate-pulse" />;
              }

              return (
                <Link key={item.label} href={item.href} className="card p-4 hover:shadow-md transition-shadow">
                  <div className={`w-9 h-9 rounded-xl ${item.iconColor} flex items-center justify-center mb-2.5`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
                </Link>
              );
            })}
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Recent Bookings</h2>
              <Link href="/admin/operations?tab=bookings" className="text-xs text-primary-600 font-medium">
                View all →
              </Link>
            </div>

            {isLoading ? (
              <div className="py-8 px-4 text-sm text-gray-500">Loading recent bookings...</div>
            ) : recentBookings.length === 0 ? (
              <div className="py-8 px-4 text-sm text-gray-500">No bookings found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                      <th className="py-2 px-4 text-left">Learner</th>
                      <th className="py-2 px-4 text-left">Tutor</th>
                      <th className="py-2 px-4 text-left">Subject</th>
                      <th className="py-2 px-4 text-left">Date</th>
                      <th className="py-2 px-4 text-left">Amount</th>
                      <th className="py-2 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 px-4 text-gray-800">
                          {booking.learner?.firstName} {booking.learner?.lastName}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600">
                          {booking.tutorProfile?.user?.firstName} {booking.tutorProfile?.user?.lastName}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600">{booking.subject || '-'}</td>
                        <td className="py-2.5 px-4 text-gray-500">{formatDate(booking.scheduledAt)}</td>
                        <td className="py-2.5 px-4 font-medium text-gray-800">
                          {formatCurrency(booking.totalAmount || 0)}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getBookingStatusStyle(booking.status)}`}>
                            {(booking.status || '').toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {quickActions.map((item) => (
              <Link key={item.label} href={item.href} className="card p-4 hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-2.5">
                  <item.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
