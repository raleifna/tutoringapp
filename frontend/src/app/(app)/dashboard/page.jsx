// src/app/(app)/dashboard/page.jsx - Learner Dashboard
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../../lib/store';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="space-y-5">
      {/* welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-5 text-white -mx-4 -mt-4 px-8 pt-6 rounded-t-none">
        <p className="text-primary-200 text-xs font-medium mb-0.5">Good day 👋</p>
        <h1 className="text-xl font-bold">
          {user?.firstName} {user?.lastName}
        </h1>
        <p className="text-primary-200 text-sm mt-1">Ready to continue learning?</p>
        <button onClick={handleLogout} className="btn-secondary mt-4">
          Log out
        </button>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Continue to the tutor search page and explore available tutors.
        </p>

        <div className="mt-4">
          <Link
            href="/search"
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Find Tutor</div>
              <div className="text-xs text-gray-500">Search tutors by subject</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
