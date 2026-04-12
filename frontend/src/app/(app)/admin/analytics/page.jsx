// src/app/(app)/admin/analytics/page.jsx - Admin Analytics
'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../../../lib/api-entry';
import { formatCurrency } from '../../../../lib/formatters';
import { useAuthStore } from '../../../../lib/store';
import { cn } from '../../../../lib/utils';
import BackButton from '../../../../components/BackButton';

const PERIODS = [7, 30, 90];

function MetricList({ items, formatter, emptyLabel, tone = 'bg-primary-600' }) {
  if (!items.length) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-gray-400">
        {emptyLabel}
      </div>
    );
  }

  const maxValue = Math.max(...items.map((item) => Number(item.count ?? item.revenue ?? 0)), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const value = Number(item.count ?? item.revenue ?? 0);
        const width = `${Math.max((value / maxValue) * 100, 6)}%`;

        return (
          <div key={item.date || item.status || item.subject || item.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-700 truncate">
                {item.label || item.date || item.status || item.subject}
              </span>
              <span className="font-medium text-gray-900 whitespace-nowrap">
                {formatter(value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className={cn('h-full rounded-full', tone)} style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<AdminAnalyticsFallback />}>
      <AdminAnalyticsContent />
    </Suspense>
  );
}

function AdminAnalyticsContent() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    const fromUrl = Number(searchParams.get('period') || '');
    if (!PERIODS.includes(fromUrl)) return;
    setPeriod(fromUrl);
  }, [searchParams]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-analytics', period],
    queryFn: () => adminApi.getAnalytics({ period: `${period}d` }),
  });

  const analytics = data?.data?.data;
  const newUsersData = analytics?.newUsersTimeline || [];
  const bookingsByStatus = analytics?.bookingsByStatus || [];
  const topTutors = analytics?.topTutors || [];
  const topSubjects = analytics?.topSubjects || [];
  const revenueData = analytics?.revenueTimeline || [];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="relative space-y-5">
      <BackButton href="/admin/dashboard" variant="inverse" className="absolute top-1 right-2 z-10" />

      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-5 text-white -mx-4 -mt-4 px-8 pt-6 rounded-t-none">
        <p className="text-primary-200 text-xs font-medium mb-0.5">Admin Panel</p>
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-primary-200 text-sm mt-1">Platform performance overview</p>
        <button onClick={handleLogout} className="btn-secondary mt-4">
          Log out
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              period === value
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
            )}
          >
            {value} days
          </button>
        ))}
      </div>

      {isError ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-red-600 mb-3">Failed to load analytics data</p>
          <button type="button" onClick={() => refetch()} className="btn-primary btn-sm">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card p-5 h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">New User Registrations</h2>
              <MetricList
                items={newUsersData}
                formatter={(value) => `${value}`}
                emptyLabel="No user registrations in this period"
                tone="bg-blue-600"
              />
            </div>

            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Bookings by Status</h2>
              <MetricList
                items={bookingsByStatus}
                formatter={(value) => `${value}`}
                emptyLabel="No bookings recorded in this period"
                tone="bg-emerald-600"
              />
            </div>

            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Revenue Timeline</h2>
              <MetricList
                items={revenueData}
                formatter={(value) => formatCurrency(value)}
                emptyLabel="No completed payments in this period"
                tone="bg-orange-500"
              />
            </div>

            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Top Subjects</h2>
              <MetricList
                items={topSubjects}
                formatter={(value) => `${value}`}
                emptyLabel="No booking subject data available"
                tone="bg-purple-600"
              />
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Top Performing Tutors</h2>
            {topTutors.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-gray-400">
                No tutor performance data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                      <th className="pb-2 text-left">Rank</th>
                      <th className="pb-2 text-left">Tutor</th>
                      <th className="pb-2 text-left">Sessions</th>
                      <th className="pb-2 text-left">Revenue</th>
                      <th className="pb-2 text-left">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTutors.map((tutor, index) => (
                      <tr
                        key={tutor.id || index}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-2.5 font-bold text-gray-400">#{index + 1}</td>
                        <td className="py-2.5 font-medium text-gray-900">
                          {tutor.user?.firstName} {tutor.user?.lastName}
                        </td>
                        <td className="py-2.5 text-gray-600">{tutor.totalSessions || 0}</td>
                        <td className="py-2.5 text-gray-600">
                          {tutor.revenue != null ? formatCurrency(tutor.revenue) : '-'}
                        </td>
                        <td className="py-2.5 text-gray-700">
                          {Number(tutor.rating || 0).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AdminAnalyticsFallback() {
  return (
    <div className="space-y-5">
      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
      <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-5 h-72 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
