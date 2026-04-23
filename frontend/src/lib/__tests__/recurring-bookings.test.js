import { describe, test, expect } from 'vitest';
import {
  isRecurringBooking,
  getRecurringSeriesBookings,
  getRecurringSessionCount,
  getBookingDisplayStatus,
  needsPaymentSetup,
  getSeriesTotalAmount,
} from '../recurring-bookings';

const booking = (overrides = {}) => ({
  status: 'PENDING',
  totalAmount: 50,
  payment: { status: 'PENDING' },
  ...overrides,
});

describe('recurring booking helpers', () => {
  test('detects recurring bookings and uses the series session count', () => {
    const recurring = booking({ recurringGroupId: 'g1', recurringSeries: { totalSessions: 8, bookings: [] } });

    expect(isRecurringBooking(null)).toBe(false);
    expect(isRecurringBooking(booking({ recurringType: 'ONE_OFF' }))).toBe(false);
    expect(isRecurringBooking(recurring)).toBe(true);
    expect(getRecurringSessionCount(recurring)).toBe(8);
  });

  test('falls back to one session when a recurring booking has no series details', () => {
    expect(getRecurringSessionCount(booking({ recurringGroupId: 'g1' }))).toBe(1);
  });

  test('sorts series bookings and sums their amounts', () => {
    const recurring = booking({
      recurringGroupId: 'g1',
      recurringSeries: {
        bookings: [
          booking({ id: 'b2', scheduledAt: '2024-06-10T10:00:00Z', totalAmount: 20 }),
          booking({ id: 'b1', scheduledAt: '2024-06-03T10:00:00Z', totalAmount: 30 }),
        ],
      },
    });

    const sorted = getRecurringSeriesBookings(recurring);
    expect(sorted.map((item) => item.id)).toEqual(['b1', 'b2']);
    expect(getSeriesTotalAmount(sorted)).toBe(50);
  });

  test('requires payment only for actionable unpaid bookings', () => {
    expect(needsPaymentSetup(booking({ status: 'ACCEPTED', payment: { status: 'PENDING' } }))).toBe(true);
    expect(needsPaymentSetup(booking({ status: 'ACCEPTED', payment: { status: 'PAID' } }))).toBe(false);
    expect(needsPaymentSetup(booking({ status: 'COMPLETED' }))).toBe(false);
  });

  test('treats missing payment as pending for actionable bookings', () => {
    expect(needsPaymentSetup(booking({ status: 'PENDING', payment: null }))).toBe(true);
  });

  test('keeps pending booking status after a payment method is saved', () => {
    expect(getBookingDisplayStatus(booking({ status: 'PENDING', payment: { status: 'PENDING' } }))).toBe('PENDING');
    expect(getBookingDisplayStatus(booking({ status: 'UNPAID', payment: { status: 'PENDING' } }))).toBe('UNPAID');
  });
});
