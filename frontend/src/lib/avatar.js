function shouldIgnoreAvatarUrl(value, ignoreTemporary) {
  if (!value) return true;
  if (!ignoreTemporary) return false;

  return value.startsWith('blob:') || value.includes('mock.local/avatar/');
}

export function getAvatarUrl(avatar, firstName, lastName, options = {}) {
  const { fallbackName = 'User', ignoreTemporary = false } = options;
  const avatarValue = String(avatar || '');

  if (!shouldIgnoreAvatarUrl(avatarValue, ignoreTemporary)) {
    return avatarValue;
  }

  const name = `${firstName || ''} ${lastName || ''}`.trim() || fallbackName;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`;
}
