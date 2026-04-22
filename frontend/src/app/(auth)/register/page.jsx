'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { AcademicCapIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authApi } from '../../../lib/api-entry';
import {
  buildRegisterPayload,
  getRegisterDefaultValues,
  getRegisterErrorMessage,
  registerSchema,
} from '../../../lib/register-form';

function RegisterContent() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredRole, setRegisteredRole] = useState('LEARNER');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: getRegisterDefaultValues(searchParams.get('role')),
  });

  const selectedRole = watch('role');
  const isMinor = watch('isMinor');

  const handleRoleChange = (role) => {
    setValue('role', role, { shouldValidate: true });
  };

  const onSubmit = async (values) => {
    const { payload, rawData } = buildRegisterPayload(values);

    setIsLoading(true);
    try {
      const response = await authApi.register(payload);
      setRegisteredEmail(rawData.email);
      setRegisteredRole(rawData.role);
      setVerificationUrl(response?.data?.verificationUrl || '');
      setRegistered(true);
    } catch (error) {
      toast.error(getRegisterErrorMessage(error));
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
              Your account was created. Verify your email first, then upload your tutor verification
              materials after your first login.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-6">Please verify your email before logging in.</p>
          )}

          <Link href="/login" className="btn-primary btn-lg justify-center inline-flex">
            Go to Login
          </Link>

          {verificationUrl ? (
            <a
              href={verificationUrl}
              className="mt-3 inline-flex items-center justify-center rounded-xl border border-primary-200 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              Open Verification Link
            </a>
          ) : null}

          <p className="text-sm text-gray-500 mt-4">
            Didn't receive it?{' '}
            <button
              type="button"
              disabled={isResending}
              className="text-primary-600 hover:underline disabled:opacity-60"
              onClick={async () => {
                setIsResending(true);
                try {
                  const response = await authApi.resendVerification({ email: registeredEmail });
                  setVerificationUrl(response?.data?.verificationUrl || '');
                  toast.success('Verification email resent');
                } catch (error) {
                  toast.error(getRegisterErrorMessage(error));
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
                placeholder="At least 8 characters and contain a special character"
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

          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" {...register('agreeToTerms')} className="mt-1 rounded border-gray-300" onClick={(e) => {
                  if (!watch('agreeToTerms')) {
                    e.preventDefault();
                    setIsPrivacyModalOpen(true);
                  }
                }} />
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
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-900">Privacy Policy</h2>
              <button
                onClick={() => setIsPrivacyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="space-y-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-900 text-base">Welcome to TutorConnect.</p>
                <p>We value your privacy and are committed to protecting your personal information. This policy explains how we collect, use, store, and share your data when you use our platform.</p>

                <div>
                  <p className="font-medium text-gray-900 mb-2">We may collect basic information such as:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>your name</li>
                    <li>email address</li>
                    <li>account details</li>
                    <li>booking and session information</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-gray-900 mb-2">We use this information to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>create and manage your account</li>
                    <li>connect learners with tutors</li>
                    <li>handle bookings and payments</li>
                    <li>improve our platform and user experience</li>
                  </ul>
                </div>

                <p>We apply appropriate security measures to protect your data.</p>

                <div>
                  <p className="font-medium text-gray-900 mb-2">In some cases, we may request access to certain device features, such as:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>camera</li>
                    <li>storage</li>
                    <li>notifications</li>
                  </ul>
                </div>

                <p>These permissions are only used to support platform features, and you can manage them in your device settings.</p>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('agreeToTerms', true, { shouldValidate: true });
                  setIsPrivacyModalOpen(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-sm"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
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
