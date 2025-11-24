package com.staffmanagement.authservice.dto;

public record SignupRequest(
        String email,
        String password,
        // frontend sends `fullName` — we will split into given/family in controller
        String fullName
) {
}
