'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SEARCH_LOCATION_OPTIONS } from '../lib/search-filters';

function buildPathMatchers(path, serializeValue) {
  const labels = path.map((item) => item.label);
  const leaf = labels[labels.length - 1] || '';
  const slashPath = labels.join(' / ');
  const commaPath = [...labels].reverse().join(', ');
  const serialized = serializeValue(path);

  return new Set([leaf, slashPath, commaPath, serialized].filter(Boolean));
}

function findPathByValue(options, value, serializeValue, lineage = []) {
  if (!value) return [];

  for (const option of options) {
    const nextLineage = [...lineage, option];

    if (Array.isArray(option.children) && option.children.length > 0) {
      const childPath = findPathByValue(option.children, value, serializeValue, nextLineage);
      if (childPath.length > 0) {
        return childPath;
      }
    } else if (buildPathMatchers(nextLineage, serializeValue).has(value)) {
      return nextLineage;
    }
  }

  return [];
}

export default function LocationCascader({
  value,
  onChange,
  options = SEARCH_LOCATION_OPTIONS,
  placeholder = 'e.g. Sydney',
  serializeValue = (path) => path[path.length - 1]?.label || '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState([]);
  const [activePath, setActivePath] = useState([]);
  const wrapperRef = useRef(null);

  const resolvedPath = useMemo(
    () => findPathByValue(options, value, serializeValue),
    [options, serializeValue, value]
  );

  useEffect(() => {
    setSelectedPath(resolvedPath);
    setActivePath(resolvedPath);
  }, [resolvedPath]);

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
      onChange(serializeValue(newActivePath), newActivePath);
    }
  };

  const columns = useMemo(() => {
    const nextColumns = [options];
    let currentOptions = options;

    activePath.forEach((selectedItem) => {
      const option = currentOptions.find((candidate) => candidate.value === selectedItem.value);
      if (option?.children?.length) {
        nextColumns.push(option.children);
        currentOptions = option.children;
      }
    });

    return nextColumns;
  }, [activePath, options]);

  const displayValue = selectedPath.length > 0 ? selectedPath.map((item) => item.label).join(' / ') : '';

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className="w-full p-3 border border-gray-300 rounded-xl bg-white cursor-pointer flex justify-between items-center hover:border-blue-400 transition-colors"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && selectedPath.length > 0) {
            setActivePath(selectedPath);
          }
        }}
      >
        <span className={displayValue ? 'text-gray-900' : 'text-gray-400'}>{displayValue || placeholder}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 flex max-h-[70vh] overflow-auto rounded-md border border-gray-200 bg-white shadow-lg sm:right-auto sm:max-h-none sm:overflow-hidden">
          {columns.map((columnOptions, level) => (
            <ul
              key={level}
              className="min-w-0 flex-1 border-r border-gray-100 py-1 last:border-r-0 sm:min-w-[150px] sm:flex-none sm:max-h-64 sm:overflow-y-auto"
            >
              {columnOptions.map((option) => {
                const isActive = activePath[level]?.value === option.value;

                return (
                  <li
                    key={option.value}
                    onClick={() => handleOptionClick(option, level)}
                    className={`px-4 py-2 cursor-pointer text-sm flex justify-between items-center transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-100'
                    }`}
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
}