package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.Role;
import com.staffmanagement.authservice.entity.UserRole;
import com.staffmanagement.authservice.repository.AppUserRepository;
import com.staffmanagement.authservice.repository.RoleRepository;
import com.staffmanagement.authservice.repository.UserRoleRepository;
import io.qameta.allure.junit5.AllureJunit5;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith({MockitoExtension.class, AllureJunit5.class})
class CognitoUserServiceTest {

    @Mock private AppUserRepository appUserRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserRoleRepository userRoleRepository;

    @InjectMocks private CognitoUserService cognitoUserService;

    @Test
    @DisplayName("processOAuthPostLogin creates user if not exists and assigns default USER role")
    void postLogin_createsAndAssigns() {
        given(appUserRepository.findByCognitoSub("sub-1")).willReturn(Optional.empty());
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(inv -> {
            AppUser u = inv.getArgument(0);
            if (u.getId() == null) u.setId(5L);
            return u;
        });
        Role userRole = Role.builder().id(2L).roleName("USER").build();
        given(roleRepository.findByRoleName("USER")).willReturn(Optional.of(userRole));
        given(userRoleRepository.findByUserAndRole(any(AppUser.class), eq(userRole))).willReturn(Optional.empty());

        OAuth2User oAuth2User = new OAuth2User() {
            @Override public Map<String, Object> getAttributes() {
                return Map.of(
                        "sub", "sub-1",
                        "email", "user@example.com",
                        "username", "john",
                        "name", "John",
                        "email_verified", true
                );
            }
            @Override public java.util.Collection<? extends org.springframework.security.core.GrantedAuthority> getAuthorities() { return java.util.List.of(); }
            @Override public String getName() { return "john"; }
        };

        AppUser u = cognitoUserService.processOAuthPostLogin(oAuth2User);

        assertThat(u.getId()).isEqualTo(5L);
        verify(userRoleRepository).save(any(UserRole.class));
    }

    @Test
    @DisplayName("processOAuthPostLogin returns existing user without saving")
    void postLogin_existing() {
        AppUser existing = AppUser.builder().id(7L).cognitoSub("sub-2").email("x@y.com").build();
        given(appUserRepository.findByCognitoSub("sub-2")).willReturn(Optional.of(existing));

        OAuth2User oAuth2User = new OAuth2User() {
            @Override public Map<String, Object> getAttributes() { return Map.of("sub", "sub-2"); }
            @Override public java.util.Collection<? extends org.springframework.security.core.GrantedAuthority> getAuthorities() { return java.util.List.of(); }
            @Override public String getName() { return "name"; }
        };

        AppUser u = cognitoUserService.processOAuthPostLogin(oAuth2User);

        assertThat(u.getId()).isEqualTo(7L);
        verify(appUserRepository, never()).save(any());
    }
}
