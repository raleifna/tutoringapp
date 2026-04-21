import { describe, expect, it } from 'vitest';

import { formatBookingStatus, getBookingStatusClass } from '../src/lib/booking-status.js';

describe('booking status helpers', () => {
  it('converts main booking status values to readable labels', () => {
    expect(formatBookingStatus('UNPAID')).toBe('Unpaid');
    expect(formatBookingStatus('PENDING')).toBe('Pending');
    expect(formatBookingStatus('ACCEPTED')).toBe('Accepted');
    expect(formatBookingStatus('COMPLETED')).toBe('Completed');
    expect(formatBookingStatus('CANCELLED')).toBe('Cancelled');
    expect(formatBookingStatus('DECLINED')).toBe('Declined');
  });


  it('returns semantic styles for important statuses', () => {
    expect(getBookingStatusClass('UNPAID')).toContain('orange');
    expect(getBookingStatusClass('PENDING')).toContain('amber');
    expect(getBookingStatusClass('ACCEPTED')).toContain('blue');
    expect(getBookingStatusClass('COMPLETED')).toContain('green');
    expect(getBookingStatusClass('CANCELLED')).toContain('gray');
    expect(getBookingStatusClass('DECLINED')).toContain('red');
  });
});
