// src/app/(app)/admin/operations/page.jsx - Admin Operations
'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BookOpenIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  PlusIcon,
  RectangleStackIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { adminApi, subjectApi } from '../../../../lib/api-entry';
import { useAuthStore } from '../../../../lib/store';

const OPERATION_TABS = [
  { key: 'bookings', label: 'Bookings', icon: ClipboardDocumentListIcon },
  { key: 'subjects', label: 'Subjects', icon: BookOpenIcon },
  { key: 'actions', label: 'Audit Log', icon: RectangleStackIcon },
];

const BOOKING_STATUSES = ['', 'PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'RESCHEDULED'];
const EMPTY_SUBJECT_FORM = { name: '', category: '', description: '' };

const cn = (...classes) => classes.filter(Boolean).join(' ');

const formatCurrency = (amount, currency = 'AUD') => {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency || 'AUD',
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

const formatDuration = (minutes) => {
  const value = Number(minutes || 0);
  if (!value) return '0 mins';
  if (value % 60 === 0) return `${value / 60} hr`;
  return `${value} mins`;
};

const getBookingStatusColor = (status) => {
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (status === 'ACCEPTED') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (status === 'COMPLETED') return 'bg-green-50 text-green-700 border border-green-200';
  if (status === 'CANCELLED') return 'bg-gray-100 text-gray-700 border border-gray-200';
  if (status === 'DECLINED') return 'bg-red-50 text-red-700 border border-red-200';
  if (status === 'RESCHEDULED') return 'bg-purple-50 text-purple-700 border border-purple-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
};

function Pagination({ currentPage, totalPages, onPrevious, onNext }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={onPrevious} disabled={currentPage <= 1} className="btn-secondary btn-sm disabled:opacity-40">
        Previous
      </button>
      <span className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </span>
      <button onClick={onNext} disabled={currentPage >= totalPages} className="btn-secondary btn-sm disabled:opacity-40">
        Next
      </button>
    </div>
  );
}

export default function AdminOperationsPage() {
  return (
    <Suspense fallback={<AdminOperationsFallback />}>
      <AdminOperationsContent />
    </Suspense>
  );
}

function AdminOperationsContent() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const requestedTab = searchParams.get('tab');
  const requestedStatus = searchParams.get('status');
  const activeTab = OPERATION_TABS.some((tab) => tab.key === requestedTab) ? requestedTab : 'bookings';

  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingsPage, setBookingsPage] = useState(1);
  const [actionsPage, setActionsPage] = useState(1);
  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT_FORM);
  const [editingSubjectId, setEditingSubjectId] = useState(null);

  useEffect(() => {
    if (requestedTab) return;
    router.replace('/admin/operations?tab=bookings');
  }, [requestedTab, router]);

  useEffect(() => {
    if (activeTab !== 'bookings') return;
    const statusFromUrl = String(requestedStatus || '').toUpperCase();
    const nextStatus = BOOKING_STATUSES.includes(statusFromUrl) ? statusFromUrl : '';
    setBookingStatus(nextStatus);
    setBookingsPage(1);
  }, [activeTab, requestedStatus]);

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-bookings', bookingStatus, bookingsPage],
    queryFn: () => adminApi.getBookings({ status: bookingStatus, page: bookingsPage, limit: 10 }),
  });

  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: () => subjectApi.getAll(),
  });

  const { data: actionsData, isLoading: actionsLoading } = useQuery({
    queryKey: ['admin-actions', actionsPage],
    queryFn: () => adminApi.getActions({ page: actionsPage, limit: 12 }),
  });

  const bookings = bookingsData?.data?.data?.bookings || [];
  const bookingsPagination = bookingsData?.data?.data?.pagination;
  const subjects = subjectsData?.data?.data?.subjects || [];
  const actions = actionsData?.data?.data?.actions || [];
  const actionsPagination = actionsData?.data?.data?.pagination;
  const categoryOptions = [...new Set(subjects.map((subject) => subject.category).filter(Boolean))].sort();

  const createSubjectMutation = useMutation({
    mutationFn: (payload) => adminApi.createSubject(payload),
    onSuccess: () => {
      toast.success('Subject created');
      setSubjectForm(EMPTY_SUBJECT_FORM);
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-actions'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create subject');
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ subjectId, payload }) => adminApi.updateSubject(subjectId, payload),
    onSuccess: () => {
      toast.success('Subject updated');
      setEditingSubjectId(null);
      setSubjectForm(EMPTY_SUBJECT_FORM);
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-actions'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update subject');
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (subjectId) => adminApi.deleteSubject(subjectId),
    onSuccess: () => {
      toast.success('Subject deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-actions'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to delete subject');
    },
  });

  const handleTabChange = (tabKey) => {
    router.replace(`/admin/operations?tab=${tabKey}`);
  };

  const handleSubmitSubject = (event) => {
    event.preventDefault();

    const payload = {
      name: subjectForm.name.trim(),
      category: subjectForm.category.trim(),
      description: subjectForm.description.trim() || undefined,
    };

    if (!payload.name || !payload.category) {
      toast.error('Name and category are required');
      return;
    }

    if (editingSubjectId) {
      updateSubjectMutation.mutate({ subjectId: editingSubjectId, payload });
      return;
    }

    createSubjectMutation.mutate(payload);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const stats = [
    { label: 'Bookings', value: bookingsPagination?.total || 0, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Subjects', value: subjects.length, tone: 'bg-sky-50 text-sky-700' },
    { label: 'Admin Actions', value: actionsPagination?.total || 0, tone: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="space-y-5">
      <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500">
        <span>←</span> Back
      </Link>

      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-5 text-white -mx-4 -mt-4 px-8 pt-6 rounded-t-none">
        <p className="text-primary-200 text-xs font-medium mb-0.5">Admin Panel</p>
        <h1 className="text-xl font-bold">Admin Operations</h1>
        <p className="text-primary-200 text-sm mt-1">Manage bookings, subject catalog and action logs</p>
        <button onClick={handleLogout} className="btn-secondary mt-4">
          Log out
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <span className={cn('badge mt-2', stat.tone)}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {OPERATION_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === tab.key
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' && (
        <section className="card p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Booking oversight</h2>
              <p className="text-sm text-gray-500 mt-0.5">Platform-level booking and payment monitoring.</p>
            </div>
            <select
              value={bookingStatus}
              onChange={(event) => {
                setBookingStatus(event.target.value);
                setBookingsPage(1);
              }}
              className="input w-full text-sm sm:w-52"
            >
              <option value="">All statuses</option>
              {BOOKING_STATUSES.filter(Boolean).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {bookingsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-2xl bg-gray-100 h-36 animate-pulse" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-400">
              No bookings found for this filter.
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const expanded = expandedBookingId === booking.id;

                return (
                  <div key={booking.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Session</p>
                          <h3 className="font-semibold text-gray-900 mt-1">{booking.subject}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(booking.scheduledAt)} · {formatDuration(booking.duration)} ·{' '}
                            {booking.sessionType?.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Learner</p>
                            <p className="text-gray-800 mt-1">
                              {booking.learner?.firstName} {booking.learner?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{booking.learner?.email}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Tutor</p>
                            <p className="text-gray-800 mt-1">
                              {booking.tutorProfile?.user?.firstName} {booking.tutorProfile?.user?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{booking.tutorProfile?.user?.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start lg:items-end gap-2">
                        <span className={cn('badge', getBookingStatusColor(booking.status))}>{booking.status}</span>
                        <span
                          className={cn('badge', {
                            'bg-green-50 text-green-700': booking.payment?.status === 'COMPLETED',
                            'bg-yellow-50 text-yellow-700': booking.payment?.status === 'PENDING',
                            'bg-red-50 text-red-700': booking.payment?.status === 'FAILED',
                            'bg-gray-100 text-gray-600': !booking.payment?.status,
                          })}
                        >
                          {booking.payment?.status || 'UNPAID'}
                        </span>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(booking.totalAmount || 0, booking.currency || 'AUD')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedBookingId((current) => (current === booking.id ? null : booking.id))}
                        className="btn-secondary btn-sm"
                      >
                        {expanded ? 'Hide flow history' : 'Show flow history'}
                      </button>
                    </div>

                    {expanded && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900">Booking Flow</h4>
                          <p className="text-xs text-gray-500 mt-1">Created {formatDate(booking.createdAt)}</p>
                        </div>

                        {booking.statusHistory?.length ? (
                          <div className="space-y-2">
                            {booking.statusHistory.map((entry) => (
                              <div key={entry.id} className="rounded-xl border border-gray-100 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-3">
                                  <span className={cn('badge', getBookingStatusColor(entry.status))}>{entry.status}</span>
                                  <span className="text-xs text-gray-500">{formatDate(entry.createdAt)}</span>
                                </div>
                                {entry.reason && <p className="text-sm text-gray-600 mt-2">{entry.reason}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No flow history recorded.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={bookingsPage}
            totalPages={bookingsPagination?.totalPages || 1}
            onPrevious={() => setBookingsPage((current) => current - 1)}
            onNext={() => setBookingsPage((current) => current + 1)}
          />
        </section>
      )}

      {activeTab === 'subjects' && (
        <section className="card p-5 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900">Subject catalog</h2>
            <p className="text-sm text-gray-500 mt-0.5">Create and maintain subject definitions.</p>
          </div>

          <form onSubmit={handleSubmitSubject} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-4">
            <div className="flex items-center gap-2">
              {editingSubjectId ? (
                <PencilSquareIcon className="w-5 h-5 text-primary-600" />
              ) : (
                <PlusIcon className="w-5 h-5 text-primary-600" />
              )}
              <h3 className="font-medium text-gray-900">{editingSubjectId ? 'Edit subject' : 'Create subject'}</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input
                  value={subjectForm.name}
                  onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))}
                  className="input"
                  placeholder="e.g. HSC Mathematics Extension 1"
                />
              </div>
              <div>
                <label className="label">Category</label>
                <input
                  list="subject-categories"
                  value={subjectForm.category}
                  onChange={(event) => setSubjectForm((current) => ({ ...current, category: event.target.value }))}
                  className="input"
                  placeholder="e.g. Mathematics"
                />
                <datalist id="subject-categories">
                  {categoryOptions.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={subjectForm.description}
                onChange={(event) => setSubjectForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="input resize-none"
                placeholder="Optional notes about this subject."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={createSubjectMutation.isPending || updateSubjectMutation.isPending}
                className="btn-primary btn-sm"
              >
                {editingSubjectId ? 'Save changes' : 'Create subject'}
              </button>
              {editingSubjectId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubjectId(null);
                    setSubjectForm(EMPTY_SUBJECT_FORM);
                  }}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                  <th className="pb-3 text-left">Subject</th>
                  <th className="pb-3 text-left">Category</th>
                  <th className="pb-3 text-left">Description</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjectsLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-b border-gray-50">
                      <td colSpan={4} className="py-4">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : subjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-gray-400">
                      No subjects found.
                    </td>
                  </tr>
                ) : (
                  subjects.map((subject) => (
                    <tr key={subject.id} className="border-b border-gray-50 align-top">
                      <td className="py-3 pr-4 font-medium text-gray-900">{subject.name}</td>
                      <td className="py-3 pr-4">
                        <span className="badge bg-sky-50 text-sky-700">{subject.category}</span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-600">{subject.description || '-'}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubjectId(subject.id);
                              setSubjectForm({
                                name: subject.name || '',
                                category: subject.category || '',
                                description: subject.description || '',
                              });
                            }}
                            className="btn-secondary btn-sm gap-1.5"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm(`Delete subject "${subject.name}"?`)) return;
                              deleteSubjectMutation.mutate(subject.id);
                            }}
                            disabled={deleteSubjectMutation.isPending}
                            className="btn-danger btn-sm gap-1.5"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'actions' && (
        <section className="card p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Admin audit log</h2>
            <p className="text-sm text-gray-500 mt-0.5">Track management operations completed by admins.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                  <th className="pb-3 text-left">Action</th>
                  <th className="pb-3 text-left">Admin</th>
                  <th className="pb-3 text-left">Target</th>
                  <th className="pb-3 text-left">Description</th>
                  <th className="pb-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {actionsLoading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <tr key={index} className="border-b border-gray-50">
                      <td colSpan={5} className="py-4">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : actions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                      No admin actions recorded yet.
                    </td>
                  </tr>
                ) : (
                  actions.map((action) => (
                    <tr key={action.id} className="border-b border-gray-50 align-top">
                      <td className="py-3 pr-4">
                        <span className="badge bg-amber-50 text-amber-700">{action.action}</span>
                      </td>
                      <td className="py-3 pr-4 text-gray-800">
                        {action.admin?.firstName} {action.admin?.lastName}
                      </td>
                      <td className="py-3 pr-4">
                        {action.targetUser ? (
                          <div>
                            <p className="font-medium text-gray-800">
                              {action.targetUser.firstName} {action.targetUser.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{action.targetUser.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">System</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-600">{action.description || '-'}</td>
                      <td className="py-3 text-sm text-gray-500">{formatDate(action.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={actionsPage}
            totalPages={actionsPagination?.totalPages || 1}
            onPrevious={() => setActionsPage((current) => current - 1)}
            onNext={() => setActionsPage((current) => current + 1)}
          />
        </section>
      )}
    </div>
  );
}

function AdminOperationsFallback() {
  return (
    <div className="space-y-5">
      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
      <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
      <div className="card p-6 animate-pulse h-96" />
    </div>
  );
}
