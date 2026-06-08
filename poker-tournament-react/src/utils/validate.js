export function onlyDigits(value = '') {
  return value.replace(/\D/g, '');
}

export function formatPhone(value = '') {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return `(${digits}`;

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value = '') {
  return onlyDigits(value).length === 11;
}