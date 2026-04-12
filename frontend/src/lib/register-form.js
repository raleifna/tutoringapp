import { z } from 'zod';

export const MAX_VERIFICATION_FILES = 5;
export const MAX_VERIFICATION_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_VERIFICATION_TOTAL_SIZE = 25 * 1024 * 1024;

const baseRegisterSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: z.enum(['LEARNER', 'TUTOR']),
  isMinor: z.boolean().optional(),
  parentName: z.string().optional(),
  parentEmail: z.union([z.literal(''), z.string().email('Invalid parent email')]).optional(),
  parentPhone: z.string().optional(),
  tutorEducationSummary: z.string().optional(),
  tutorExperienceYears: z.string().optional(),
  tutorSupportingNotes: z.string().optional(),
  agreeToTerms: z.boolean().refine((value) => value === true, 'You must agree to the terms'),
});

function validateLearnerFields(data, ctx) {
  if (data.role === 'LEARNER' && data.isMinor && !data.parentName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Parent/guardian name is required for minors',
      path: ['parentName'],
    });
  }
}

function validateTutorFields(data, ctx) {
  if (data.role === 'TUTOR' && !data.tutorEducationSummary?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Education summary is required for tutors',
      path: ['tutorEducationSummary'],
    });
  }
}

export const registerSchema = baseRegisterSchema
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    validateLearnerFields(data, ctx);
    validateTutorFields(data, ctx);
  });

export function getRegisterDefaultValues(roleParam) {
  return {
    role: roleParam === 'TUTOR' ? 'TUTOR' : 'LEARNER',
    agreeToTerms: false,
    isMinor: false,
  };
}

export function validateVerificationFiles(files) {
  if (files.length > MAX_VERIFICATION_FILES) {
    return `Upload up to ${MAX_VERIFICATION_FILES} files`;
  }

  if (files.some((file) => file.size > MAX_VERIFICATION_FILE_SIZE)) {
    return 'Each file must be 5MB or smaller';
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_VERIFICATION_TOTAL_SIZE) {
    return 'Total file size must stay within 25MB';
  }

  return '';
}

export function buildRegisterPayload(values, verificationFiles) {
  const { confirmPassword, agreeToTerms, ...rawData } = values;

  if (rawData.role === 'TUTOR') {
    const formData = new FormData();
    [
      ['firstName', rawData.firstName],
      ['lastName', rawData.lastName],
      ['email', rawData.email],
      ['password', rawData.password],
      ['role', rawData.role],
      ['tutorEducationSummary', rawData.tutorEducationSummary],
      ['tutorExperienceYears', rawData.tutorExperienceYears],
      ['tutorSupportingNotes', rawData.tutorSupportingNotes],
    ].forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value);
      }
    });

    verificationFiles.forEach((file) => formData.append('verificationFiles', file));
    return { payload: formData, rawData };
  }

  return {
    payload: {
      firstName: rawData.firstName,
      lastName: rawData.lastName,
      email: rawData.email,
      password: rawData.password,
      role: rawData.role,
      isMinor: rawData.isMinor,
      parentName: rawData.parentName,
      parentEmail: rawData.parentEmail,
      parentPhone: rawData.parentPhone,
    },
    rawData,
  };
}

export function getRegisterErrorMessage(error) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message || 'Registration failed';
}
