export function sanitizeTextInput(value, { maxLength = 200, multiline = false } = {}) {
  if (typeof value !== 'string') {
    return '';
  }

  let normalized = value
    .normalize('NFKC')
    .replace(/\0/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/javascript:/gi, '')
    .trim();

  normalized = multiline
    ? normalized
        .replace(/\r\n?/g, '\n')
        .replace(/[^\S\n]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
    : normalized.replace(/\s+/g, ' ');

  return normalized.slice(0, maxLength);
}

export function sanitizeOptionalTextInput(value, options = {}) {
  if (value == null || value === '') {
    return '';
  }

  return sanitizeTextInput(value, options);
}

export function sanitizeNameInput(value, { maxLength = 50 } = {}) {
  return sanitizeTextInput(value, { maxLength })
    .replace(/[^A-Za-z\s'-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function sanitizeEmailInput(value) {
  return sanitizeTextInput(value, { maxLength: 120 }).toLowerCase();
}

export function sanitizeColorInput(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const candidate = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(candidate) ? candidate.toUpperCase() : fallback;
}
