'use client';

import { StarIcon } from '@heroicons/react/24/solid';
import { cn } from '../lib/utils';

export function StarRatingDisplay({ rating = 0, size = 'w-4 h-4' }) {
  const roundedRating = Number(rating || 0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = roundedRating >= index + 1;
        return (
          <StarIcon
            key={index}
            className={cn(size, filled ? 'text-amber-400' : 'text-gray-200')}
          />
        );
      })}
    </div>
  );
}

export function StarRatingInput({ value = 0, onChange, disabled = false }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = value >= starValue;

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => !disabled && onChange?.(starValue)}
            disabled={disabled}
            className="rounded-full p-1 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Rate ${starValue} star${starValue === 1 ? '' : 's'}`}
          >
            <StarIcon className={cn('h-7 w-7', filled ? 'text-amber-400' : 'text-gray-200')} />
          </button>
        );
      })}
    </div>
  );
}
