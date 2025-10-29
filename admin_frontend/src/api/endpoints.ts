export const API_ENDPOINTS = {
  AUTH: {
    ME: '/api/v1/me',
    SESSION: '/api/v1/me/session',
    LOGOUT: '/logout',
    LOGIN: '/oauth2/authorization/cognito',
  },
  ADMIN: {
    USERS: '/api/v1/admin/users',
    USER_BY_ID: (id: number) => `/api/v1/admin/users/${id}`,
    USER_ROLES: (id: number) => `/api/v1/admin/users/${id}/roles`,
    AUDIT_LOG: '/api/v1/admin/audit-log',
  },
} as const;