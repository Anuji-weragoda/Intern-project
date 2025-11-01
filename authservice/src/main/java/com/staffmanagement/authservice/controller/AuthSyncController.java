package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.dto.response.UserProfileDTO;
import com.staffmanagement.authservice.service.AuditService;
import com.staffmanagement.authservice.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthSyncController {

    private final UserService userService;
    private final AuditService auditService;

    /**
     * Sync endpoint - call this after login with ID token
     */
    @PostMapping("/sync")
    public ResponseEntity<UserProfileDTO> syncUserAfterLogin(
            @AuthenticationPrincipal Jwt jwt, // JWT decoded from ID token
            HttpServletRequest request) {

        String cognitoSub = jwt.getClaimAsString("sub");

        // Fallback logic to get email
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isEmpty()) {
            email = jwt.getClaimAsString("cognito:username");
        }
        if (email == null || email.isEmpty()) {
            email = jwt.getClaimAsString("username");
        }

        log.info("=== Auth Sync Request ===");
        log.info("Cognito Sub: {}", cognitoSub);
        log.info("Email: {}", email);
        log.info("IP: {}", request.getRemoteAddr());
        log.info("User-Agent: {}", request.getHeader("User-Agent"));
        log.info("All JWT Claims: {}", jwt.getClaims());

        if (cognitoSub == null || cognitoSub.isEmpty()) {
            log.error("✗ Missing required field: sub");
            throw new IllegalArgumentException("Missing required JWT claim: sub");
        }

        if (email == null || email.isEmpty()) {
            log.error("✗ Missing required field: email. Available claims: {}", jwt.getClaims().keySet());
            throw new IllegalArgumentException("Missing required JWT claim: email. Check your Cognito User Pool settings.");
        }

        try {
            // Create or update user in database
            userService.createOrUpdateUserFromJwt(jwt);
            log.info("✓ User synced to database");

            auditService.logLoginAsync(
                    cognitoSub,
                    email,
                    "MOBILE_LOGIN",
                    request.getRemoteAddr(),
                    request.getHeader("User-Agent"),
                    true,
                    null,
                    java.time.LocalDateTime.now()
            );
            log.info("✓ Audit log created");

            UserProfileDTO profile = userService.getCurrentUser(cognitoSub);
            log.info("✓ Profile retrieved successfully");

            return ResponseEntity.ok(profile);

        } catch (Exception e) {
            log.error("✗ Error during auth sync: {}", e.getMessage(), e);

            if (email != null && !email.isEmpty()) {
                auditService.logLoginAsync(
                        cognitoSub,
                        email,
                        "MOBILE_LOGIN_FAILED",
                        request.getRemoteAddr(),
                        request.getHeader("User-Agent"),
                        false,
                        e.getMessage(),
                        java.time.LocalDateTime.now()
                );
            }

            throw new RuntimeException("Failed to sync user: " + e.getMessage());
        }
    }

    /**
     * Health check endpoint to verify JWT authentication is working
     */
    @GetMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyToken(@AuthenticationPrincipal Jwt jwt) {
        Map<String, Object> response = new HashMap<>();

        String email = jwt.getClaimAsString("email");
        if (email == null || email.isEmpty()) {
            email = jwt.getClaimAsString("cognito:username");
        }

        response.put("authenticated", true);
        response.put("sub", jwt.getClaimAsString("sub"));
        response.put("email", email);
        response.put("tokenType", "ID_TOKEN"); // Explicitly note we use ID token
        response.put("expiresAt", jwt.getExpiresAt());
        response.put("allClaims", jwt.getClaims());

        log.info("Token verified for user: {}", email);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(@AuthenticationPrincipal Jwt jwt,
                                     HttpServletRequest request) {
        String sub = jwt.getClaimAsString("sub");
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isEmpty()) {
            email = jwt.getClaimAsString("cognito:username");
        }

        // Log logout event to DB
        auditService.logLogout(sub, email, request.getRemoteAddr(), request.getHeader("User-Agent"));

        return ResponseEntity.ok("Logout recorded");
    }

    
}
