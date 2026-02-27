export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: unknown): string => {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

export const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email);
