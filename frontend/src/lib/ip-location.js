const CLIENT_IP_LOOKUP_URL = 'https://api.country.is/?fields=city,subdivision';

export const normalizeIpAddress = (value) => {
  const candidate = String(value || '').split(',')[0].trim();
  if (!candidate || candidate.toLowerCase() === 'unknown') return null;
  if (candidate === '::1') return '127.0.0.1';
  return candidate.replace(/^::ffff:/i, '');
};

const isPrivateIpv4Address = (value) => {
  const parts = String(value || '')
    .split('.')
    .map((segment) => Number(segment));

  if (parts.length !== 4 || parts.some((segment) => Number.isNaN(segment))) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

export const isPrivateIpAddress = (value) => {
  const ipAddress = normalizeIpAddress(value);
  if (!ipAddress) return false;
  if (ipAddress === 'localhost') return true;

  if (ipAddress.includes(':')) {
    const normalized = ipAddress.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
  }

  return isPrivateIpv4Address(ipAddress);
};

const formatCountryLabel = (value) => {
  const countryCode = String(value || '').trim().toUpperCase();
  if (!countryCode) return null;

  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
};

export const buildIpLocationLabel = (payload = {}) => {
  const parts = [
    String(payload.city || '').trim(),
    String(payload.subdivision || payload.region || '').trim(),
    formatCountryLabel(payload.country_name || payload.countryName || payload.country),
  ].filter(Boolean);

  return parts.length > 0 ? [...new Set(parts)].join(', ') : null;
};

export const getFallbackIpLocationLabel = (ipAddress) =>
  isPrivateIpAddress(ipAddress) ? 'Local network' : null;

export const applyIpContextFallback = (user) => {
  if (!user) return user;

  const normalizedIpAddress = normalizeIpAddress(user.ipAddress);
  const ipLocationLabel =
    String(user.ipLocationLabel || '').trim() || getFallbackIpLocationLabel(normalizedIpAddress);

  return {
    ...user,
    ipAddress: normalizedIpAddress,
    ipLocationLabel,
    ipCity: user.ipCity || null,
    ipRegion: user.ipRegion || null,
    ipCountry: user.ipCountry || null,
    ipLocationSource: user.ipLocationSource || (ipLocationLabel ? 'derived' : null),
  };
};

export const preserveClientIpContext = (user, previousUser) => {
  const nextUser = applyIpContextFallback(user);
  if (!nextUser || previousUser?.ipLocationSource !== 'client') {
    return nextUser;
  }

  return applyIpContextFallback({
    ...nextUser,
    ipAddress: previousUser.ipAddress || nextUser.ipAddress || null,
    ipLocationLabel: previousUser.ipLocationLabel || nextUser.ipLocationLabel || null,
    ipCity: previousUser.ipCity || nextUser.ipCity || null,
    ipRegion: previousUser.ipRegion || nextUser.ipRegion || null,
    ipCountry: previousUser.ipCountry || nextUser.ipCountry || null,
    ipLocationSource: previousUser.ipLocationSource,
  });
};

export const fetchClientIpContext = async () => {
  if (typeof window === 'undefined') return null;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(CLIENT_IP_LOOKUP_URL, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`IP lookup failed with status ${response.status}`);
    }

    const payload = await response.json();
    const ipAddress = normalizeIpAddress(payload.ip);

    return {
      ipAddress,
      ipLocationLabel: buildIpLocationLabel(payload) || getFallbackIpLocationLabel(ipAddress),
      ipCity: payload.city || null,
      ipRegion: payload.subdivision || payload.region || null,
      ipCountry: formatCountryLabel(payload.country_name || payload.country || null),
      ipLocationSource: 'client',
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
};
