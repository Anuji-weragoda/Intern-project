package com.staffmanagement.authservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.staffmanagement.authservice.dto.request.UpdateProfileRequest;
import com.staffmanagement.authservice.dto.response.UserProfileDTO;
import com.staffmanagement.authservice.service.AuditService;
import com.staffmanagement.authservice.service.UserService;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Story;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import io.qameta.allure.junit5.AllureJunit5;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Map;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Epic("Auth Service")
@Feature("User Controller")
@ExtendWith(AllureJunit5.class)
@WebMvcTest(controllers = UserController.class)
@AutoConfigureMockMvc
class UserControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private UserService userService;
    @MockBean private AuditService auditService;

    private UserProfileDTO sampleProfile() {
        return UserProfileDTO.builder()
                .id(1L)
                .email("user@example.com")
                .username("john")
                .displayName("John")
                .mfaEnabled(false)
                .isActive(true)
                .createdAt(LocalDateTime.now().minusDays(1))
                .lastLoginAt(LocalDateTime.now())
                .build();
    }

    @Test
    @Story("JWT me endpoint")
    @DisplayName("GET /api/v1/me returns profile and triggers user sync + audit")
    void getMe_ok() throws Exception {
        given(userService.getCurrentUser("sub-123")).willReturn(sampleProfile());

        mockMvc.perform(get("/api/v1/me")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> {
                            jwt.claim("sub", "sub-123");
                            jwt.claim("email", "user@example.com");
                            jwt.claim("email_verified", true);
                        }))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("user@example.com")));

        verify(userService).createOrUpdateUserFromJwt(any());
    verify(auditService).logLoginAsync(eq("sub-123"), eq("user@example.com"), eq("PROFILE_FETCH"), org.mockito.ArgumentMatchers.nullable(String.class), org.mockito.ArgumentMatchers.nullable(String.class), eq(true), isNull(), any());
    }

    @Test
    @Story("Session endpoint")
    @DisplayName("GET /api/v1/me/session returns profile when authenticated")
    void getMeSession_ok() throws Exception {
        given(userService.getCurrentUser("sub-abc")).willReturn(sampleProfile());

    // Create a Jwt and a JwtAuthenticationToken and set it explicitly on the request
    org.springframework.security.oauth2.jwt.Jwt jwtToken = org.springframework.security.oauth2.jwt.Jwt.withTokenValue("t")
        .header("alg", "none")
        .claim("sub", "sub-abc")
        .issuedAt(java.time.Instant.now())
        .expiresAt(java.time.Instant.now().plusSeconds(3600))
        .build();
    // give the token an authority so filters won't forbid the request
    org.springframework.security.core.authority.SimpleGrantedAuthority authority = new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER");
    org.springframework.security.core.Authentication auth = new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken(jwtToken, java.util.List.of(authority));

    mockMvc.perform(get("/api/v1/me/session")
            .with(SecurityMockMvcRequestPostProcessors.authentication(auth))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username", is("john")));
    }

    @Test
    @Story("Update profile")
    @DisplayName("PATCH /api/v1/me updates profile")
    void updateProfile_ok() throws Exception {
        UserProfileDTO updated = sampleProfile();
        updated.setDisplayName("Johnny");
        given(userService.updateProfile(eq("sub-123"), any(UpdateProfileRequest.class))).willReturn(updated);

        Map<String, Object> body = Map.of(
                "displayName", "Johnny",
                "username", "john",
                "phoneNumber", "+123",
                "locale", "en"
        );

        mockMvc.perform(patch("/api/v1/me")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> {
                            jwt.claim("sub", "sub-123");
                            jwt.claim("email", "user@example.com");
                        }))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName", is("Johnny")));

    verify(auditService).logLoginAsync(eq("sub-123"), eq("user@example.com"), eq("PROFILE_UPDATE"), org.mockito.ArgumentMatchers.nullable(String.class), org.mockito.ArgumentMatchers.nullable(String.class), eq(true), isNull(), any());
    }

    @Test
    @Story("Toggle MFA")
    @DisplayName("POST /api/v1/me/mfa/toggle toggles mfa")
    void toggleMfa_ok() throws Exception {
        UserProfileDTO updated = sampleProfile();
        updated.setMfaEnabled(true);
        given(userService.toggleMfa("sub-1", true)).willReturn(updated);

        Map<String, Object> body = Map.of("enabled", true);

        mockMvc.perform(post("/api/v1/me/mfa/toggle")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> {
                            jwt.claim("sub", "sub-1");
                            jwt.claim("email", "user@example.com");
                        }))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mfaEnabled", is(true)));

        verify(userService).toggleMfa("sub-1", true);
    }

    @Test
    @Story("Find by cognito sub")
    @DisplayName("GET /api/v1/me/by-sub/{sub} returns profile")
    void getBySub_ok() throws Exception {
        given(userService.getCurrentUser("abc")).willReturn(sampleProfile());

    mockMvc.perform(get("/api/v1/me/by-sub/abc")
        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.claim("sub", "abc").claim("email", "user@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("user@example.com")));
    }
}
