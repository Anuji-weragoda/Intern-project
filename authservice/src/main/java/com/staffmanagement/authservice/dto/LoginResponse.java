package com.staffmanagement.authservice.dto;

import java.util.Map;

public record LoginResponse(
    String accessToken,
    String refreshToken,
    String idToken,
    String tokenType,
    Integer expiresIn,
    Map<String, String> userAttributes
) {
}
