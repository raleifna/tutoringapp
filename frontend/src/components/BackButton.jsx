'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const variantClasses = {
  default:
    'inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  inverse:
    'inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white shadow-sm backdrop-blur-sm transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-primary-600',
  icon:
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
};

export default function BackButton({
  href,
  onClick,
  label = 'Back',
  variant = 'default',
  className = '',
  iconOnly = false,
  ...props
}) {
  const classes = cn(variantClasses[variant] || variantClasses.default, className);
  const content = (
    <>
      <ArrowLeftIcon className="h-4 w-4" />
      {!iconOnly && <span>{label}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} aria-label={label} {...props}>
      {content}
    </button>
  );
}
