package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.dto.LoginResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthenticationResultType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthFlowType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CognitoIdentityProviderException;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CognitoAuthService {
    private static final Logger log = LoggerFactory.getLogger(CognitoAuthService.class);

    private final CognitoIdentityProviderClient client;
    private final String clientId;
    private final String userPoolId;
    private final String clientSecret; // optional

    public CognitoAuthService() {
        String region = System.getenv("AWS_REGION");
        if (region == null || region.isBlank()) {
            throw new IllegalStateException("Environment variable AWS_REGION must be set");
        }
        this.client = CognitoIdentityProviderClient.builder()
                .region(Region.of(region))
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();

        this.clientId = System.getenv("COGNITO_APP_CLIENT_ID");
        this.userPoolId = System.getenv("COGNITO_USER_POOL_ID");
        this.clientSecret = System.getenv("COGNITO_CLIENT_SECRET");
        if (this.clientId == null || this.clientId.isBlank() || this.userPoolId == null || this.userPoolId.isBlank()) {
            throw new IllegalStateException("Environment variables COGNITO_APP_CLIENT_ID and COGNITO_USER_POOL_ID must be set");
        }

        if (this.clientSecret != null && !this.clientSecret.isBlank()) {
            log.info("COGNITO_CLIENT_SECRET is configured; SECRET_HASH will be included for auth requests");
        }
    }

    public LoginResponse authenticate(String email, String password) {
        try {
            Map<String, String> authParams = new HashMap<>();
            authParams.put("USERNAME", email);
            authParams.put("PASSWORD", password);

            if (this.clientSecret != null && !this.clientSecret.isBlank()) {
                String secretHash = calculateSecretHash(email, this.clientId, this.clientSecret);
                authParams.put("SECRET_HASH", secretHash);
            }

            InitiateAuthRequest authRequest = InitiateAuthRequest.builder()
                    .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                    .clientId(this.clientId)
                    .authParameters(authParams)
                    .build();

            InitiateAuthResponse authResponse = client.initiateAuth(authRequest);
            AuthenticationResultType result = authResponse.authenticationResult();
            if (result == null) {
                throw new RuntimeException("Authentication failed: empty result from Cognito");
            }

            String accessToken = result.accessToken();
            String refreshToken = result.refreshToken();
            String idToken = result.idToken();
            String tokenType = result.tokenType();
            Integer expiresIn = result.expiresIn();

            // Fetch user attributes using the access token
            Map<String, String> userAttributes = new HashMap<>();
            try {
                GetUserRequest getUserRequest = GetUserRequest.builder().accessToken(accessToken).build();
                GetUserResponse getUserResponse = client.getUser(getUserRequest);
                List<AttributeType> attributes = getUserResponse.userAttributes();
                if (attributes != null) {
                    for (AttributeType attr : attributes) {
                        userAttributes.put(attr.name(), attr.value());
                    }
                }
            } catch (CognitoIdentityProviderException e) {
                log.warn("Failed to fetch user attributes from Cognito: {}", e.getMessage());
            }

            return new LoginResponse(accessToken, refreshToken, idToken, tokenType, expiresIn, userAttributes);

        } catch (CognitoIdentityProviderException e) {
            String msg = e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage();
            log.warn("Cognito authentication failed: {}", msg);
            throw new RuntimeException(msg);
        }
    }

    private static String calculateSecretHash(String username, String clientId, String clientSecret) {
        try {
            String message = username + clientId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(clientSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] rawHmac = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(rawHmac);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to calculate SECRET_HASH", ex);
        }
    }
}
