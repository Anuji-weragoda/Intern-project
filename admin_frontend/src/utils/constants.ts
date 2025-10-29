export const APP_NAME = 'Staff Management System';
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
] as const;