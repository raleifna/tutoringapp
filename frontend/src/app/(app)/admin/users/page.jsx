// src/app/(app)/admin/users/page.jsx - Admin User Management
'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  EyeIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { adminApi } from '../../../../lib/api-entry';
import { getAvatarUrl } from '../../../../lib/avatar';
import { formatShortDateTime as formatDate } from '../../../../lib/formatters';
import { useAuthStore } from '../../../../lib/store';
import BackButton from '../../../../components/BackButton';

const ROLES = ['', 'LEARNER', 'TUTOR', 'ADMIN', 'SYSTEM_ADMIN'];
const STATUSES = ['', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'];

const STATUS_ACTIONS = {
  ACTIVE: [{ label: 'Suspend', value: 'SUSPENDED', className: 'text-yellow-700 hover:bg-yellow-50' }],
  SUSPENDED: [{ label: 'Activate', value: 'ACTIVE', className: 'text-green-700 hover:bg-green-50' }],
  DEACTIVATED: [{ label: 'Activate', value: 'ACTIVE', className: 'text-green-700 hover:bg-green-50' }],
};

const cn = (...classes) => classes.filter(Boolean).join(' ');

const getRoleBadgeClass = (role) => {
  if (role === 'LEARNER') return 'bg-blue-50 text-blue-700';
  if (role === 'TUTOR') return 'bg-green-50 text-green-700';
  if (role === 'ADMIN' || role === 'SYSTEM_ADMIN') return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-700';
};

const getStatusBadgeClass = (status) => {
  if (status === 'ACTIVE') return 'bg-green-50 text-green-700';
  if (status === 'SUSPENDED') return 'bg-yellow-50 text-yellow-700';
  if (status === 'DEACTIVATED') return 'bg-gray-100 text-gray-600';
  return 'bg-gray-100 text-gray-700';
};

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm text-gray-700 mt-1 break-words">{value}</p>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<AdminUsersFallback />}>
      <AdminUsersContent />
    </Suspense>
  );
}

function AdminUsersContent() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    const nextSearch = searchParams.get('search') || '';
    const roleFromUrl = searchParams.get('role') || '';
    const statusFromUrl = searchParams.get('status') || '';
    const pageFromUrl = Number(searchParams.get('page') || '1');

    const nextRole = ROLES.includes(roleFromUrl) ? roleFromUrl : '';
    const nextStatus = STATUSES.includes(statusFromUrl) ? statusFromUrl : '';
    const nextPage = Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? Math.floor(pageFromUrl) : 1;

    setSearch(nextSearch);
    setRole(nextRole);
    setStatus(nextStatus);
    setPage(nextPage);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, status, page],
    queryFn: () => adminApi.getUsers({ search, role, status, page, limit: 15 }),
  });

  const { data: selectedUserData, isFetching: isUserLoading } = useQuery({
    queryKey: ['admin-user', selectedUserId],
    queryFn: () => adminApi.getUser(selectedUserId),
    enabled: !!selectedUserId,
  });

  const users = data?.data?.data?.users || [];
  const pagination = data?.data?.data?.pagination;
  const selectedUser = selectedUserData?.data?.data;

  const refreshUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    if (selectedUserId) queryClient.invalidateQueries({ queryKey: ['admin-user', selectedUserId] });
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, nextStatus }) => adminApi.updateUserStatus(userId, { status: nextStatus }),
    onSuccess: () => {
      toast.success('User status updated');
      refreshUsers();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update user status');
    },
  });

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="relative space-y-5">
      <BackButton href="/admin/dashboard" variant="inverse" className="absolute top-1 right-2 z-10" />

      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-5 text-white -mx-4 -mt-4 px-8 pt-6 rounded-t-none">
        <p className="text-primary-200 text-xs font-medium mb-0.5">Admin Panel</p>
        <h1 className="text-xl font-bold">User Management</h1>
        <p className="text-primary-200 text-sm mt-1">View users and manage account status</p>
        <button onClick={handleLogout} className="btn-secondary mt-4">
          Log out
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email"
            className="input pl-9 text-sm"
          />
        </div>

        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
          className="input text-sm w-auto"
        >
          <option value="">All Roles</option>
          {ROLES.filter(Boolean).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="input text-sm w-auto"
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td colSpan={5} className="p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(user.avatar, user.firstName, user.lastName, { fallbackName: 'User' })}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${getRoleBadgeClass(user.role)}`}>{user.role}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${getStatusBadgeClass(user.status)}`}>{user.status}</span>
                    </td>

                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUserId(user.id)}
                          className="inline-flex items-center gap-1 rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          View
                        </button>

                        {(STATUS_ACTIONS[user.status] || []).map((action) => (
                          <button
                            key={action.value}
                            onClick={() => updateStatusMutation.mutate({ userId: user.id, nextStatus: action.value })}
                            disabled={
                              updateStatusMutation.isPending ||
                              user.role === 'ADMIN' ||
                              user.role === 'SYSTEM_ADMIN'
                            }
                            className={cn(
                              'rounded border border-gray-200 px-2.5 py-1 text-xs transition-colors disabled:opacity-40',
                              action.className
                            )}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => current - 1)}
            disabled={page <= 1}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= pagination.totalPages}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {selectedUserId && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex justify-end">
          <div className="absolute inset-0" onClick={() => setSelectedUserId(null)} />

          <div className="relative bg-white w-full max-w-xl h-full rounded-3xl shadow-2xl overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Account Details</h2>
                <p className="text-sm text-gray-500 mt-1">User profile and activity summary.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {isUserLoading || !selectedUser ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4">
                  <img
                    src={getAvatarUrl(selectedUser.avatar, selectedUser.firstName, selectedUser.lastName, { fallbackName: 'User' })}
                    alt={selectedUser.firstName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`badge ${getRoleBadgeClass(selectedUser.role)}`}>{selectedUser.role}</span>
                      <span className={`badge ${getStatusBadgeClass(selectedUser.status)}`}>{selectedUser.status}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailRow label="Phone" value={selectedUser.phone} />
                  <DetailRow label="Timezone" value={selectedUser.timezone} />
                  <DetailRow label="Joined" value={formatDate(selectedUser.createdAt)} />
                  <DetailRow
                    label="Last Login"
                    value={selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : 'Never'}
                  />
                  <DetailRow label="Email Verified" value={selectedUser.isEmailVerified ? 'Yes' : 'No'} />
                </div>

                <div className="card p-4 space-y-3">
                  <div className="flex items-center gap-2 text-gray-900">
                    <UserCircleIcon className="w-5 h-5" />
                    <h3 className="font-semibold">Recent Bookings</h3>
                  </div>

                  {selectedUser.bookingsAsLearner?.length ? (
                    <div className="space-y-2">
                      {selectedUser.bookingsAsLearner.map((booking) => (
                        <div key={booking.id} className="rounded-2xl border border-gray-100 p-3">
                          <p className="font-medium text-gray-900">{booking.subject}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            With {booking.tutorProfile?.user?.firstName} {booking.tutorProfile?.user?.lastName} ·{' '}
                            {formatDate(booking.scheduledAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : selectedUser.tutorProfile?.bookings?.length ? (
                    <div className="space-y-2">
                      {selectedUser.tutorProfile.bookings.map((booking) => (
                        <div key={booking.id} className="rounded-2xl border border-gray-100 p-3">
                          <p className="font-medium text-gray-900">{booking.subject}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Learner {booking.learner?.firstName} {booking.learner?.lastName} ·{' '}
                            {formatDate(booking.scheduledAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No recent bookings.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminUsersFallback() {
  return (
    <div className="space-y-5">
      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
      <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
      <div className="card p-6 animate-pulse h-80" />
    </div>
  );
}
