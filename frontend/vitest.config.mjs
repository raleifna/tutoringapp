import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.{js,mjs,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/lib/availability-calendar.js',
        'src/lib/booking-status.js',
        'src/lib/payment-display.js',
        'src/lib/recurring-bookings.js',
        'src/lib/register-form.js',
        'src/lib/search-filters.js',
        'src/components/AvailabilityCalendar.jsx',
        'src/components/LocationCascader.jsx',
      ],
    },
  },
});
