import { describe, expect, test } from 'vitest';
import {
  getDefaultSearchFilters,
  parseSearchFilters,
  SEARCH_SESSION_TYPES,
  SEARCH_SORT_OPTIONS,
} from '../search-filters';

describe('search filter helpers', () => {
  test('returns a fresh copy of the default filters', () => {
    const first = getDefaultSearchFilters();
    const second = getDefaultSearchFilters();

    expect(first).toEqual({
      subject: '',
      location: '',
      sessionType: '',
      sort: 'rating',
      page: 1,
      limit: 10,
    });
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });

  test('parses valid query string values', () => {
    const params = new URLSearchParams({
      subject: 'Math',
      location: 'Sydney',
      sessionType: 'online',
      sort: 'rate_desc',
      page: '3',
    });

    expect(parseSearchFilters(params)).toEqual({
      subject: 'Math',
      location: 'Sydney',
      sessionType: 'ONLINE',
      sort: 'rate_desc',
      page: 3,
      limit: 10,
    });
  });

  test('falls back safely for invalid sort, session type, and page values', () => {
    const params = new URLSearchParams({
      sessionType: 'phone',
      sort: 'newest',
      page: '0',
    });

    expect(parseSearchFilters(params)).toEqual({
      subject: '',
      location: '',
      sessionType: '',
      sort: 'rating',
      page: 1,
      limit: 10,
    });
  });

  test('keeps the supported session types and sort values in sync with parsing expectations', () => {
    expect(SEARCH_SESSION_TYPES.map((item) => item.value)).toEqual([
      '',
      'ONLINE',
      'IN_PERSON',
      'HYBRID',
    ]);
    expect(SEARCH_SORT_OPTIONS.map((item) => item.value)).toEqual([
      'rating',
      'rate_asc',
      'rate_desc',
      'experience',
    ]);
  });
});
