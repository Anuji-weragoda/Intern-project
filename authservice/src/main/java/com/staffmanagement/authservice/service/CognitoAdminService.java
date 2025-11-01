package com.staffmanagement.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminAddUserToGroupRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminRemoveUserFromGroupRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CognitoIdentityProviderException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ListUsersResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.UserType;

import jakarta.annotation.PostConstruct;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class CognitoAdminService {

    @Value("${cognito.user-pool-id}")
    private String userPoolId;

    @Value("${AWS_REGION:eu-north-1}")
    private String awsRegion;

    @Value("${AWS_ACCESS_KEY_ID:}")
    private String awsAccessKeyId;

    @Value("${AWS_SECRET_ACCESS_KEY:}")
    private String awsSecretAccessKey;

    private CognitoIdentityProviderClient cognitoClient;

    @PostConstruct
    public void init() {
        Region region = Region.of(Objects.requireNonNull(awsRegion));
        var builder = CognitoIdentityProviderClient.builder().region(region);

        // If AWS credentials are provided in properties, use static provider; otherwise fall back to default provider chain
        if (awsAccessKeyId != null && !awsAccessKeyId.isBlank() && awsSecretAccessKey != null && !awsSecretAccessKey.isBlank()) {
            AwsBasicCredentials creds = AwsBasicCredentials.create(awsAccessKeyId.trim(), awsSecretAccessKey.trim());
            builder.credentialsProvider(StaticCredentialsProvider.create(creds));
            log.info("Using static AWS credentials from properties for Cognito client");
        } else {
            log.info("No static AWS credentials found in properties, using default credentials provider chain");
        }

        this.cognitoClient = builder.build();
        log.info("Initialized CognitoIdentityProviderClient for region {} and pool {}", awsRegion, userPoolId);
    }

    /**
     * Add a user (by username) to a Cognito group.
     * Username should be the Cognito username (often email or username attribute).
     */
    public void addUserToGroup(String username, String groupName) {
        if (username == null || groupName == null) return;
        try {
            AdminAddUserToGroupRequest req = AdminAddUserToGroupRequest.builder()
                    .userPoolId(userPoolId)
                    .username(username)
                    .groupName(groupName)
                    .build();

            cognitoClient.adminAddUserToGroup(req);
            log.info("Added Cognito user {} to group {}", username, groupName);
        } catch (CognitoIdentityProviderException e) {
            String awsMsg = e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage();
            log.warn("Initial attempt failed to add user {} to Cognito group {}: {}", username, groupName, awsMsg);

            // If user not found, try resolving Cognito username by sub or email and retry once
            try {
                String resolved = resolveCognitoUsername(username);
                if (resolved != null && !resolved.equals(username)) {
                    AdminAddUserToGroupRequest req2 = AdminAddUserToGroupRequest.builder()
                            .userPoolId(userPoolId)
                            .username(resolved)
                            .groupName(groupName)
                            .build();
                    cognitoClient.adminAddUserToGroup(req2);
                    log.info("Added Cognito user {} (resolved from {}) to group {}", resolved, username, groupName);
                    return;
                }
            } catch (Exception ex) {
                log.error("Retry lookup/add failed for user {} to group {}: {}", username, groupName, ex.getMessage());
            }

            log.error("Failed to add user {} to Cognito group {}: {}", username, groupName, awsMsg);
        } catch (Exception e) {
            log.error("Unexpected error adding user {} to group {}: {}", username, groupName, e.getMessage());
        }
    }

    /**
     * Remove a user (by username) from a Cognito group.
     */
    public void removeUserFromGroup(String username, String groupName) {
        if (username == null || groupName == null) return;
        try {
            AdminRemoveUserFromGroupRequest req = AdminRemoveUserFromGroupRequest.builder()
                    .userPoolId(userPoolId)
                    .username(username)
                    .groupName(groupName)
                    .build();

            cognitoClient.adminRemoveUserFromGroup(req);
            log.info("Removed Cognito user {} from group {}", username, groupName);
        } catch (CognitoIdentityProviderException e) {
            String awsMsg = e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage();
            log.warn("Initial attempt failed to remove user {} from Cognito group {}: {}", username, groupName, awsMsg);

            // Try to resolve username and retry once
            try {
                String resolved = resolveCognitoUsername(username);
                if (resolved != null && !resolved.equals(username)) {
                    AdminRemoveUserFromGroupRequest req2 = AdminRemoveUserFromGroupRequest.builder()
                            .userPoolId(userPoolId)
                            .username(resolved)
                            .groupName(groupName)
                            .build();
                    cognitoClient.adminRemoveUserFromGroup(req2);
                    log.info("Removed Cognito user {} (resolved from {}) from group {}", resolved, username, groupName);
                    return;
                }
            } catch (Exception ex) {
                log.error("Retry lookup/remove failed for user {} from group {}: {}", username, groupName, ex.getMessage());
            }

            log.error("Failed to remove user {} from Cognito group {}: {}", username, groupName, awsMsg);
        } catch (Exception e) {
            log.error("Unexpected error removing user {} from group {}: {}", username, groupName, e.getMessage());
        }
    }

    /**
     * Resolve a Cognito username by trying the identifier as a sub or email.
     * Returns the Cognito Username if found, otherwise null.
     */
    private String resolveCognitoUsername(String identifier) {
        if (identifier == null) return null;

        // Try as sub
        try {
            ListUsersRequest req = ListUsersRequest.builder()
                    .userPoolId(userPoolId)
                    .filter("sub = \"" + identifier + "\"")
                    .limit(1)
                    .build();
            ListUsersResponse resp = cognitoClient.listUsers(req);
            if (resp.users() != null && !resp.users().isEmpty()) {
                UserType u = resp.users().get(0);
                return u.username();
            }
        } catch (Exception e) {
            log.debug("ListUsers by sub failed for {}: {}", identifier, e.getMessage());
        }

        // Try as email
        try {
            ListUsersRequest req = ListUsersRequest.builder()
                    .userPoolId(userPoolId)
                    .filter("email = \"" + identifier + "\"")
                    .limit(1)
                    .build();
            ListUsersResponse resp = cognitoClient.listUsers(req);
            if (resp.users() != null && !resp.users().isEmpty()) {
                UserType u = resp.users().get(0);
                return u.username();
            }
        } catch (Exception e) {
            log.debug("ListUsers by email failed for {}: {}", identifier, e.getMessage());
        }

        return null;
    }
}
