package com.staffmanagement.authservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.staffmanagement.authservice.dto.response.UserProfileDTO;
import com.staffmanagement.authservice.service.AuditService;
import com.staffmanagement.authservice.service.UserService;
import io.qameta.allure.junit5.AllureJunit5;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(AllureJunit5.class)
@WebMvcTest(controllers = AuthSyncController.class)
@AutoConfigureMockMvc
class AuthSyncControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private UserService userService;
    @MockBean private AuditService auditService;

    private UserProfileDTO profile() {
        return UserProfileDTO.builder()
                .id(1L)
                .email("user@example.com")
                .username("john")
                .createdAt(LocalDateTime.now().minusDays(1))
                .lastLoginAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/auth/sync creates/updates user and returns profile")
    void sync_ok() throws Exception {
        given(userService.getCurrentUser("sub-1")).willReturn(profile());

    // Use the provided jwt() request post-processor which populates the SecurityContext correctly
    mockMvc.perform(post("/api/v1/auth/sync")
            .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> {
                jwt.claim("sub", "sub-1");
                jwt.claim("email", "user@example.com");
                jwt.claim("email_verified", true);
            }).authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")))
            .with(SecurityMockMvcRequestPostProcessors.csrf())
            .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("user@example.com")));

        verify(userService).createOrUpdateUserFromJwt(any());
    verify(auditService).logLoginAsync(eq("sub-1"), eq("user@example.com"), eq("MOBILE_LOGIN"), org.mockito.ArgumentMatchers.nullable(String.class), org.mockito.ArgumentMatchers.nullable(String.class), eq(true), isNull(), any());
    }
}
