package com.staffmanagement.authservice.dto.request;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String displayName;
    private String username;
    private String phoneNumber;
    private String locale;
    // Don't allow email updates through this endpoint for security
}