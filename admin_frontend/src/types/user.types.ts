export interface UserProfile {
  id?: number;
  email: string;
  username?: string;
  displayName?: string;
  phoneNumber?: string;
  locale?: string;
  roles: string[];
  isActive?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  mfaEnabled?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface AdminUser {
  id: number;
  email: string;
  username?: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SessionInfo {
  email: string;
  displayName?: string;
  username?: string;
  roles: string[];
  isAuthenticated: boolean;
}

export interface RoleUpdateRequest {
  addRoles: string[];
  removeRoles: string[];
}

export interface PaginatedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  number: number;
  size: number;
  empty: boolean;
}
