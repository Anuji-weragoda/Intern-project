import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { UserProfile, SessionInfo } from '../../types/user.types';

export const authService = {
  getCurrentUser: async (): Promise<UserProfile> => {
    const { data } = await apiClient.get<UserProfile>(API_ENDPOINTS.AUTH.ME);
    return data;
  },

  getSession: async (): Promise<SessionInfo> => {
    const { data } = await apiClient.get<SessionInfo>(API_ENDPOINTS.AUTH.SESSION);
    return data;
  },

  updateProfile: async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    const { data } = await apiClient.patch<UserProfile>(
      API_ENDPOINTS.AUTH.ME,
      updates
    );
    return data;
  },

  logout: (): void => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${apiClient.defaults.baseURL}${API_ENDPOINTS.AUTH.LOGOUT}`;
    document.body.appendChild(form);
    form.submit();
  },
};