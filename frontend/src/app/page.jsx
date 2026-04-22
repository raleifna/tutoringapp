'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = () => {
    const subject = searchQuery.trim();
    router.push(
      subject
        ? `/search?from=home&subject=${encodeURIComponent(subject)}`
        : '/search?from=home'
    );
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    handleSearch();
  };

  const currentUser = mounted ? user : null;
  const dashboardHref =
    currentUser?.role === 'TUTOR'
      ? '/tutor/dashboard'
      : currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN'
        ? '/admin/dashboard'
        : '/dashboard';

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
              <div className="text-xs text-slate-500">Search, book, learn</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {currentUser ? (
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
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <section className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/50">
          <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            TutorConnect
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            Find the right tutor, book lessons, and manage learning in one place.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            TutorConnect helps learners discover tutors, request sessions, manage payments, and keep track of every booking.
          </p>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/60">
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by subject, for example Mathematics or Python"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <button
                type="submit"
                className="btn-primary justify-center rounded-2xl px-6 py-3"
              >
                Search tutors
              </button>
            </form>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {quickSubjects.map((subject) => (
              <Link
                key={subject}
                href={`/search?from=home&subject=${encodeURIComponent(subject)}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
              >
                {subject}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {[
            {
              title: '1. Search tutors',
              body: 'Filter by subject, price, rating and session type, then open the tutor profile.',
              icon: MagnifyingGlassIcon,
            },
            {
              title: '2. Book a lesson',
              body: 'Pick a subject, choose a time and submit a booking request from the tutor page.',
              icon: CalendarDaysIcon,
            },
            {
              title: '3. Manage the booking',
              body: 'Learners track progress in My Bookings, tutors accept, decline or complete requests.',
              icon: AcademicCapIcon,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              </div>
            </div>
          ))}

          {!currentUser && (
            <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-6">
              <p className="text-sm leading-6 text-sky-900">
                Guests can browse tutors immediately. Create a learner or tutor account when you
                want to book or manage sessions.
              </p>
              <div className="mt-4 flex gap-3">
                <Link href="/register" className="btn-primary btn-sm rounded-full px-5">
                  Create account
                </Link>
                <Link
                  href="/register?role=TUTOR"
                  className="btn-secondary btn-sm rounded-full px-5"
                >
                  Become a tutor
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
