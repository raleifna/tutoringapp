import { describe, test, expect } from 'vitest';
import {
  registerSchema,
  validateVerificationFiles,
  MAX_VERIFICATION_FILES,
  MAX_VERIFICATION_FILE_SIZE,
  MAX_VERIFICATION_TOTAL_SIZE,
} from '../register-form';

const valid = {
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  password: 'Secure1!',
  confirmPassword: 'Secure1!',
  role: 'LEARNER',
  agreeToTerms: true,
};

describe('registerSchema', () => {
  test('accepts a valid learner registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  test('rejects the main conditional validation failures', () => {
    const cases = [
      { ...valid, confirmPassword: 'Different1!' },
      { ...valid, isMinor: true, parentName: '' },
      { ...valid, isMinor: true, parentName: '   ' },
      { ...valid, agreeToTerms: false },
    ];

    cases.forEach((payload) => {
      expect(registerSchema.safeParse(payload).success).toBe(false);
    });
  });

  test('accepts tutor registration without verification materials', () => {
    const tutorPayload = {
      ...valid,
      role: 'TUTOR',
    };

    expect(registerSchema.safeParse(tutorPayload).success).toBe(true);
  });
});

describe('validateVerificationFiles', () => {
  const file = (size) => ({ size });

  test('allows an empty file list', () => {
    expect(validateVerificationFiles([])).toBe('');
  });

  test('rejects count and size limit violations', () => {
    const tooManyFiles = Array.from({ length: MAX_VERIFICATION_FILES + 1 }, () => file(1024));

    expect(validateVerificationFiles(tooManyFiles)).not.toBe('');
    expect(validateVerificationFiles([file(MAX_VERIFICATION_FILE_SIZE + 1)])).not.toBe('');
  });

  test('rejects files whose combined size exceeds the total limit', () => {
    const files = [
      file(MAX_VERIFICATION_TOTAL_SIZE - 1024),
      file(2048),
    ];

    expect(validateVerificationFiles(files)).not.toBe('');
  });
});
