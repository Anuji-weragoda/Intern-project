package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.dto.request.AssignRolesRequest;
import com.staffmanagement.authservice.dto.response.AdminUserDTO;
import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.Role;
import com.staffmanagement.authservice.entity.UserRole;
import com.staffmanagement.authservice.repository.AppUserRepository;
import com.staffmanagement.authservice.repository.RoleRepository;
import com.staffmanagement.authservice.repository.UserRoleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    private final CognitoAdminService cognitoAdminService;

    public AdminUserService(AppUserRepository appUserRepository,
                          RoleRepository roleRepository,
                          UserRoleRepository userRoleRepository,
                          CognitoAdminService cognitoAdminService) {
        this.appUserRepository = appUserRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.cognitoAdminService = cognitoAdminService;
    }

    @Value("${cognito.allowed-groups:}")
    private String allowedGroupsCsv;
    
    @Value("${cognito.sync-groups:true}")
    private boolean cognitoSyncGroups;

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

    /**
     * Force-sync DB roles to Cognito groups for a single user.
     * Useful for manual reconciliation when automated sync fails.
     */
    public void resyncUserGroups(Long userId) {
        AppUser targetUser = appUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        Set<String> allowedGroups = Arrays.stream((allowedGroupsCsv == null ? "" : allowedGroupsCsv).split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());

        // Current DB roles
        Set<String> dbRoles = targetUser.getUserRoles().stream()
                .map(ur -> ur.getRole().getRoleName())
                .collect(Collectors.toSet());

        String username = targetUser.getUsername() != null ? targetUser.getUsername() : targetUser.getEmail();

        // For each allowed group, ensure membership matches DB
        for (String group : allowedGroups) {
            try {
                if (dbRoles.contains(group)) {
                    cognitoAdminService.addUserToGroup(username, group);
                } else {
                    cognitoAdminService.removeUserFromGroup(username, group);
                }
            } catch (Exception e) {
                log.warn("Resync: failed to sync Cognito group {} for user {}: {}", group, targetUser.getEmail(), e.getMessage());
            }
        }
        log.info("Resync completed for user {} (id={})", targetUser.getEmail(), targetUser.getId());
    }

    // -------------------------------
    // Assign or remove roles (ADMIN only)
    // -------------------------------
    public void assignRolesToUser(Long userId, AssignRolesRequest request, Jwt jwt) {
        AppUser targetUser = appUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        // Get the current user's email from JWT for tracking who made the changes
        String currentUserEmail = jwt.getClaimAsString("email");
        if (currentUserEmail == null) {
            currentUserEmail = jwt.getSubject();
        }

        // Incremental mode: addRoles/removeRoles provided -> apply changes without wiping other roles
    List<String> add = request.getAddRoles();
    List<String> remove = request.getRemoveRoles();

    // parse allowed groups into a set for quick lookup
    Set<String> allowedGroups = Arrays.stream((allowedGroupsCsv == null ? "" : allowedGroupsCsv).split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .collect(Collectors.toSet());

        if ((add != null && !add.isEmpty()) || (remove != null && !remove.isEmpty())) {
            // Removals
            if (remove != null) {
                for (String roleName : remove) {
                    Role role = roleRepository.findByRoleName(roleName)
                            .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
                    Optional<UserRole> existing = userRoleRepository.findByUserAndRole(targetUser, role);
                    existing.ifPresent(userRoleRepository::delete);
                    log.info("Removed role {} from user {}", roleName, targetUser.getEmail());

                    // If this role maps to a Cognito group we should remove the user from that group
                    try {
                            if (allowedGroups.contains(roleName) && cognitoSyncGroups) {
                                    String username = targetUser.getUsername() != null ? targetUser.getUsername() : targetUser.getEmail();
                                    String cognitoGroup = mapToCognitoGroup(roleName);
                                    if (cognitoGroup != null) {
                                        cognitoAdminService.removeUserFromGroup(username, cognitoGroup);
                                    }
                                }
                    } catch (Exception e) {
                        log.warn("Failed to remove Cognito group for user {} role {}: {}", targetUser.getEmail(), roleName, e.getMessage());
                    }
                }
            }

            // Additions
            if (add != null) {
                for (String roleName : add) {
                    Role role = roleRepository.findByRoleName(roleName)
                            .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
                    Optional<UserRole> existing = userRoleRepository.findByUserAndRole(targetUser, role);
                    if (existing.isEmpty()) {
                        UserRole userRole = new UserRole();
                        userRole.setUser(targetUser);
                        userRole.setRole(role);
                        userRole.setAssignedBy(currentUserEmail);
                        userRole.setAssignedAt(LocalDateTime.now());
                        userRoleRepository.save(userRole);
                        log.info("Added role {} to user {}", roleName, targetUser.getEmail());

                        // If this role maps to a Cognito group we should add the user to that group
                        try {
                            if (allowedGroups.contains(roleName) && cognitoSyncGroups) {
                                String username = targetUser.getUsername() != null ? targetUser.getUsername() : targetUser.getEmail();
                                String cognitoGroup = mapToCognitoGroup(roleName);
                                if (cognitoGroup != null) {
                                    cognitoAdminService.addUserToGroup(username, cognitoGroup);
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Failed to add Cognito group for user {} role {}: {}", targetUser.getEmail(), roleName, e.getMessage());
                        }
                    }
                }
            }

            log.info("User {} roles incrementally updated by {}", targetUser.getEmail(), currentUserEmail);
            return;
        }

        // Full replace mode: roleNames provided -> make user's roles exactly this set
        List<String> requested = request.getRoleNames();
        if (requested == null) {
            throw new IllegalArgumentException("At least one role is required");
        }

        // Current roles
        List<UserRole> currentUserRoles = userRoleRepository.findByUser(targetUser);
        Set<String> currentRoleNames = currentUserRoles.stream()
                .map(ur -> ur.getRole().getRoleName())
                .collect(Collectors.toSet());

        Set<String> requestedSet = new HashSet<>(requested);

        // Roles to remove
        for (UserRole ur : currentUserRoles) {
            String rn = ur.getRole().getRoleName();
            if (!requestedSet.contains(rn)) {
                userRoleRepository.delete(ur);
                log.info("Removed role {} from user {}", rn, targetUser.getEmail());

                // Remove from Cognito group if applicable
                try {
                    if (allowedGroups.contains(rn) && cognitoSyncGroups) {
                            String username = targetUser.getUsername() != null ? targetUser.getUsername() : targetUser.getEmail();
                            String cognitoGroup = mapToCognitoGroup(rn);
                            if (cognitoGroup != null) {
                                cognitoAdminService.removeUserFromGroup(username, cognitoGroup);
                            }
                        }
                } catch (Exception e) {
                    log.warn("Failed to remove Cognito group for user {} role {}: {}", targetUser.getEmail(), rn, e.getMessage());
                }
            }
        }

        // Roles to add
        for (String roleName : requestedSet) {
                if (!currentRoleNames.contains(roleName)) {
                Role role = roleRepository.findByRoleName(roleName)
                        .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
                UserRole userRole = new UserRole();
                userRole.setUser(targetUser);
                userRole.setRole(role);
                userRole.setAssignedBy(currentUserEmail);
                userRole.setAssignedAt(LocalDateTime.now());
                userRoleRepository.save(userRole);
                log.info("Added role {} to user {}", roleName, targetUser.getEmail());

                // Add Cognito group if applicable
                try {
                    if (allowedGroups.contains(roleName) && cognitoSyncGroups) {
                            String username = targetUser.getUsername() != null ? targetUser.getUsername() : targetUser.getEmail();
                            String cognitoGroup = mapToCognitoGroup(roleName);
                            if (cognitoGroup != null) {
                                cognitoAdminService.addUserToGroup(username, cognitoGroup);
                            }
                        }
                } catch (Exception e) {
                    log.warn("Failed to add Cognito group for user {} role {}: {}", targetUser.getEmail(), roleName, e.getMessage());
                }
            }
        }

        log.info("User {} roles replaced successfully by {}", targetUser.getEmail(), currentUserEmail);
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

    /**
     * Map application role names to Cognito group names.
     * Per request, ML1/ML2/ML3 (and HR) should also map to the ADMIN Cognito group.
     */
    private String mapToCognitoGroup(String roleName) {
        if (roleName == null) return null;
        // By default map role names directly to Cognito group names.
        // Do NOT map ML1/ML2/ML3/HR to ADMIN so those roles will not grant ADMIN access.
        return roleName;
    }


}
