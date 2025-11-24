package com.staffmanagement.authservice.dto;

public record SignupResponse(String userSub, boolean userConfirmed, String message) {
}
