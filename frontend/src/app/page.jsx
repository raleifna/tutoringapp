'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../lib/store';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const dashboardHref = user?.role === 'TUTOR' ? '/tutor/dashboard' : '/dashboard';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_35%),linear-gradient(180deg,#f8fbff_0%,#ffffff_45%,#f3f6fb_100%)]">
      <header className="border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 text-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200">
              <AcademicCapIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold">TutorConnect Lite</div>
              <div className="text-xs text-slate-500">A lightweight tutoring platform</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href={dashboardHref} className="btn-primary btn-sm rounded-full px-5">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-slate-600">
                  Log in
                </Link>
                <Link href="/register" className="btn-primary btn-sm rounded-full px-5">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="page-shell">
        <section className="hero-card">
          <span className="eyebrow">TutorConnect</span>
          <h1>Project Workspace</h1>
          <div className="mt-6 text-sm text-slate-500">
            Current search value: {searchQuery || 'empty'}
          </div>
        </section>

        <section className="stack-card">
          <h2>Current Stack</h2>
          <ul>
            <li>Next.js frontend on port 3000</li>
            <li>Express backend on port 5000, mapped to host 5050</li>
            <li>Nginx gateway on port 8080</li>
            <li>Docker Compose local deployment config</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
