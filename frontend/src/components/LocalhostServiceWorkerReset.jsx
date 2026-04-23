'use client';

import { useEffect } from 'react';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const RESET_FLAG = 'localhost-sw-reset';

export default function LocalhostServiceWorkerReset() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!LOCAL_HOSTS.has(window.location.hostname)) return;
    if (!('serviceWorker' in navigator)) return;

    const unregisterLocalServiceWorkers = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();

      if (!registrations.length) {
        sessionStorage.removeItem(RESET_FLAG);
        return;
      }

      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
      }

      if (!sessionStorage.getItem(RESET_FLAG)) {
        sessionStorage.setItem(RESET_FLAG, '1');
        window.location.reload();
      }
    };

    unregisterLocalServiceWorkers().catch(() => {});
  }, []);

  return null;
}
