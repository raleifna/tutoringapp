const { isAllowedOrigin } = require('../../src/utils/cors');

describe('CORS origin validation', () => {
  const originalFlag = process.env.ALLOW_TRYCLOUDFLARE_CORS;

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.ALLOW_TRYCLOUDFLARE_CORS;
    else process.env.ALLOW_TRYCLOUDFLARE_CORS = originalFlag;
  });

  test('accepts explicitly configured origins', () => {
    expect(isAllowedOrigin('https://example.com/', ['https://example.com'])).toBe(true);
  });

  test('accepts a Quick Tunnel hostname only when explicitly enabled', () => {
    process.env.ALLOW_TRYCLOUDFLARE_CORS = 'true';
    expect(isAllowedOrigin('https://random-words.trycloudflare.com', [])).toBe(true);
  });

  test('rejects lookalike and unconfigured origins', () => {
    process.env.ALLOW_TRYCLOUDFLARE_CORS = 'true';
    expect(isAllowedOrigin('https://trycloudflare.com.evil.example', ['https://example.com'])).toBe(false);
    expect(isAllowedOrigin('https://evil.example', ['https://example.com'])).toBe(false);
  });
});
