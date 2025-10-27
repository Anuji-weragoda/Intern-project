package com.staffmanagement.authservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LoginAuditDTO {
    private Long id;
    
    // User info
    private Long userId;
    private String cognitoSub;
    private String userEmail;
    private String displayName;
    
    // Audit info
    private String email;  // Email from audit record (might differ from user email)
    private String eventType;
    private String ipAddress;
    private String userAgent;
    private boolean success;
    private String failureReason;
    private LocalDateTime createdAt;
}