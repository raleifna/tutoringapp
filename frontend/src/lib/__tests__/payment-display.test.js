import { describe, expect, test } from 'vitest';
import {
  formatPaymentStatus,
  formatSavedMethod,
  getPaymentStatusClass,
} from '../payment-display';

describe('payment display helpers', () => {
  test('formats key payment statuses into readable labels', () => {
    expect(formatPaymentStatus('PAID')).toBe('Paid');
    expect(formatPaymentStatus('COMPLETED')).toBe('Paid');
    expect(formatPaymentStatus('PROCESSING')).toBe('Processing');
    expect(formatPaymentStatus('FAILED')).toBe('Payment Failed');
    expect(formatPaymentStatus('REFUNDED')).toBe('Refunded');
    expect(formatPaymentStatus('CANCELLED')).toBe('Cancelled');
  });

  test('treats unknown or missing payment statuses as pending', () => {
    expect(formatPaymentStatus('PENDING')).toBe('Pending');
    expect(formatPaymentStatus('UNKNOWN')).toBe('Pending');
    expect(formatPaymentStatus()).toBe('Pending');
  });

  test('returns semantic classes for key payment states', () => {
    expect(getPaymentStatusClass('PAID')).toContain('emerald');
    expect(getPaymentStatusClass('COMPLETED')).toContain('emerald');
    expect(getPaymentStatusClass('PROCESSING')).toContain('blue');
    expect(getPaymentStatusClass('FAILED')).toContain('red');
    expect(getPaymentStatusClass('REFUNDED')).toContain('gray');
    expect(getPaymentStatusClass('CANCELLED')).toContain('gray');
    expect(getPaymentStatusClass('PENDING')).toContain('amber');
  });

  test('formats saved payment methods without exposing full card details', () => {
    expect(formatSavedMethod({ brand: 'visa', last4: '4242' })).toBe('Visa ending in 4242');
    expect(formatSavedMethod({ brand: 'mastercard', last4: '4444' })).toBe(
      'Mastercard ending in 4444'
    );
    expect(formatSavedMethod({ brand: '', last4: '1234' })).toBe('Card ending in 1234');
  });

  test('returns a safe fallback when no saved payment method exists', () => {
    expect(formatSavedMethod(null)).toBe('No payment method saved');
    expect(formatSavedMethod({})).toBe('No payment method saved');
    expect(formatSavedMethod({ brand: 'visa' })).toBe('No payment method saved');
  });
});
