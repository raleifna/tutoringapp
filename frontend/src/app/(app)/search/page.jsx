// src/app/(app)/search/page.jsx - Tutor search page
'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { subjectApi, tutorApi } from '../../../lib/api-entry';
import { useAuthStore } from '../../../lib/store';

const SESSION_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest rated' },
  { value: 'rate_asc', label: 'Price low to high' },
  { value: 'rate_desc', label: 'Price high to low' },
  { value: 'experience', label: 'Most experienced' },
];

export const locationOptions = [
  {
    value: 'United States',
    label: 'United States',
    children: [
      {
        value: 'California',
        label: 'California',
        children: [
          { value: 'Los Angeles', label: 'Los Angeles' },
          { value: 'San Francisco', label: 'San Francisco' }
        ]
      },
      {
        value: 'New York',
        label: 'New York',
        children: [
          { value: 'New York City', label: 'New York City' },
          { value: 'Buffalo', label: 'Buffalo' }
        ]
      }
    ]
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
          { value: 'Manchester', label: 'Manchester' }
        ]
      }
    ]
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
          { value: 'Shenzhen', label: 'Shenzhen' }
        ]
      }
    ]
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
          { value: 'Newcastle', label: 'Newcastle' }
        ]
      }
    ]
  }
];

const LocationCascader = ({ value, updateFilter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState([]); 
  const [activePath, setActivePath] = useState([]);     
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!value) {
      setSelectedPath([]);
      setActivePath([]);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (option, level) => {
    const newActivePath = activePath.slice(0, level);
    newActivePath.push(option);
    setActivePath(newActivePath);

    if (!option.children || option.children.length === 0) {
      setSelectedPath(newActivePath);
      setIsOpen(false); 
      const locationString = newActivePath.map(item => item.label).reverse()[0];
      updateFilter('location', locationString);
    }
  };
  const getColumns = () => {
    const columns = [locationOptions]; 
    let currentOptions = locationOptions;

    activePath.forEach(selectedItem => {
      const option = currentOptions.find(opt => opt.value === selectedItem.value);
      if (option && option.children) {
        columns.push(option.children);
        currentOptions = option.children;
      }
    });

    return columns;
  };

  const displayValue = selectedPath.length > 0 
    ? selectedPath.map(item => item.label).join(' / ') 
    : '';

  return (
    <div className="relative w-full max-w-sm" ref={wrapperRef}>
      <div 
        className="w-full p-3 border border-gray-300 rounded-xl bg-white cursor-pointer flex justify-between items-center hover:border-blue-400 transition-colors"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && selectedPath.length > 0) {
            setActivePath(selectedPath);
          }
        }}
      >
        <span className={displayValue ? "text-gray-900" : "text-gray-400"}>
          {displayValue || "e.g. Sydney"}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 shadow-lg rounded-md flex overflow-hidden">
          {getColumns().map((columnOptions, level) => (
            <ul 
              key={level} 
              className="min-w-[150px] max-h-64 overflow-y-auto border-r border-gray-100 last:border-r-0 py-1"
            >
              {columnOptions.map(option => {
                const isActive = activePath[level]?.value === option.value;
                return (
                  <li
                    key={option.value}
                    onClick={() => handleOptionClick(option, level)}
                    className={`px-4 py-2 cursor-pointer text-sm flex justify-between items-center transition-colors
                      ${isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {option.label}
                    {option.children && (
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      )}
    </div>
  );
};

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const from = (searchParams.get('from') || '').toLowerCase();

  const [filters, setFilters] = useState({
    subject: searchParams.get('subject') || '',
    location: '',
    sessionType: '',
    sort: 'rating',
    page: 1,
    limit: 10,
  });

  // Stage 2 priority #1: category list
  const { data: categoriesData } = useQuery({
    queryKey: ['subject-categories'],
    queryFn: () => subjectApi.getCategories(),
  });
  const categoriesLoading = !categoriesData;

  // Stage 2 priority #2: tutor search
  const {
    data: tutorsData,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['tutor-search', filters],
    queryFn: () => tutorApi.search(filters),
    keepPreviousData: true,
  });

  const categories = useMemo(() => {
    const raw = categoriesData?.data?.data || [];
    return raw
      .map((item) => {
        if (typeof item === 'string') return item;
        return item?.name || item?.category || '';
      })
      .filter(Boolean);
  }, [categoriesData]);

  const tutors = tutorsData?.data?.data?.tutors || [];
  const pagination = tutorsData?.data?.data?.pagination || {};
  const currentPage = pagination.page || filters.page;
  const totalPages = pagination.totalPages || 1;
  const totalTutors = pagination.total || tutors.length;

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      subject: '',
      location: '',
      sessionType: '',
      sort: 'rating',
      page: 1,
      limit: 10,
    });
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setFilters((prev) => ({ ...prev, page: nextPage }));
  };

  const fallbackBackHrefMap = {
    home: '/',
    dashboard: '/dashboard',
    'admin-dashboard': '/admin/dashboard',
    bookings: '/bookings',
    'tutor-dashboard': '/tutor/dashboard',
    'tutor-requests': '/tutor/requests',
  };

  const fallbackBackHref =
    fallbackBackHrefMap[from] ||
    (user?.role === 'TUTOR'
      ? '/tutor/dashboard'
      : user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN'
        ? '/admin/dashboard'
        : user
          ? '/dashboard'
          : '/');

  const handleBack = () => {
    router.push(fallbackBackHref);
  };

  return (
    <div className="relative min-h-screen px-4 py-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={handleBack}
        className="absolute top-10 right-10 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600"
      >
        <span>←</span> Back
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AcademicCapIcon className="w-6 h-6 text-primary-600" />
          <h1 className="text-xl font-bold text-gray-900">Find Tutors</h1>
          {isFetching && !isLoading && <span className="text-xs text-gray-400">Updating...</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Subject</label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.subject}
                onChange={(event) => updateFilter('subject', event.target.value)}
                className="input pl-9"
                placeholder="e.g. Mathematics"
              />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <LocationCascader value={filters.location} updateFilter={updateFilter} />
          </div>
          <div>
            <label className="label">Session Type</label>
            <select
              value={filters.sessionType}
              onChange={(event) => updateFilter('sessionType', event.target.value)}
              className="input"
            >
              {SESSION_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Sort</label>
            <select
              value={filters.sort}
              onChange={(event) => updateFilter('sort', event.target.value)}
              className="input"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {categoriesLoading && (
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 4 }).map((_, index) => (
              <span key={index} className="h-7 w-20 rounded-full bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => updateFilter('subject', '')}
              className={`px-3 py-1 rounded-full text-xs border ${
                !filters.subject
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => updateFilter('subject', category)}
                className={`px-3 py-1 rounded-full text-xs border ${
                  filters.subject === category
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{isLoading ? 'Searching...' : `${totalTutors} tutors found`}</p>
          <button type="button" onClick={clearFilters} className="text-sm text-primary-600 hover:underline">
            Clear filters
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <SearchFallback />}

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-700 mb-1">
              Search failed
            </p>
            <p className="text-sm text-red-700 mb-3">
              {error?.response?.data?.message || 'Failed to load tutors.'}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => refetch()} className="btn-primary btn-sm">
                Retry
              </button>
              <button type="button" onClick={clearFilters} className="btn-secondary btn-sm">
                Clear filters
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && tutors.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <AcademicCapIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-700 font-medium">No tutors found.</p>
            <p className="text-gray-500 text-sm mt-1 mb-4">Try changing subject, location, or session type.</p>
            <button type="button" onClick={clearFilters} className="btn-primary btn-sm rounded-full">
              Clear filters
            </button>
          </div>
        )}

        {!isLoading &&
          !isError &&
          tutors.map((tutor) => <TutorCard key={tutor.id} tutor={tutor} searchFrom={from} />)}
      </div>

      {!isLoading && !isError && totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="btn-secondary btn-sm disabled:opacity-50"
          >
            Prev
          </button>
          <p className="text-sm text-gray-600">
            Page {currentPage} / {totalPages}
          </p>
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="btn-secondary btn-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function SearchFallback() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-2/3 mb-1.5" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function TutorCard({ tutor, searchFrom }) {
  const name = `${tutor?.user?.firstName || ''} ${tutor?.user?.lastName || ''}`.trim() || 'Tutor';
  const avatar =
    tutor?.user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`;
  const rating = Number.parseFloat(tutor?.rating || 0);
  const safeRating = Number.isNaN(rating) ? '0.0' : rating.toFixed(1);
  const subjects = (tutor?.subjects || [])
    .map((item) => (typeof item === 'string' ? item : item?.subject?.name || item?.name || ''))
    .filter(Boolean)
    .slice(0, 3);
  const hourlyRate = tutor?.hourlyRate || 0;

  const params = new URLSearchParams();
  params.set('from', 'search');
  if (searchFrom) params.set('searchFrom', searchFrom);

  return (
    <Link
      href={`/tutors/${tutor.id}?${params.toString()}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300"
    >
      <div className="flex gap-3">
        <img src={avatar} alt={name} className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">{name}</h2>
              <p className="text-xs text-gray-500 truncate">{tutor?.headline || 'Tutor'}</p>
            </div>
            <p className="text-sm font-semibold text-primary-600">${hourlyRate}/hr</p>
          </div>

          <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <StarIcon className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-gray-800">{safeRating}</span>
            </span>
            <span>{tutor?.totalSessions || 0} sessions</span>
            {tutor?.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPinIcon className="w-3.5 h-3.5" />
                {String(tutor.location).split(',')[0]}
              </span>
            )}
          </div>

          {subjects.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {subjects.map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600"
                >
                  {subject}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
