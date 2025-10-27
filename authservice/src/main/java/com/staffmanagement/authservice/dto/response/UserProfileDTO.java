package com.staffmanagement.authservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDTO {
    private Long id;
    private String email;
    private String username;
    private String displayName;
    private String phoneNumber;
    private String locale;
    private boolean emailVerified;
    private boolean phoneVerified;
    private boolean mfaEnabled;
    private boolean isActive;
    private List<String> roles;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
}