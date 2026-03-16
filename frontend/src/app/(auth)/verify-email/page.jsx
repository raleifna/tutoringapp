// src/app/(auth)/verify-email/page.jsx - Email Verification Page
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AcademicCapIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { authApi } from '../../../lib/api-entry';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
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
                Back to Login
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
