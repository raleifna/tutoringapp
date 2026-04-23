import { describe, expect, it } from 'vitest';

import { formatBookingStatus, getBookingStatusClass } from '../booking-status.js';

describe('booking status helpers', () => {
  test('formats known booking statuses into readable labels', () => {
    expect(formatBookingStatus('UNPAID')).toBe('Unpaid');
    expect(formatBookingStatus('PENDING')).toBe('Pending');
    expect(formatBookingStatus('ACCEPTED')).toBe('Accepted');
    expect(formatBookingStatus('COMPLETED')).toBe('Completed');
    expect(formatBookingStatus('CANCELLED')).toBe('Cancelled');
    expect(formatBookingStatus('DECLINED')).toBe('Declined');
    expect(formatBookingStatus('RESCHEDULED')).toBe('Rescheduled');
  });

  it('returns semantic styles for important statuses', () => {
    expect(getBookingStatusClass('UNPAID')).toContain('orange');
    expect(getBookingStatusClass('PENDING')).toContain('amber');
    expect(getBookingStatusClass('ACCEPTED')).toContain('blue');
    expect(getBookingStatusClass('COMPLETED')).toContain('green');
    expect(getBookingStatusClass('CANCELLED')).toContain('gray');
    expect(getBookingStatusClass('DECLINED')).toContain('red');
  });

  test('falls back to the neutral class for unknown statuses', () => {
    expect(getBookingStatusClass('SOMETHING_ELSE')).toContain('gray');
    expect(getBookingStatusClass()).toContain('gray');
  });
});
