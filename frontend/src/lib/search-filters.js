export const SEARCH_SESSION_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'HYBRID', label: 'Hybrid' },
];

export const SEARCH_SORT_OPTIONS = [
  { value: 'rating', label: 'Highest rated' },
  { value: 'rate_asc', label: 'Price low to high' },
  { value: 'rate_desc', label: 'Price high to low' },
  { value: 'experience', label: 'Most experienced' },
];

export const SEARCH_LOCATION_OPTIONS = [
  {
    value: 'United States',
    label: 'United States',
    children: [
      {
        value: 'California',
        label: 'California',
        children: [
          { value: 'Los Angeles', label: 'Los Angeles' },
          { value: 'San Francisco', label: 'San Francisco' },
        ],
      },
      {
        value: 'New York',
        label: 'New York',
        children: [
          { value: 'New York City', label: 'New York City' },
          { value: 'Buffalo', label: 'Buffalo' },
        ],
      },
    ],
  },
  {
    value: 'United Kingdom',
    label: 'United Kingdom',
    children: [
      {
        value: 'England',
        label: 'England',
        children: [
          { value: 'London', label: 'London' },
          { value: 'Manchester', label: 'Manchester' },
        ],
      },
    ],
  },
  {
    value: 'China',
    label: 'China',
    children: [
      {
        value: 'Guangdong',
        label: 'Guangdong',
        children: [
          { value: 'Guangzhou', label: 'Guangzhou' },
          { value: 'Shenzhen', label: 'Shenzhen' },
        ],
      },
    ],
  },
  {
    value: 'Australia',
    label: 'Australia',
    children: [
      {
        value: 'New South Wales',
        label: 'New South Wales',
        children: [
          { value: 'Sydney', label: 'Sydney' },
          { value: 'Newcastle', label: 'Newcastle' },
        ],
      },
    ],
  },
];

const DEFAULT_SEARCH_FILTERS = {
  subject: '',
  location: '',
  sessionType: '',
  sort: 'rating',
  page: 1,
  limit: 10,
};

const SORT_VALUES = new Set(SEARCH_SORT_OPTIONS.map((item) => item.value));
const SESSION_TYPE_VALUES = new Set(SEARCH_SESSION_TYPES.map((item) => item.value));

function getPageNumber(value) {
  const next = Number.parseInt(String(value || '1'), 10);
  return Number.isFinite(next) && next > 0 ? next : 1;
}

function getInitialSort(value) {
  const next = String(value || DEFAULT_SEARCH_FILTERS.sort);
  return SORT_VALUES.has(next) ? next : DEFAULT_SEARCH_FILTERS.sort;
}

function getInitialSessionType(value) {
  const next = String(value || '').toUpperCase();
  return SESSION_TYPE_VALUES.has(next) ? next : DEFAULT_SEARCH_FILTERS.sessionType;
}

export function getDefaultSearchFilters() {
  return { ...DEFAULT_SEARCH_FILTERS };
}

export function parseSearchFilters(searchParams) {
  return {
    ...getDefaultSearchFilters(),
    subject: searchParams.get('subject') || '',
    location: searchParams.get('location') || '',
    sessionType: getInitialSessionType(searchParams.get('sessionType')),
    sort: getInitialSort(searchParams.get('sort')),
    page: getPageNumber(searchParams.get('page')),
  };
}
