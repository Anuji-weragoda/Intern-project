package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.dto.request.UpdateProfileRequest;
import com.staffmanagement.authservice.dto.response.UserProfileDTO;
import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.Role;
import com.staffmanagement.authservice.repository.AppUserRepository;
import com.staffmanagement.authservice.repository.RoleRepository;
import com.staffmanagement.authservice.repository.UserRoleRepository;
import com.staffmanagement.authservice.entity.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    /**
     * Get current user profile
     */
    public UserProfileDTO getCurrentUser(String cognitoSub) {
        AppUser user = appUserRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return convertToDTO(user);
    }

    /**
     * Create or update user from JWT token
     */
    public void createOrUpdateUserFromJwt(Jwt jwt) {
        String cognitoSub = jwt.getClaimAsString("sub");
        String email = jwt.getClaimAsString("email");
        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");

        AppUser user = appUserRepository.findByCognitoSub(cognitoSub)
                .orElseGet(() -> {
                    log.info("Creating new user for cognitoSub: {}", cognitoSub);
                    AppUser created = AppUser.builder()
                            .cognitoSub(cognitoSub)
                            .email(email)
                            .emailVerified(emailVerified != null && emailVerified)
                            .isActive(true)
                            .build();

                    AppUser saved = appUserRepository.save(created);

                    // Assign default USER role if present
                    try {
                        roleRepository.findByRoleName("USER").ifPresent(role -> {
                            if (userRoleRepository.findByUserAndRole(saved, role).isEmpty()) {
                                UserRole ur = new UserRole();
                                ur.setUser(saved);
                                ur.setRole(role);
                                ur.setAssignedBy(email);
                                userRoleRepository.save(ur);
                            }
                        });
                    } catch (Exception ex) {
                        log.warn("Failed to assign default role to new user {}: {}", email, ex.getMessage());
                    }

                    return saved;
                });

        // Update email and verification status on each login
        user.setEmail(email);
        user.setEmailVerified(emailVerified != null && emailVerified);
        user.setLastLoginAt(LocalDateTime.now());

        appUserRepository.save(user);
        log.debug("User synced: {}", email);
    }

    /**
     * Update user profile
     */
    public UserProfileDTO updateProfile(String cognitoSub, UpdateProfileRequest request) {
        AppUser user = appUserRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update fields
        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getUsername() != null) {
            user.setUsername(request.getUsername());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getLocale() != null) {
            user.setLocale(request.getLocale());
        }

        AppUser savedUser = appUserRepository.save(user);
        log.info("Profile updated for user: {}", user.getEmail());

        return convertToDTO(savedUser);
    }

    /**
     * Convert AppUser entity to DTO
     */
    private UserProfileDTO convertToDTO(AppUser user) {
    List<String> roles = user.getUserRoles().stream()
            .map(userRole -> userRole.getRole().getRoleName()) // use correct getter
            .collect(Collectors.toList());

    return UserProfileDTO.builder()
            .id(user.getId())
            .email(user.getEmail())
            .username(user.getUsername())
            .displayName(user.getDisplayName())
            .phoneNumber(user.getPhoneNumber())
            .locale(user.getLocale())
            .emailVerified(user.isEmailVerified())
            .phoneVerified(user.isPhoneVerified())
            .mfaEnabled(user.isMfaEnabled())
            .isActive(user.isActive())
            .roles(roles)
            .createdAt(user.getCreatedAt())
            .lastLoginAt(user.getLastLoginAt())
            .build();
}

}