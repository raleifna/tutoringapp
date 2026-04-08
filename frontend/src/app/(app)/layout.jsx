'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  CalendarIcon as CalendarIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid';
import { messageApi } from '../../lib/api-entry';
import { useAuthStore, useMessageStore } from '../../lib/store';

const isGuestBrowsePath = (pathname = '') =>
  pathname === '/search' || pathname.startsWith('/tutors/');

const getLearnerNav = () => [
  { href: '/dashboard', label: 'Home', icon: HomeIcon, activeIcon: HomeIconSolid },
  {
    href: '/search',
    label: 'Search',
    icon: MagnifyingGlassIcon,
    activeIcon: MagnifyingGlassIconSolid,
  },
  { href: '/bookings', label: 'Bookings', icon: CalendarIcon, activeIcon: CalendarIconSolid },
  {
    href: '/messages',
    label: 'Messages',
    icon: ChatBubbleLeftRightIcon,
    activeIcon: ChatBubbleLeftRightIconSolid,
  },
  { href: '/profile', label: 'Profile', icon: UserIcon, activeIcon: UserIconSolid },
];

const getTutorNav = () => [
  { href: '/tutor/dashboard', label: 'Home', icon: HomeIcon, activeIcon: HomeIconSolid },
  { href: '/tutor/requests', label: 'Requests', icon: CalendarIcon, activeIcon: CalendarIconSolid },
  {
    href: '/messages',
    label: 'Messages',
    icon: ChatBubbleLeftRightIcon,
    activeIcon: ChatBubbleLeftRightIconSolid,
  },
  { href: '/tutor/profile', label: 'Profile', icon: UserIcon, activeIcon: UserIconSolid },
];

const pageTitles = {
  '/dashboard': 'Home',
  '/search': 'Search',
  '/bookings': 'Bookings',
  '/messages': 'Messages',
  '/profile': 'Profile',
  '/tutor/dashboard': 'Dashboard',
  '/tutor/requests': 'Requests',
  '/tutor/profile': 'Tutor Profile',
};

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const unreadCount = useMessageStore((state) => state.unreadCount);
  const setUnreadCount = useMessageStore((state) => state.setUnreadCount);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isGuestPath = useMemo(() => isGuestBrowsePath(pathname || ''), [pathname]);

  useEffect(() => {
    if (!mounted) return;
    if (isGuestPath) return;
    if (accessToken) return;

    router.replace('/login');
  }, [mounted, isGuestPath, accessToken, router]);

  useEffect(() => {
    if (!accessToken || !user || user.role === 'ADMIN') return;

    let cancelled = false;

    const loadUnread = async () => {
      try {
        const res = await messageApi.getUnreadCount();
        if (!cancelled) {
          setUnreadCount(res?.data?.data?.count || 0);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    };

    loadUnread();

    return () => {
      cancelled = true;
    };
  }, [accessToken, pathname, setUnreadCount, user]);

  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  if (!accessToken && !isGuestPath) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Redirecting to login...
      </div>
    );
  }

  const navItems =
    user?.role === 'TUTOR'
      ? getTutorNav()
      : user?.role === 'LEARNER'
        ? getLearnerNav()
        : [];

  const pageTitle =
    Object.entries(pageTitles).find(([key]) => pathname === key || pathname.startsWith(key + '/'))
      ?.[1] || 'TutorConnect';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <h1 className="text-base font-semibold text-gray-900">{pageTitle}</h1>

          {navItems.length > 0 && (
            <nav className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = isActive ? item.activeIcon : item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-50 font-semibold text-primary-700'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="relative">
                      <Icon className="h-4 w-4" />
                      {item.href === '/messages' && unreadCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 pb-24 md:pb-8">{children}</main>

      {navItems.length > 0 && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white md:hidden">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-around px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = isActive ? item.activeIcon : item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-1 flex-col items-center justify-center gap-1 py-1"
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                    {item.href === '/messages' && unreadCount > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] ${isActive ? 'font-semibold text-primary-600' : 'text-gray-400'}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
