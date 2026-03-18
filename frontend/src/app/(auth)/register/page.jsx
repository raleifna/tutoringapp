// src/app/(auth)/register/page.jsx - Registration Page
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { AcademicCapIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authApi } from '../../../lib/api-entry';

const MAX_VERIFICATION_FILES = 5;
const MAX_VERIFICATION_FILE_SIZE = 5 * 1024 * 1024;
const MAX_VERIFICATION_TOTAL_SIZE = 25 * 1024 * 1024;

const registerSchema = z
  .object({
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
    agreeToTerms: z.boolean().refine((v) => v === true, 'You must agree to the terms'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.role === 'LEARNER' && data.isMinor && !data.parentName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Parent/guardian name is required for minors',
        path: ['parentName'],
      });
    }

    if (data.role === 'TUTOR' && !data.tutorEducationSummary?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Education summary is required for tutors',
        path: ['tutorEducationSummary'],
      });
    }
  });

const getErrorMessage = (error) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message || 'Registration failed';
};

function RegisterContent() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredRole, setRegisteredRole] = useState('LEARNER');
  const [verificationFiles, setVerificationFiles] = useState([]);
  const [verificationFileError, setVerificationFileError] = useState('');

  const defaultRole = searchParams.get('role') === 'TUTOR' ? 'TUTOR' : 'LEARNER';
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: defaultRole, agreeToTerms: false, isMinor: false },
  });

  const selectedRole = watch('role');
  const isMinor = watch('isMinor');

  const handleRoleChange = (role) => {
    setValue('role', role, { shouldValidate: true });
    if (role !== 'TUTOR') {
      setVerificationFiles([]);
      setVerificationFileError('');
    }
  };

  const handleVerificationFilesChange = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length > MAX_VERIFICATION_FILES) {
      setVerificationFiles([]);
      setVerificationFileError(`Upload up to ${MAX_VERIFICATION_FILES} files`);
      return;
    }

    if (files.some((file) => file.size > MAX_VERIFICATION_FILE_SIZE)) {
      setVerificationFiles([]);
      setVerificationFileError('Each file must be 5MB or smaller');
      return;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_VERIFICATION_TOTAL_SIZE) {
      setVerificationFiles([]);
      setVerificationFileError('Total file size must stay within 25MB');
      return;
    }

    setVerificationFiles(files);
    setVerificationFileError('');
  };

  const onSubmit = async (values) => {
    const { confirmPassword, agreeToTerms, ...rawData } = values;

    if (rawData.role === 'TUTOR' && verificationFiles.length === 0) {
      setVerificationFileError('Please upload at least one verification file');
      return;
    }

    const payload =
      rawData.role === 'TUTOR'
        ? (() => {
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
            return formData;
          })()
        : {
            firstName: rawData.firstName,
            lastName: rawData.lastName,
            email: rawData.email,
            password: rawData.password,
            role: rawData.role,
            isMinor: rawData.isMinor,
            parentName: rawData.parentName,
            parentEmail: rawData.parentEmail,
            parentPhone: rawData.parentPhone,
          };

    setIsLoading(true);
    try {
      await authApi.register(payload);
      setRegisteredEmail(rawData.email);
      setRegisteredRole(rawData.role);
      setRegistered(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
          <p className="text-gray-600 text-sm mb-1">We sent a verification link to</p>
          <p className="font-semibold text-gray-900 mb-4">{registeredEmail}</p>
          {registeredRole === 'TUTOR' ? (
            <p className="text-sm text-gray-500 mb-6">
              Your account was created. Tutor verification files were submitted for admin review.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-6">Please verify your email before logging in.</p>
          )}

          <Link href="/login" className="btn-primary btn-lg justify-center inline-flex">
            Go to Login
          </Link>

          <p className="text-sm text-gray-500 mt-4">
            Didn't receive it?{' '}
            <button
              type="button"
              disabled={isResending}
              className="text-primary-600 hover:underline disabled:opacity-60"
              onClick={async () => {
                setIsResending(true);
                try {
                  await authApi.resendVerification({ email: registeredEmail });
                  toast.success('Verification email resent');
                } catch (error) {
                  toast.error(getErrorMessage(error));
                } finally {
                  setIsResending(false);
                }
              }}
            >
              {isResending ? 'Sending...' : 'Resend verification email'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white flex flex-col">
      <Link href="/" className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-sm text-gray-500">
        <span>←</span> Back
      </Link>

      <div className="flex-1 w-full max-w-md mx-auto px-6 pt-8 pb-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
            <AcademicCapIcon className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-sm text-gray-500">Create your TutorConnect account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Join as</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleChange('LEARNER')}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  selectedRole === 'LEARNER'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                Learner
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('TUTOR')}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  selectedRole === 'TUTOR'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                Tutor
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input {...register('firstName')} type="text" className="input" placeholder="First name" />
              {errors.firstName && <p className="error-text">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Last name</label>
              <input {...register('lastName')} type="text" className="input" placeholder="Last name" />
              {errors.lastName && <p className="error-text">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" autoComplete="email" className="input" placeholder="you@example.com" />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="input pr-10"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label">Confirm password</label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="input pr-10"
                placeholder="Repeat your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showConfirmPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
          </div>

          {selectedRole === 'LEARNER' && (
            <>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" {...register('isMinor')} className="mt-1 rounded border-gray-300" />
                <span>I am under 18 years old</span>
              </label>

              {isMinor && (
                <>
                  <div>
                    <label className="label">Parent/guardian name</label>
                    <input {...register('parentName')} type="text" className="input" placeholder="Parent name" />
                    {errors.parentName && <p className="error-text">{errors.parentName.message}</p>}
                  </div>

                  <div>
                    <label className="label">Parent/guardian email</label>
                    <input
                      {...register('parentEmail')}
                      type="email"
                      className="input"
                      placeholder="parent@example.com"
                    />
                    {errors.parentEmail && <p className="error-text">{errors.parentEmail.message}</p>}
                  </div>

                  <div>
                    <label className="label">Parent/guardian phone (optional)</label>
                    <input {...register('parentPhone')} type="text" className="input" placeholder="04xx xxx xxx" />
                  </div>
                </>
              )}
            </>
          )}

          {selectedRole === 'TUTOR' && (
            <>
              <div>
                <label className="label">Education summary</label>
                <textarea
                  {...register('tutorEducationSummary')}
                  rows={3}
                  className="input resize-y"
                  placeholder="Tell us about your education background"
                />
                {errors.tutorEducationSummary && (
                  <p className="error-text">{errors.tutorEducationSummary.message}</p>
                )}
              </div>

              <div>
                <label className="label">Years of teaching experience (optional)</label>
                <input
                  {...register('tutorExperienceYears')}
                  type="text"
                  className="input"
                  placeholder="e.g. 2"
                />
              </div>

              <div>
                <label className="label">Supporting notes (optional)</label>
                <textarea
                  {...register('tutorSupportingNotes')}
                  rows={3}
                  className="input resize-y"
                  placeholder="Anything else you want reviewers to know"
                />
              </div>

              <div>
                <label className="label">Verification files</label>
                <input
                  type="file"
                  multiple
                  onChange={handleVerificationFilesChange}
                  className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Up to 5 files, 5MB each, 25MB total</p>
                {verificationFiles.length > 0 && (
                  <p className="mt-1 text-xs text-gray-600">{verificationFiles.length} file(s) selected</p>
                )}
                {verificationFileError && <p className="error-text">{verificationFileError}</p>}
              </div>
            </>
          )}

          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" {...register('agreeToTerms')} className="mt-1 rounded border-gray-300" />
            <span>I agree to the terms and privacy policy.</span>
          </label>
          {errors.agreeToTerms && <p className="error-text -mt-2">{errors.agreeToTerms.message}</p>}

          <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full justify-center rounded-2xl">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              `Create ${selectedRole === 'TUTOR' ? 'Tutor' : 'Learner'} Account`
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6 pb-8">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
