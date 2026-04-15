export const cn = (...classes) => classes.filter(Boolean).join(' ');

export const formatDate = (dateTime) => {
  if (!dateTime) return '-';
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatDuration = (minutes) => {
  const value = Number(minutes || 0);
  if (!value) return '0 mins';
  if (value % 60 === 0) return `${value / 60} hr`;
  return `${value} mins`;
};

export const formatCurrency = (amount, currency = 'AUD') => {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return '$0';
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency || 'AUD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value}`;
  }
};

export const getAvatarUrl = (avatar, firstName, lastName) => {
  const avatarValue = String(avatar || '');
  if (avatarValue && !avatarValue.startsWith('blob:') && !avatarValue.includes('mock.local/avatar/')) {
    return avatarValue;
  }
  const name = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`;
};
