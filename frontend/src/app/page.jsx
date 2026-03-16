'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AcademicCapIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../lib/store';

const quickSubjects = [
  'Mathematics',
  'Programming',
  'English',
  'Physics',
  'Data Science',
  'IELTS Prep',
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    const subject = searchQuery.trim();
    router.push(subject ? `/search?subject=${encodeURIComponent(subject)}` : '/search');
  };

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
              <div className="text-lg font-semibold">TutorConnect</div>
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
          <h1>Find Your Tutor</h1>
          <p>Search by subject to explore tutors and continue the learning journey.</p>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/50">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  placeholder="Search by subject, for example Mathematics or Python"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <button
                onClick={handleSearch}
                className="btn-primary justify-center rounded-2xl px-6 py-3"
              >
                Search tutors
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {quickSubjects.map((subject) => (
              <Link
                key={subject}
                href={`/search?subject=${encodeURIComponent(subject)}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
              >
                {subject}
              </Link>
            ))}
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
