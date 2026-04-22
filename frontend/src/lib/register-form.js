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
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain a special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: z.enum(['LEARNER', 'TUTOR']),
  isMinor: z.boolean().optional(),
  parentName: z.string().optional(),
  parentEmail: z.union([z.literal(''), z.string().email('Invalid parent email')]).optional(),
  parentPhone: z.string().optional(),
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

export function validateVerificationFiles(files = []) {
  if (!Array.isArray(files) || files.length === 0) {
    return '';
  }

  if (files.length > MAX_VERIFICATION_FILES) {
    return `Upload up to ${MAX_VERIFICATION_FILES} verification files`;
  }

  if (files.some((file) => Number(file?.size || 0) > MAX_VERIFICATION_FILE_SIZE)) {
    return `Each file must be smaller than ${Math.floor(
      MAX_VERIFICATION_FILE_SIZE / (1024 * 1024)
    )}MB`;
  }

  const totalSize = files.reduce((sum, file) => sum + Number(file?.size || 0), 0);
  if (totalSize > MAX_VERIFICATION_TOTAL_SIZE) {
    return `Combined file size must stay under ${Math.floor(
      MAX_VERIFICATION_TOTAL_SIZE / (1024 * 1024)
    )}MB`;
  }

  return '';
}

export const registerSchema = baseRegisterSchema
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    validateLearnerFields(data, ctx);
  });

export function getRegisterDefaultValues(roleParam) {
  return {
    role: roleParam === 'TUTOR' ? 'TUTOR' : 'LEARNER',
    agreeToTerms: false,
    isMinor: false,
  };
}

export function buildRegisterPayload(values) {
  const { confirmPassword, agreeToTerms, ...rawData } = values;

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
