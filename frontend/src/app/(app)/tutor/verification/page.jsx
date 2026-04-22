'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { tutorApi } from '../../../../lib/api-entry';
import { useAuthStore } from '../../../../lib/store';
import {
  getTutorAccessStateFromProfile,
  TUTOR_ACTIVE_PATH,
  TUTOR_REVIEW_PATH,
} from '../../../../lib/tutor-access';

const MAX_VERIFICATION_FILES = 5;
const MAX_VERIFICATION_FILE_SIZE = 5 * 1024 * 1024;
const MAX_VERIFICATION_TOTAL_SIZE = 25 * 1024 * 1024;

const getApplicationFiles = (items) =>
  Array.isArray(items) ? items.filter((item) => item && typeof item === 'object' && item.url) : [];

const getApplicationNotes = (items) =>
  Array.isArray(items)
    ? items
        .filter((item) => item && typeof item === 'object' && item.text && !item.url)
        .map((item) => item.text)
        .join('\n')
    : '';

const formatEducationItem = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return [item.degree, item.field, item.institution, item.year, item.text].filter(Boolean).join(', ');
};

export default function TutorVerificationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const [applicationSummary, setApplicationSummary] = useState('');
  const [applicationNotes, setApplicationNotes] = useState('');
  const [applicationExperienceYears, setApplicationExperienceYears] = useState('0');
  const [applicationFiles, setApplicationFiles] = useState([]);
  const [applicationFileError, setApplicationFileError] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-tutor-profile'],
    queryFn: () => tutorApi.getMyProfile(),
    enabled: user?.role === 'TUTOR',
    retry: false,
  });

  const profile = data?.data?.data || null;
  const accessState = getTutorAccessStateFromProfile(profile);
  const latestReviewAction = profile?.latestReviewAction;
  const existingApplicationFiles = useMemo(() => getApplicationFiles(profile?.certifications), [profile]);

  useEffect(() => {
    if (!profile) return;

    setApplicationSummary(
      Array.isArray(profile.education)
        ? profile.education.map(formatEducationItem).filter(Boolean).join('\n')
        : profile.education || ''
    );
    setApplicationNotes(getApplicationNotes(profile.certifications));
    setApplicationExperienceYears(String(profile.yearsExperience || 0));
    setApplicationFiles([]);
    setApplicationFileError('');
  }, [profile]);

  useEffect(() => {
    if (accessState !== 'ACTIVE' && accessState !== 'PENDING_REVIEW') return;

    fetchMe()
      .catch(() => {})
      .finally(() => {
        router.replace(accessState === 'ACTIVE' ? TUTOR_ACTIVE_PATH : TUTOR_REVIEW_PATH);
      });
  }, [accessState, fetchMe, router]);

  const applicationMutation = useMutation({
    mutationFn: (formData) => tutorApi.updateApplication(formData),
    onSuccess: async () => {
      toast.success('Verification materials submitted');
      queryClient.invalidateQueries({ queryKey: ['my-tutor-profile'] });
      await fetchMe();
      router.replace(TUTOR_REVIEW_PATH);
    },
    onError: (mutationError) => {
      toast.error(mutationError?.response?.data?.message || 'Failed to submit verification materials');
    },
  });

  const handleApplicationFilesChange = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length > MAX_VERIFICATION_FILES) {
      setApplicationFiles([]);
      setApplicationFileError(`Upload up to ${MAX_VERIFICATION_FILES} verification files`);
      return;
    }

    if (files.some((file) => file.size > MAX_VERIFICATION_FILE_SIZE)) {
      setApplicationFiles([]);
      setApplicationFileError('Each verification file must be 5MB or smaller');
      return;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_VERIFICATION_TOTAL_SIZE) {
      setApplicationFiles([]);
      setApplicationFileError('Total upload size must stay within 25MB');
      return;
    }

    setApplicationFiles(files);
    setApplicationFileError('');
  };

  const handleSubmit = () => {
    const summaryForSubmit = applicationSummary.trim();

    if (!summaryForSubmit) {
      toast.error('Education summary is required');
      return;
    }

    if (applicationFiles.length === 0 && existingApplicationFiles.length === 0) {
      setApplicationFileError('Upload at least one verification file');
      return;
    }

    const formData = new FormData();
    formData.append('tutorEducationSummary', summaryForSubmit);
    formData.append('tutorExperienceYears', String(applicationExperienceYears || '0'));
    if (applicationNotes.trim()) {
      formData.append('tutorSupportingNotes', applicationNotes.trim());
    }
    applicationFiles.forEach((file) => formData.append('verificationFiles', file));
    applicationMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="space-y-4 animate-pulse"><div className="h-10 w-1/3 rounded bg-gray-200" /><div className="card h-64 p-6" /></div>;
  }

  if (isError || !profile) {
    return (
      <div className="card p-6">
        <h1 className="page-title">Tutor Verification</h1>
        <p className="mt-3 text-sm text-gray-600">
          {error?.response?.data?.message || 'Tutor profile data is unavailable for this account.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <LockClosedIcon className="mt-0.5 h-6 w-6 text-primary-600" />
          <div>
            <h1 className="page-title">Tutor Verification</h1>
            <p className="mt-2 text-sm text-gray-600">
              Upload your verification materials to activate your tutor account. You will be able to
              use tutor features after admin approval.
            </p>
          </div>
        </div>
      </div>

      {latestReviewAction?.description && (
        <div className="card border-blue-200 bg-blue-50/70 p-5">
          <h2 className="font-semibold text-gray-900">Latest admin feedback</h2>
          <p className="mt-2 text-sm text-gray-600">{latestReviewAction.description}</p>
        </div>
      )}

      <div className="card space-y-4 p-6">
        <div>
          <label className="label">Education / Qualifications Summary</label>
          <textarea
            value={applicationSummary}
            onChange={(event) => setApplicationSummary(event.target.value)}
            rows={4}
            className="input resize-none"
            placeholder="Summarise your qualifications and teaching background"
          />
        </div>

        <div>
          <label className="label">Years of Experience</label>
          <input
            type="number"
            min="0"
            max="50"
            value={applicationExperienceYears}
            onChange={(event) => setApplicationExperienceYears(event.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="label">Additional Notes</label>
          <textarea
            value={applicationNotes}
            onChange={(event) => setApplicationNotes(event.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Optional notes for the reviewer"
          />
        </div>

        <div>
          <label className="label">Verification Files</label>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,image/*"
            className="input py-3"
            onChange={handleApplicationFilesChange}
          />
          <p className="mt-1 text-xs text-gray-500">Up to 5 files, 5MB each, 25MB total</p>
          {applicationFileError && <p className="error-text">{applicationFileError}</p>}
          {applicationFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {applicationFiles.map((file) => (
                <span key={`${file.name}-${file.size}`} className="badge bg-blue-50 text-blue-700 text-xs">
                  {file.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {existingApplicationFiles.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900">Previously uploaded files</h3>
            <div className="mt-3 space-y-2">
              {existingApplicationFiles.map((item, index) => {
                const text = item.originalName || item.fileName;
                return text ? (
                  <a
                    key={`${text}-${index}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-primary-700 hover:bg-blue-50"
                  >
                    {text}
                  </a>
                ) : null;
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={applicationMutation.isPending}
          className="btn-primary"
        >
          {applicationMutation.isPending ? 'Submitting...' : 'Submit Verification'}
        </button>
      </div>
    </div>
  );
}
