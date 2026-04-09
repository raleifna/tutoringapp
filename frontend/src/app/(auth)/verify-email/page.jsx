// src/app/(auth)/verify-email/page.jsx - Email Verification Page
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AcademicCapIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { authApi } from '../../../lib/api-entry';
import toast from 'react-hot-toast';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const rawToken = searchParams.get('token');
  const token = rawToken ? String(rawToken).trim().replace(/^['"]|['"]$/g, '') : '';
  const rawEmail = searchParams.get('email');
  const email = rawEmail ? String(rawEmail).trim() : '';
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    if (!token) {
      if (email) {
        setStatus('pending');
        setMessage(`We sent a verification link to ${email}`);
      } else {
        setStatus('error');
        setMessage('No verification token provided.');
      }
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(
          error?.response?.data?.message ||
            'This verification link is invalid or has expired. Please request a new one.'
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <AcademicCapIcon className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">TutorConnect</span>
        </Link>

        {status === 'loading' && (
          <>
            <div className="w-14 h-14 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Verifying your email...</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link href="/login" className="btn-primary btn-lg justify-center inline-flex">
              Sign In to Your Account
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircleIcon className="w-9 h-9 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Link href="/login" className="btn-primary btn-lg justify-center inline-flex w-full">
                Back
              </Link>
              <p className="text-sm text-gray-500">
                Need a new link?{' '}
                <Link href="/register" className="text-primary-600 hover:underline">
                  Register again
                </Link>
                .
              </p>
            </div>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AcademicCapIcon className="w-9 h-9 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Link href="/login" className="btn-primary btn-lg justify-center inline-flex w-full">
                Back
              </Link>
              <button
                type="button"
                disabled={isResending}
                className="w-full text-sm text-primary-600 hover:underline disabled:opacity-60"
                onClick={async () => {
                  if (!email) return;
                  setIsResending(true);
                  try {
                    const response = await authApi.resendVerification({ email });
                    setVerificationUrl(response?.data?.verificationUrl || '');
                    toast.success('Verification email resent');
                  } catch (error) {
                    toast.error(error?.response?.data?.message || 'Resend failed');
                  } finally {
                    setIsResending(false);
                  }
                }}
              >
                {isResending ? 'Sending...' : 'Resend verification email'}
              </button>
              {verificationUrl ? (
                <a
                  href={verificationUrl}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-primary-200 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  Open Verification Link
                </a>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
