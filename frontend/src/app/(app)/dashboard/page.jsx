// src/app/(app)/dashboard/page.jsx - Learner Dashboard
'use client';

import { useRouter } from 'next/navigation';
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
            <button onClick={handleLogout} className="btn-secondary">
                Log out
            </button>
        </div>
    </div>

  );
}
