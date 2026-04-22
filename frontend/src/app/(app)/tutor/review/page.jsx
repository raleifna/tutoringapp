'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ClockIcon } from '@heroicons/react/24/outline';
import { tutorApi } from '../../../../lib/api-entry';
import { useAuthStore } from '../../../../lib/store';
import {
  getTutorAccessState,
  getTutorAccessStateFromProfile,
  TUTOR_ACTIVE_PATH,
  TUTOR_VERIFICATION_PATH,
} from '../../../../lib/tutor-access';

export default function TutorReviewPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const logout = useAuthStore((state) => state.logout);
  const userAccessState = getTutorAccessState(user);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-tutor-profile'],
    queryFn: () => tutorApi.getMyProfile(),
    enabled: user?.role === 'TUTOR',
    retry: false,
    refetchInterval: 10000,
  });

  const profile = data?.data?.data || null;
  const profileAccessState = profile ? getTutorAccessStateFromProfile(profile) : userAccessState;

  useEffect(() => {
    fetchMe().catch(() => {});
  }, [fetchMe]);

  useEffect(() => {
    if (profileAccessState !== 'ACTIVE' && profileAccessState !== 'NEEDS_VERIFICATION') return;

    fetchMe()
      .catch(() => {})
      .finally(() => {
        router.replace(profileAccessState === 'ACTIVE' ? TUTOR_ACTIVE_PATH : TUTOR_VERIFICATION_PATH);
      });
  }, [profileAccessState, fetchMe, router]);

  if (isLoading) {
    return <div className="space-y-4 animate-pulse"><div className="h-10 w-1/3 rounded bg-gray-200" /><div className="card h-56 p-6" /></div>;
  }

  if (isError || !profile) {
    return (
      <div className="card p-6">
        <h1 className="page-title">Review Status</h1>
        <p className="mt-3 text-sm text-gray-600">
          {error?.response?.data?.message || 'Tutor review data is unavailable for this account.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="card border-amber-200 bg-amber-50/70 p-6">
        <div className="flex items-start gap-3">
          <ClockIcon className="mt-0.5 h-6 w-6 text-amber-600" />
          <div>
            <h1 className="page-title">Your tutor application is under review</h1>
            <p className="mt-2 text-sm text-gray-600">
              Your verification materials have been submitted. You can use tutor features after an
              admin approves your account.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900">What happens next</h2>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <p>1. Admin reviews your uploaded documents and profile details.</p>
          <p>2. If everything looks good, your tutor account will be approved automatically.</p>
          <p>3. If changes are needed, you will be redirected back to the verification page.</p>
        </div>
      </div>

      {profile?.latestReviewAction?.description && (
        <div className="card border-blue-200 bg-blue-50/70 p-6">
          <h2 className="font-semibold text-gray-900">Latest update</h2>
          <p className="mt-2 text-sm text-gray-600">{profile.latestReviewAction.description}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => fetchMe()} className="btn-primary">
          Refresh Status
        </button>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.push('/login');
          }}
          className="btn-secondary"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
