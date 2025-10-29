export interface AuditLog {
  id: number;
  cognitoSub: string;
  userId: number;
  email: string;
  eventType: string;
  ipAddress: string;
  success: boolean;
  failureReason?: string;
  userAgent: string;
  createdAt: string;
}

export type AuditEventType = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'PROFILE_UPDATE'
  | 'ROLE_CHANGE'
  | 'PASSWORD_CHANGE'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED';