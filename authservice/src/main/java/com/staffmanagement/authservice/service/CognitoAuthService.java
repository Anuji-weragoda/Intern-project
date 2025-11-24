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
import software.amazon.awssdk.services.cognitoidentityprovider.model.SignUpRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.SignUpResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ConfirmSignUpRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ConfirmSignUpResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ResendConfirmationCodeRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ResendConfirmationCodeResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthFlowType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CognitoIdentityProviderException;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ConfirmSignUpRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ConfirmSignUpResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ResendConfirmationCodeRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ResendConfirmationCodeResponse;
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

    public com.staffmanagement.authservice.dto.SignupResponse signUp(String email, String password, String givenName, String familyName) {
        try {
            Map<String, String> userAttrs = new HashMap<>();
            userAttrs.put("email", email);
            if (givenName != null && !givenName.isBlank()) userAttrs.put("given_name", givenName);
            if (familyName != null && !familyName.isBlank()) userAttrs.put("family_name", familyName);

            SignUpRequest.Builder signUpBuilder = SignUpRequest.builder()
                    .clientId(this.clientId)
                    .username(email)
                    .password(password);

            if (this.clientSecret != null && !this.clientSecret.isBlank()) {
                String secretHash = calculateSecretHash(email, this.clientId, this.clientSecret);
                Map<String, String> authParams = new HashMap<>();
                authParams.put("SECRET_HASH", secretHash);
                signUpBuilder.secretHash(secretHash);
            }

            // add user attributes
            if (!userAttrs.isEmpty()) {
                for (Map.Entry<String, String> e : userAttrs.entrySet()) {
                    signUpBuilder.userAttributes(software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType.builder()
                            .name(e.getKey()).value(e.getValue()).build());
                }
            }

            SignUpRequest req = signUpBuilder.build();
            SignUpResponse resp = client.signUp(req);

            String userSub = resp.userSub();
            boolean confirmed = resp.userConfirmed() != null ? resp.userConfirmed() : false;

            return new com.staffmanagement.authservice.dto.SignupResponse(userSub, confirmed, "User signup successful");
        } catch (CognitoIdentityProviderException e) {
            String msg = e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage();
            log.warn("Cognito signup failed: {}", msg);
            throw new RuntimeException(msg);
        }
    }

    public com.staffmanagement.authservice.dto.SignupResponse confirmSignUp(String email, String confirmationCode) {
        try {
            ConfirmSignUpRequest.Builder builder = ConfirmSignUpRequest.builder()
                    .clientId(this.clientId)
                    .username(email)
                    .confirmationCode(confirmationCode);

            if (this.clientSecret != null && !this.clientSecret.isBlank()) {
                String secretHash = calculateSecretHash(email, this.clientId, this.clientSecret);
                builder = builder.secretHash(secretHash);
            }

            ConfirmSignUpRequest req = builder.build();
            ConfirmSignUpResponse resp = client.confirmSignUp(req);
            return new com.staffmanagement.authservice.dto.SignupResponse(null, true, "User confirmed");
        } catch (CognitoIdentityProviderException e) {
            String msg = e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage();
            log.warn("Cognito confirmSignUp failed: {}", msg);
            throw new RuntimeException(msg);
        }
    }

    public com.staffmanagement.authservice.dto.SignupResponse resendConfirmation(String email) {
        try {
            ResendConfirmationCodeRequest.Builder builder = ResendConfirmationCodeRequest.builder()
                    .clientId(this.clientId)
                    .username(email);

            if (this.clientSecret != null && !this.clientSecret.isBlank()) {
                String secretHash = calculateSecretHash(email, this.clientId, this.clientSecret);
                builder = builder.secretHash(secretHash);
            }

            ResendConfirmationCodeRequest req = builder.build();
            ResendConfirmationCodeResponse resp = client.resendConfirmationCode(req);
            return new com.staffmanagement.authservice.dto.SignupResponse(null, false, "Confirmation code resent");
        } catch (CognitoIdentityProviderException e) {
            String msg = e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage();
            log.warn("Cognito resendConfirmation failed: {}", msg);
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
