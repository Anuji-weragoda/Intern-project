package com.staffmanagement.authservice.handler;

import com.staffmanagement.authservice.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class CognitoLogoutHandler implements LogoutHandler {

    private static final String COGNITO_LOGOUT_URL =
        "https://eu-north-1eovax8nlu.auth.eu-north-1.amazoncognito.com/logout?" +
        "client_id=7f8b8tgho76tcl9dmirq2tomar&logout_uri=http://localhost:5173/";

    private final AuditService auditService;

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response,
                       Authentication authentication) {
        try {
            String ipAddress = request.getRemoteAddr();
            String userAgent = request.getHeader("User-Agent");

            String cognitoSub = null;
            String email = null;

            if (authentication != null) {
                Object principal = authentication.getPrincipal();
                if (principal instanceof OidcUser oidcUser) {
                    cognitoSub = oidcUser.getSubject();
                    email = oidcUser.getEmail();
                } else {
                    // Fallback: record at least the principal name if available
                    email = authentication.getName();
                }
            }

            try {
                auditService.logLogout(
                    cognitoSub,
                    email,
                    ipAddress,
                    userAgent
                );
            } catch (Exception ex) {
                log.error("Failed to save logout audit: {}", ex.getMessage(), ex);
            }

            // Redirect to Cognito logout
            response.sendRedirect(COGNITO_LOGOUT_URL);
        } catch (IOException e) {
            log.error("Failed to handle logout: {}", e.getMessage(), e);
        }
    }
}
