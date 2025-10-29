import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { AuditLog } from '../../types/audit.types';

export const auditService = {
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const { data } = await apiClient.get<AuditLog[]>(API_ENDPOINTS.ADMIN.AUDIT_LOG);
    return data;
  },
};