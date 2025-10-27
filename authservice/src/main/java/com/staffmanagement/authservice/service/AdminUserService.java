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
import org.springframework.data.domain.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import io.github.cdimascio.dotenv.Dotenv;

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

    private static final String USER_POOL_ID = "eu-north-1_eOvAx8nlu";

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

        // Check if JWT contains ADMIN group
        List<String> groups = jwt.getClaimAsStringList("cognito:groups");
        if (groups == null || !groups.contains("ADMIN")) {
            throw new RuntimeException("Only ADMIN users can assign or remove roles");
        }

        if (request.getRoleNames() == null || request.getRoleNames().isEmpty()) {
            throw new IllegalArgumentException("At least one role is required");
        }

        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        CognitoIdentityProviderClient cognito = createCognitoClient();
        String cognitoUsername = null;

        if (cognito != null) {
            try {
                AdminGetUserResponse cognitoUser = cognito.adminGetUser(AdminGetUserRequest.builder()
                        .userPoolId(USER_POOL_ID)
                        .username(user.getCognitoSub())
                        .build());
                cognitoUsername = cognitoUser.username();
            } catch (UserNotFoundException e) {
                log.warn("Cognito user not found for sub: {}", user.getCognitoSub());
            } catch (SdkClientException e) {
                log.warn("AWS credentials not configured properly: {}", e.getMessage());
            }
        }

        for (String roleName : request.getRoleNames()) {

            Role role = roleRepository.findByRoleName(roleName)
                    .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));

            Optional<UserRole> existing = userRoleRepository.findByUserAndRole(user, role);

            if (existing.isPresent()) {
                // Remove role from DB + Cognito
                userRoleRepository.delete(existing.get());

                if (cognito != null && cognitoUsername != null) {
                    try {
                        removeUserFromCognitoGroup(cognito, cognitoUsername, roleName);
                        log.info("Removed {} from Cognito group {}", cognitoUsername, roleName);
                    } catch (Exception e) {
                        log.warn("Failed to remove {} from Cognito group {}: {}", cognitoUsername, roleName, e.getMessage());
                    }
                }

            } else {
                // Add new role in DB + Cognito
                UserRole userRole = new UserRole();
                userRole.setUser(user);
                userRole.setRole(role);
                userRole.setAssignedBy(jwt.getSubject()); // use JWT subject
                userRole.setAssignedAt(LocalDateTime.now());
                userRoleRepository.save(userRole);

                if (cognito != null && cognitoUsername != null) {
                    try {
                        addUserToCognitoGroup(cognito, cognitoUsername, roleName);
                        log.info("Added {} to Cognito group {}", cognitoUsername, roleName);
                    } catch (Exception e) {
                        log.error("Failed to add {} to Cognito group {}: {}", cognitoUsername, roleName, e.getMessage());
                    }
                }
            }
        }

        log.info("User {} roles updated successfully", user.getUsername());
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

    private CognitoIdentityProviderClient createCognitoClient() {
        try {
            Dotenv dotenv = Dotenv.load();
            String accessKey = dotenv.get("AWS_ACCESS_KEY_ID");
            String secretKey = dotenv.get("AWS_SECRET_ACCESS_KEY");
            String region = dotenv.get("AWS_REGION");

            return CognitoIdentityProviderClient.builder()
                    .region(Region.of(region))
                    .credentialsProvider(
                            StaticCredentialsProvider.create(
                                    AwsBasicCredentials.create(accessKey, secretKey)
                            )
                    )
                    .build();
        } catch (Exception e) {
            log.warn("Cannot create Cognito client: " + e.getMessage());
            return null;
        }
    }

    private void addUserToCognitoGroup(CognitoIdentityProviderClient cognito, String username, String groupName) {
        AdminAddUserToGroupRequest request = AdminAddUserToGroupRequest.builder()
                .userPoolId(USER_POOL_ID)
                .username(username)
                .groupName(groupName)
                .build();
        cognito.adminAddUserToGroup(request);
    }

    private void removeUserFromCognitoGroup(CognitoIdentityProviderClient cognito, String username, String groupName) {
        AdminRemoveUserFromGroupRequest request = AdminRemoveUserFromGroupRequest.builder()
                .userPoolId(USER_POOL_ID)
                .username(username)
                .groupName(groupName)
                .build();
        cognito.adminRemoveUserFromGroup(request);
    }
}
