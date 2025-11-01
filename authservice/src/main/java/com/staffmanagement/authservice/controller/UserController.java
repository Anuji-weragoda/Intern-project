package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.dto.request.UpdateProfileRequest;
import com.staffmanagement.authservice.dto.response.UserProfileDTO;
import com.staffmanagement.authservice.service.AuditService;
import com.staffmanagement.authservice.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;


import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuditService auditService;

    // ==========================
    // JWT-based endpoint (for Flutter/mobile apps)
    // ==========================
    @GetMapping
    public ResponseEntity<UserProfileDTO> getCurrentUser(
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest request) {

        String cognitoSub = jwt.getClaimAsString("sub");
        String email = jwt.getClaimAsString("email");

        log.info("JWT Login detected for user: {} ({})", email, cognitoSub);

        // THIS IS THE KEY FIX: Create or update user in DB
        userService.createOrUpdateUserFromJwt(jwt);

    // Capture event time to keep audit ordering accurate even when logged asynchronously
    java.time.LocalDateTime eventTime = java.time.LocalDateTime.now();
    auditService.logLoginAsync(
        cognitoSub,
        email,
        "PROFILE_FETCH",
        request.getRemoteAddr(),
        request.getHeader("User-Agent"),
        true,
        null,
        eventTime
    );

        // Get the user profile (will now exist in DB)
        UserProfileDTO profile = userService.getCurrentUser(cognitoSub);
        log.info("User profile retrieved for {}", email);

        return ResponseEntity.ok(profile);
    }

    // ==========================
    // Session-based endpoint (works for React navbar)
    // Returns full UserProfile when a session is active so SPA can show displayName/email
    // ==========================
    @GetMapping("/session")
    public ResponseEntity<?> getCurrentUserSession(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "No active session"));
        }

        try {
            String cognitoSub = null;
            Object principal = authentication.getPrincipal();

            // Common principal types: OidcUser (when session), Jwt (when resource server), OAuth2User
            if (principal instanceof OidcUser oidcUser) {
                cognitoSub = oidcUser.getSubject();
            } else if (principal instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
                cognitoSub = jwt.getClaimAsString("sub");
            } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                // fallback: try authentication name
                cognitoSub = authentication.getName();
            } else {
                // last resort: authentication name (may be username or sub)
                cognitoSub = authentication.getName();
            }

            if (cognitoSub == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unable to resolve user identity"));
            }

            UserProfileDTO profile = userService.getCurrentUser(cognitoSub);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            log.error("Failed to resolve session user: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch user profile"));
        }
    }

    // ==========================
    // Update profile
    // ==========================
    @PatchMapping
    public ResponseEntity<UserProfileDTO> updateUserProfile(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody UpdateProfileRequest request,
            HttpServletRequest httpRequest) {

        String cognitoSub = jwt.getClaimAsString("sub");
        String email = jwt.getClaimAsString("email");

        UserProfileDTO updatedProfile = userService.updateProfile(cognitoSub, request);

    java.time.LocalDateTime eventTime = java.time.LocalDateTime.now();
    auditService.logLoginAsync(
        cognitoSub,
        email,
        "PROFILE_UPDATE",
        httpRequest.getRemoteAddr(),
        httpRequest.getHeader("User-Agent"),
        true,
        null,
        eventTime
    );

        log.info("User profile updated for {}", email);

        return ResponseEntity.ok(updatedProfile);
    }

    // ==========================
    // Get tokens (JWT or OAuth2)
    // ==========================
    @GetMapping("/token")
    public Map<String, Object> getToken(OAuth2AuthenticationToken authentication,
                                        @RegisteredOAuth2AuthorizedClient("cognito") OAuth2AuthorizedClient client) {
        Map<String, Object> tokens = new HashMap<>();
        OidcUser oidcUser = (OidcUser) authentication.getPrincipal();
        tokens.put("id_token", oidcUser.getIdToken().getTokenValue());
        tokens.put("access_token", client.getAccessToken().getTokenValue());
        return tokens;
    }

    // ==========================
    // Lookup user by cognito sub (useful for SPA when principal exposes sub only)
    // ==========================
    @GetMapping("/by-sub/{cognitoSub}")
    public ResponseEntity<UserProfileDTO> getUserBySub(@PathVariable("cognitoSub") String cognitoSub) {
        UserProfileDTO profile = userService.getCurrentUser(cognitoSub);
        return ResponseEntity.ok(profile);
    }
}
