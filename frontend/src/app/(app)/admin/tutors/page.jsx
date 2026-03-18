// src/app/(app)/admin/tutors/page.jsx - Admin Tutor Review
'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AcademicCapIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { adminApi } from '../../../../lib/api-entry';
import { useAuthStore } from '../../../../lib/store';

const STATUS_TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Approved' },
  { value: 'SUSPENDED', label: 'Needs Changes' },
];

const cn = (...classes) => classes.filter(Boolean).join(' ');

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

const getAvatarUrl = (avatar, firstName, lastName) => {
  if (avatar) return avatar;
  const name = `${firstName || ''} ${lastName || ''}`.trim() || 'Tutor';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`;
};

const formatBytes = (value) => {
  const size = Number(value) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatMimeLabel = (mimeType = '') => {
  if (!mimeType) return 'Unknown type';
  if (mimeType.startsWith('image/')) return `Image · ${mimeType.replace('image/', '').toUpperCase()}`;
  if (mimeType === 'application/pdf') return 'Document · PDF';
  if (mimeType.includes('word')) return 'Document · Word';
  if (mimeType === 'text/plain') return 'Document · TXT';
  return mimeType;
};

const formatApplicationItem = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return [
    item.degree,
    item.field,
    item.institution,
    item.year,
    item.name,
    item.issuer,
    item.url,
    item.text,
  ]
    .filter(Boolean)
    .join(' | ');
};

const isUploadedFile = (item) => item && typeof item === 'object' && item.url;

export default function AdminTutorsPage() {
  return (
    <Suspense fallback={<AdminTutorsFallback />}>
      <AdminTutorsContent />
    </Suspense>
  );
}

function AdminTutorsContent() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState('PENDING');
  const [pendingAction, setPendingAction] = useState({
    tutorId: null,
    type: null,
    message: '',
  });

  useEffect(() => {
    const statusFromUrl = (searchParams.get('status') || '').toUpperCase();
    if (!STATUS_TABS.some((tab) => tab.value === statusFromUrl)) return;
    setActiveStatus(statusFromUrl);
    setPendingAction({ tutorId: null, type: null, message: '' });
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tutors', activeStatus],
    queryFn: () => adminApi.getPendingTutors({ status: activeStatus }),
  });

  const tutors = data?.data?.data?.tutors || [];

  const refreshTutors = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-tutors'] });
  };

  const approveMutation = useMutation({
    mutationFn: (tutorId) => adminApi.approveTutor(tutorId),
    onSuccess: () => {
      toast.success('Tutor approved');
      refreshTutors();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to approve tutor');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ tutorId, reason }) => adminApi.rejectTutor(tutorId, reason),
    onSuccess: () => {
      toast.success('Tutor rejected');
      setPendingAction({ tutorId: null, type: null, message: '' });
      refreshTutors();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to reject tutor');
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ tutorId, feedback }) => adminApi.returnTutor(tutorId, feedback),
    onSuccess: () => {
      toast.success('Tutor moved back to pending review');
      setPendingAction({ tutorId: null, type: null, message: '' });
      refreshTutors();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to request changes');
    },
  });

  const handleSubmitPendingAction = (tutorId) => {
    const message = pendingAction.message.trim();

    if (pendingAction.type === 'return') {
      if (!message) {
        toast.error('Feedback is required when requesting changes');
        return;
      }
      returnMutation.mutate({ tutorId, feedback: message });
      return;
    }

    rejectMutation.mutate({ tutorId, reason: message || undefined });
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="space-y-5">
      <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500">
        <span>←</span> Back
      </Link>

      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-5 text-white -mx-4 -mt-4 px-8 pt-6 rounded-t-none">
        <p className="text-primary-200 text-xs font-medium mb-0.5">Admin Panel</p>
        <h1 className="text-xl font-bold">Tutor Review</h1>
        <p className="text-primary-200 text-sm mt-1">Review tutor applications and moderation state</p>
        <button onClick={handleLogout} className="btn-secondary mt-4">
          Log out
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setActiveStatus(tab.value);
              setPendingAction({ tutorId: null, type: null, message: '' });
            }}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              activeStatus === tab.value
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card p-6 animate-pulse h-48" />
          ))}
        </div>
      ) : tutors.length === 0 ? (
        <div className="card p-10 text-center">
          <AcademicCapIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-900">No tutors in {activeStatus.toLowerCase()} state</p>
          <p className="text-sm text-gray-500 mt-1">New tutor signups will appear here for review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tutors.map((tutor) => {
            const actionOpen = pendingAction.tutorId === tutor.id;

            return (
              <div key={tutor.id} className="card p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <img
                    src={getAvatarUrl(
                      tutor.user?.avatar,
                      tutor.user?.firstName,
                      tutor.user?.lastName
                    )}
                    alt={tutor.user?.firstName || 'Tutor'}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-gray-900">
                          {tutor.user?.firstName} {tutor.user?.lastName}
                        </h2>
                        <p className="text-sm text-gray-500 break-all">{tutor.user?.email}</p>
                      </div>
                      <span
                        className={cn('badge flex-shrink-0', {
                          'bg-yellow-50 text-yellow-700': tutor.status === 'PENDING',
                          'bg-green-50 text-green-700': tutor.status === 'ACTIVE',
                          'bg-red-50 text-red-700': tutor.status === 'SUSPENDED',
                        })}
                      >
                        {tutor.status}
                      </span>
                    </div>

                    {tutor.headline && (
                      <p className="mt-1 text-sm italic text-gray-600">{tutor.headline}</p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Applied {formatDate(tutor.createdAt)}</span>
                      {tutor.yearsExperience > 0 && <span>{tutor.yearsExperience} years experience</span>}
                      {tutor.location && <span>{tutor.location}</span>}
                      <span>{tutor.availability?.length || 0} availability slots</span>
                    </div>

                    {tutor.subjects?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tutor.subjects.map((item) => (
                          <span key={item.id} className="badge bg-gray-100 text-gray-600">
                            {item.subject?.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {tutor.user?.bio && (
                      <p className="mt-3 text-sm leading-relaxed text-gray-600">{tutor.user.bio}</p>
                    )}

                    {Array.isArray(tutor.education) && tutor.education.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          Education summary
                        </p>
                        <p className="text-xs text-gray-500">
                          {tutor.education.map(formatApplicationItem).filter(Boolean).join(' | ')}
                        </p>
                      </div>
                    )}

                    {Array.isArray(tutor.certifications) && tutor.certifications.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          Supporting materials
                        </p>
                        <div className="space-y-2">
                          {tutor.certifications.map((item, index) => {
                            const text = formatApplicationItem(item);
                            if (!text) return null;

                            return isUploadedFile(item) ? (
                              <a
                                key={index}
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 hover:bg-blue-100/70 transition-colors"
                              >
                                <div className="text-sm font-medium text-blue-700">
                                  {item.originalName || text}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-blue-700/80">
                                  <span>{formatMimeLabel(item.mimeType)}</span>
                                  <span>{formatBytes(item.size)}</span>
                                  {item.uploadedAt && <span>Uploaded {formatDate(item.uploadedAt)}</span>}
                                </div>
                              </a>
                            ) : (
                              <div
                                key={index}
                                className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-blue-700"
                              >
                                {text}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tutor.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate(tutor.id)}
                      disabled={approveMutation.isPending}
                      className="btn-primary btn-sm gap-1.5"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Approve
                    </button>
                  )}

                  {(tutor.status === 'PENDING' || tutor.status === 'SUSPENDED') && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAction({ tutorId: tutor.id, type: 'return', message: '' })
                      }
                      className="btn-secondary btn-sm gap-1.5"
                    >
                      <ArrowUturnLeftIcon className="w-4 h-4" />
                      Request Changes
                    </button>
                  )}

                  {tutor.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAction({ tutorId: tutor.id, type: 'reject', message: '' })
                      }
                      className="btn-secondary btn-sm gap-1.5 text-red-600"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      Reject
                    </button>
                  )}
                </div>

                {actionOpen && (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                      {pendingAction.type === 'return'
                        ? 'Send this tutor back for edits'
                        : 'Reject this tutor application'}
                    </div>

                    <textarea
                      value={pendingAction.message}
                      onChange={(event) =>
                        setPendingAction((current) => ({ ...current, message: event.target.value }))
                      }
                      rows={3}
                      className="input resize-none"
                      placeholder={
                        pendingAction.type === 'return'
                          ? 'Explain what needs to be updated...'
                          : 'Optional rejection reason...'
                      }
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSubmitPendingAction(tutor.id)}
                        className="btn-primary btn-sm"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingAction({ tutorId: null, type: null, message: '' })}
                        className="btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminTutorsFallback() {
  return (
    <div className="space-y-5">
      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
      <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="card p-6 animate-pulse h-48" />
        ))}
      </div>
    </div>
  );
}
