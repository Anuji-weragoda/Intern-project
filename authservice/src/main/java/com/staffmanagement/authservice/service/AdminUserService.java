package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.dto.request.AssignRolesRequest;
import com.staffmanagement.authservice.dto.response.AdminUserDTO;
import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.Role;
import com.staffmanagement.authservice.entity.UserRole;
import com.staffmanagement.authservice.repository.AppUserRepository;
import com.staffmanagement.authservice.repository.RoleRepository;
import com.staffmanagement.authservice.repository.UserRoleRepository;
import com.staffmanagement.authservice.utils.SecurityUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
public class AdminUserService {

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    public AdminUserService(AppUserRepository appUserRepository,
                          RoleRepository roleRepository,
                          UserRoleRepository userRoleRepository) {
        this.appUserRepository = appUserRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
    }

    // -------------------------------
    // Search / paginate users
    // -------------------------------
    public Page<AdminUserDTO> searchUsers(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<AppUser> users;

        if (query == null || query.isBlank()) {
            users = appUserRepository.findAll(pageable);
        } else {
            users = appUserRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(query, query, pageable);
        }

        return users.map(this::toDTO);
    }

    // -------------------------------
    // Fetch single user
    // -------------------------------
    public AdminUserDTO getUser(Long userId) {
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
        return toDTO(user);
    }

    // -------------------------------
    // Assign or remove roles (ADMIN only)
    // -------------------------------
    public void assignRolesToUser(Long userId, AssignRolesRequest request, Jwt jwt) {
        if (request.getRoleNames() == null || request.getRoleNames().isEmpty()) {
            throw new IllegalArgumentException("At least one role is required");
        }

        AppUser targetUser = appUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
        
        // First, remove all existing roles
        userRoleRepository.deleteAllByUser(targetUser);

        // Get the current user's email from JWT for tracking who made the changes
        String currentUserEmail = jwt.getClaimAsString("email");
        if (currentUserEmail == null) {
            currentUserEmail = jwt.getSubject();
        }

        // Add the new roles
        for (String roleName : request.getRoleNames()) {
            Role role = roleRepository.findByRoleName(roleName)
                    .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));

            UserRole userRole = new UserRole();
            userRole.setUser(targetUser);
            userRole.setRole(role);
            userRole.setAssignedBy(currentUserEmail);
            userRole.setAssignedAt(LocalDateTime.now());
            userRoleRepository.save(userRole);
            log.info("Added role {} to user {}", roleName, targetUser.getEmail());
        }

        log.info("User {} roles updated successfully by {}", targetUser.getEmail(), currentUserEmail);
    }

    // -------------------------------
    // Helper methods
    // -------------------------------
    private AdminUserDTO toDTO(AppUser user) {
        return AdminUserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .isActive(user.isActive())
                .roles(user.getUserRoles().stream()
                        .map(ur -> ur.getRole().getRoleName())
                        .collect(Collectors.toList()))
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }


}
