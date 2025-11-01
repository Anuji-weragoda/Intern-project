package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.dto.request.UpdateProfileRequest;
import com.staffmanagement.authservice.dto.response.UserProfileDTO;
import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.Role;
import com.staffmanagement.authservice.entity.UserRole;
import com.staffmanagement.authservice.repository.AppUserRepository;
import com.staffmanagement.authservice.repository.RoleRepository;
import com.staffmanagement.authservice.repository.UserRoleRepository;
import io.qameta.allure.Allure;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Story;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import io.qameta.allure.junit5.AllureJunit5;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@Epic("Auth Service")
@Feature("User Service")
@ExtendWith({MockitoExtension.class, AllureJunit5.class})
class UserServiceTest {

    @Mock private AppUserRepository appUserRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private CognitoAdminService cognitoAdminService;

    @InjectMocks private UserService userService;

    private AppUser existingUser;

    @BeforeEach
    void setUp() {
        existingUser = AppUser.builder()
                .id(1L)
                .cognitoSub("sub-123")
                .email("user@example.com")
                .userRoles(Set.of())
                .build();
    }

    @Test
    @Story("Fetch current user profile")
    @DisplayName("getCurrentUser returns DTO when user exists")
    void getCurrentUser_ok() {
        given(appUserRepository.findByCognitoSub("sub-123")).willReturn(Optional.of(existingUser));

        UserProfileDTO dto = userService.getCurrentUser("sub-123");

        assertThat(dto.getEmail()).isEqualTo("user@example.com");
        Allure.step("Verified profile DTO has expected email");
    }

    @Test
    @Story("Fetch current user profile")
    @DisplayName("getCurrentUser throws when user not found")
    void getCurrentUser_notFound() {
        given(appUserRepository.findByCognitoSub("missing")).willReturn(Optional.empty());
        assertThatThrownBy(() -> userService.getCurrentUser("missing"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    @Story("Create or update user from JWT")
    @DisplayName("createOrUpdateUserFromJwt creates user and assigns default USER role")
    void createOrUpdateUserFromJwt_createsAndAssignsRole() {
        // No existing user
        given(appUserRepository.findByCognitoSub("sub-123")).willReturn(Optional.empty());
        // Save returns user with id
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(inv -> {
            AppUser u = inv.getArgument(0);
            if (u.getId() == null) u.setId(42L);
            return u;
        });
        // Default role present and not assigned yet
        Role userRole = Role.builder().id(5L).roleName("USER").build();
        given(roleRepository.findByRoleName("USER")).willReturn(Optional.of(userRole));
        given(userRoleRepository.findByUserAndRole(any(AppUser.class), eq(userRole))).willReturn(Optional.empty());

        Jwt jwt = Jwt.withTokenValue("tkn")
                .header("alg", "none")
                .claim("sub", "sub-123")
                .claim("email", "user@example.com")
                .claim("email_verified", true)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        userService.createOrUpdateUserFromJwt(jwt);

        // Verify user persisted twice (create + update fields)
        verify(appUserRepository, atLeast(1)).save(any(AppUser.class));
        // Verify a user-role was saved
        verify(userRoleRepository).save(any(UserRole.class));
    }

    @Test
    @Story("Update profile")
    @DisplayName("updateProfile updates fields and returns DTO")
    void updateProfile_updatesFields() {
        given(appUserRepository.findByCognitoSub("sub-123")).willReturn(Optional.of(existingUser));
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("John Doe");
        req.setUsername("john");
        req.setPhoneNumber("+123");
        req.setLocale("en");

        UserProfileDTO dto = userService.updateProfile("sub-123", req);

        assertThat(dto.getDisplayName()).isEqualTo("John Doe");
        assertThat(dto.getUsername()).isEqualTo("john");
        assertThat(dto.getPhoneNumber()).isEqualTo("+123");
        Allure.step("Profile fields updated and returned in DTO");
    }

    @Test
    @Story("Toggle MFA")
    @DisplayName("toggleMfa updates preference in Cognito and DB")
    void toggleMfa_ok() {
        existingUser.setMfaEnabled(false);
        given(appUserRepository.findByCognitoSub("sub-123")).willReturn(Optional.of(existingUser));
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));

        UserProfileDTO dto = userService.toggleMfa("sub-123", true);

        verify(cognitoAdminService).setUserMfaPreference(eq("user@example.com"), eq(true));
        assertThat(dto.isMfaEnabled()).isTrue();
    }
}
