package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.dto.request.UpdateProfileRequest;
import com.staffmanagement.authservice.dto.response.UserProfileDTO;
import com.staffmanagement.authservice.service.AuditService;
import com.staffmanagement.authservice.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;


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
    // JWT-based endpoint
    // ==========================
    @GetMapping
    public ResponseEntity<UserProfileDTO> getCurrentUser(
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest request) {

        String cognitoSub = jwt.getClaimAsString("sub");
        String email = jwt.getClaimAsString("email");

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

        UserProfileDTO profile = userService.getCurrentUser(cognitoSub);
        log.info("User profile retrieved for {}", email);

        return ResponseEntity.ok(profile);
    }

    // ==========================
    // Session-based endpoint (works for React navbar)
    // ==========================
    @GetMapping("/session")
   public ResponseEntity<Map<String, Object>> getCurrentUserSession(Authentication authentication) {
        Map<String, Object> userInfo = new HashMap<>();

        if (authentication != null) {
            userInfo.put("name", authentication.getName());
            userInfo.put("roles", authentication.getAuthorities()
                    .stream()
                    .map(GrantedAuthority::getAuthority)
                    .toList());
        } else {
            userInfo.put("error", "No active session");
        }

        return ResponseEntity.ok(userInfo);
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
}
