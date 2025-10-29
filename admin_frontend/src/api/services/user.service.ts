import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { AdminUser, PaginatedResponse, RoleUpdateRequest } from '../../types/user.types';

export const userService = {
  getUsers: async (page = 0, size = 20): Promise<PaginatedResponse<AdminUser>> => {
    const { data } = await apiClient.get<PaginatedResponse<AdminUser>>(
      `${API_ENDPOINTS.ADMIN.USERS}?page=${page}&size=${size}`
    );
    return data;
  },

  updateUserRoles: async (
    userId: number,
    request: RoleUpdateRequest
  ): Promise<AdminUser> => {
    const { data } = await apiClient.patch<AdminUser>(
      API_ENDPOINTS.ADMIN.USER_ROLES(userId),
      request
    );
    return data;
  },
};