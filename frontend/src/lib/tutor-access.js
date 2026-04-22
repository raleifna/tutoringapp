export const TUTOR_VERIFICATION_PATH = '/tutor/verification';
export const TUTOR_REVIEW_PATH = '/tutor/review';
export const TUTOR_ACTIVE_PATH = '/tutor/dashboard';

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

export function getTutorAccessStateFromProfile(tutorProfile) {
  const status = normalizeStatus(tutorProfile?.status);
  const applicationSubmitted = Boolean(tutorProfile?.applicationSubmitted);

  if (status === 'ACTIVE') {
    return 'ACTIVE';
  }

  if (applicationSubmitted && status === 'PENDING') {
    return 'PENDING_REVIEW';
  }

  return 'NEEDS_VERIFICATION';
}

export function getTutorAccessState(user) {
  if (user?.role !== 'TUTOR') {
    return 'NOT_TUTOR';
  }

  return getTutorAccessStateFromProfile(user?.tutorProfile);
}

export function getTutorRedirectPath(user) {
  const state = getTutorAccessState(user);

  if (state === 'PENDING_REVIEW') {
    return TUTOR_REVIEW_PATH;
  }

  if (state === 'NEEDS_VERIFICATION') {
    return TUTOR_VERIFICATION_PATH;
  }

  if (state === 'ACTIVE') {
    return TUTOR_ACTIVE_PATH;
  }

  return '/dashboard';
}
