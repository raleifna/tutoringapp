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
        .filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            item.text &&
            !item.url &&
            (!item.kind || item.kind === 'note')
        )
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
  const [shortBio, setShortBio] = useState('');
  const [workExperience, setWorkExperience] = useState('');
  const [qualificationItems, setQualificationItems] = useState('');
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
    setShortBio(profile.user?.bio || '');
    setWorkExperience(
      Array.isArray(profile.certifications)
        ? profile.certifications
            .filter((item) => item?.kind === 'experience' && item?.text)
            .map((item) => item.text)
            .join('\n')
        : ''
    );
    setQualificationItems(
      Array.isArray(profile.certifications)
        ? profile.certifications
            .filter((item) => item?.kind === 'qualification' && item?.text)
            .map((item) => item.text)
            .join('\n')
        : ''
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

    const previousDescriptions = new Map(
      applicationFiles.map((item) => [item.key, item.description])
    );

    setApplicationFiles(
      files.map((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        return {
          key,
          file,
          description: previousDescriptions.get(key) || '',
        };
      })
    );
    setApplicationFileError('');
  };

  const handleSubmit = () => {
    const summaryForSubmit = applicationSummary.trim();

    if (!shortBio.trim()) {
      toast.error('Short bio is required');
      return;
    }

    if (!summaryForSubmit) {
      toast.error('Education summary is required');
      return;
    }

    if (applicationFiles.length === 0 && existingApplicationFiles.length === 0) {
      setApplicationFileError('Upload at least one verification file');
      return;
    }

    if (applicationFiles.some((item) => !item.description.trim())) {
      setApplicationFileError('Add a short description for each uploaded verification file');
      return;
    }

    const formData = new FormData();
    formData.append('shortBio', shortBio.trim());
    formData.append('tutorWorkExperience', JSON.stringify(workExperience.split('\n').map((item) => item.trim()).filter(Boolean)));
    formData.append(
      'tutorQualificationItems',
      JSON.stringify(qualificationItems.split('\n').map((item) => item.trim()).filter(Boolean))
    );
    formData.append(
      'tutorEducationItems',
      JSON.stringify(summaryForSubmit.split('\n').map((item) => item.trim()).filter(Boolean))
    );
    formData.append('tutorEducationSummary', summaryForSubmit);
    formData.append('tutorExperienceYears', String(applicationExperienceYears || '0'));
    if (applicationNotes.trim()) {
      formData.append('tutorSupportingNotes', applicationNotes.trim());
    }
    formData.append(
      'verificationFileDescriptions',
      JSON.stringify(applicationFiles.map((item) => item.description.trim()))
    );
    applicationFiles.forEach((item) => formData.append('verificationFiles', item.file));
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
          <label className="label">Short Bio <span className="text-xs font-normal text-primary-600 ml-1">· shown to students</span></label>
          <textarea
            value={shortBio}
            onChange={(event) => setShortBio(event.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Write a short public bio that students will see on your profile"
          />
        </div>

        <div>
          <label className="label">Teaching / Work Experience <span className="text-xs font-normal text-primary-600 ml-1">· shown to students</span></label>
          <textarea
            value={workExperience}
            onChange={(event) => setWorkExperience(event.target.value)}
            rows={4}
            className="input resize-none"
            placeholder="One experience item per line, e.g. 3 years teaching high school Mathematics"
          />
        </div>

        <div>
          <label className="label">Education <span className="text-xs font-normal text-primary-600 ml-1">· shown to students</span></label>
          <textarea
            value={applicationSummary}
            onChange={(event) => setApplicationSummary(event.target.value)}
            rows={4}
            className="input resize-none"
            placeholder="One education item per line, e.g. Bachelor of Science, University of Sydney, 2019"
          />
        </div>

        <div>
          <label className="label">Certifications / Training <span className="text-xs font-normal text-primary-600 ml-1">· shown to students</span></label>
          <textarea
            value={qualificationItems}
            onChange={(event) => setQualificationItems(event.target.value)}
            rows={4}
            className="input resize-none"
            placeholder="One item per line, e.g. Certificate IV in Training and Assessment"
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
          <label className="label">Additional Notes <span className="text-xs font-normal text-gray-400 ml-1">· for admin reviewer only</span></label>
          <textarea
            value={applicationNotes}
            onChange={(event) => setApplicationNotes(event.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Optional notes for the reviewer, e.g. context about your qualifications"
          />
        </div>

        <div>
          <label className="label">Verification Files <span className="text-xs font-normal text-gray-400 ml-1">· for admin review only, not shown to students</span></label>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,image/*"
            className="input py-3"
            onChange={handleApplicationFilesChange}
          />
          <p className="mt-1 text-xs text-gray-500">Up to 5 files, 5MB each, 25MB total. Add a description for each file explaining what it verifies.</p>
          {applicationFileError && <p className="error-text">{applicationFileError}</p>}
          {applicationFiles.length > 0 && (
            <div className="mt-3 space-y-3">
              {applicationFiles.map((item) => (
                <div key={item.key} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-800">{item.file.name}</p>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setApplicationFiles((current) =>
                        current.map((entry) =>
                          entry.key === item.key ? { ...entry, description: nextValue } : entry
                        )
                      );
                    }}
                    className="input mt-2"
                    placeholder="What does this file verify?"
                  />
                </div>
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
                    <div>{text}</div>
                    {item.description ? (
                      <div className="mt-1 text-xs text-gray-500">{item.description}</div>
                    ) : null}
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
