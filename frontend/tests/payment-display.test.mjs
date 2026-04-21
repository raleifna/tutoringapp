import { describe, expect, it } from 'vitest';

import {
  formatPaymentStatus,
  formatSavedMethod,
  getPaymentStatusClass,
} from '../src/lib/payment-display.js';

describe('payment display helpers', () => {
  it('converts payment status values to readable labels', () => {
    expect(formatPaymentStatus('PROCESSING')).toBe('Processing');
    expect(formatPaymentStatus('FAILED')).toBe('Payment Failed');
    expect(formatPaymentStatus('REFUNDED')).toBe('Refunded');
    expect(formatPaymentStatus('PAID')).toBe('Paid');
    expect(formatPaymentStatus('COMPLETED')).toBe('Paid');
  });

  it('uses clear colours for important payment statuses', () => {
    expect(getPaymentStatusClass('PROCESSING')).toContain('blue');
    expect(getPaymentStatusClass('FAILED')).toContain('red');
    expect(getPaymentStatusClass('PAID')).toContain('emerald');
    expect(getPaymentStatusClass('REFUNDED')).toContain('gray');
  });

  it('test saved card details without exposing full card numbers', () => {
    expect(formatSavedMethod({ brand: 'visa', last4: '4242' })).toBe('Visa ending in 4242');
    expect(formatSavedMethod({ brand: 'mastercard', last4: '4444' })).toBe('Mastercard ending in 4444');
  });

  it('shows a safe fallback when no card is saved', () => {
    expect(formatSavedMethod(null)).toBe('No payment method saved');
    expect(formatSavedMethod({ brand: 'visa' })).toBe('No payment method saved');
  });
});
