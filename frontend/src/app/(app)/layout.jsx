'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/store';

const isGuestBrowsePath = (pathname = '') =>
  pathname === '/search' || pathname.startsWith('/tutors/');

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((state) => state.accessToken);
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

  return <div className="mx-auto max-w-5xl px-4 py-4">{children}</div>;
}
