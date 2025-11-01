package com.staffmanagement.authservice.handler;

import com.staffmanagement.authservice.service.AuditService;
import com.staffmanagement.authservice.service.CognitoUserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class CognitoOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final CognitoUserService cognitoUserService;
    private final AuditService auditService;
    private final com.staffmanagement.authservice.service.UserService userService;

    @org.springframework.beans.factory.annotation.Value("${cognito.allowed-groups:}")
    private String allowedGroupsCsv;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication)
            throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        cognitoUserService.processOAuthPostLogin(oAuth2User);

        // Determine whether this user belongs to an allowed Cognito group (or has a DB role that is allowed)
        String cognitoSub = oAuth2User.getAttribute("sub");
        Set<String> allowedGroups = Arrays.stream((allowedGroupsCsv == null ? "" : allowedGroupsCsv).split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());

        // Extract groups from OIDC principal if present
        Set<String> userGroups = new HashSet<>();
        Object groupsObj = oAuth2User.getAttribute("cognito:groups");
        if (groupsObj instanceof java.util.Collection) {
            for (Object o : (java.util.Collection<?>) groupsObj) {
                if (o != null) userGroups.add(o.toString());
            }
        } else if (groupsObj instanceof String) {
            String g = (String) groupsObj;
            for (String part : g.split(",")) {
                if (!part.isBlank()) userGroups.add(part.trim());
            }
        }

        // If no groups present in token, fallback to DB roles for the user
        if (userGroups.isEmpty() && cognitoSub != null) {
            try {
                com.staffmanagement.authservice.dto.response.UserProfileDTO profile = userService.getCurrentUser(cognitoSub);
                if (profile != null && profile.getRoles() != null) {
                    userGroups.addAll(profile.getRoles());
                }
            } catch (Exception e) {
                log.debug("No DB profile found for sub {} while checking login groups", cognitoSub);
            }
        }

        boolean allowed = false;
        for (String g : userGroups) {
            if (allowedGroups.contains(g)) {
                allowed = true;
                break;
            }
        }

        if (!allowed) {
            log.warn("User {} (sub={}) attempted login but is not a member of allowed groups {}. Present groups/roles: {}",
                    oAuth2User.getAttribute("email"), cognitoSub, allowedGroups, userGroups);

            // Audit attempted login as failed
            try {
                java.time.LocalDateTime eventTime = java.time.LocalDateTime.now();
                auditService.logLoginAsync(cognitoSub, oAuth2User.getAttribute("email"), "LOGIN", request.getRemoteAddr(), request.getHeader("User-Agent"), false, "NOT_IN_ALLOWED_GROUP", eventTime);
            } catch (Exception e) {
                log.error("Failed to log failed login attempt for {}: {}", oAuth2User.getAttribute("email"), e.getMessage());
            }

            // Redirect to frontend unauthorized page without issuing session cookie
            response.sendRedirect("http://localhost:5173/unauthorized");
            return;
        }

    String email = oAuth2User.getAttribute("email");
    // cognitoSub already extracted earlier
        String ipAddress = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");

        log.info("Successful Cognito login for user: {}", email);

        // EXTRACT JWT TOKEN
        String idToken = null;
        
        if (oAuth2User instanceof OidcUser) {
            OidcUser oidcUser = (OidcUser) oAuth2User;
            idToken = oidcUser.getIdToken().getTokenValue();
            log.info("TOKEN EXTRACTED! Length: {}", idToken.length());
        } else {
            log.error("CANNOT GET TOKEN - Not OidcUser!");
        }

        // SET COOKIE (Frontend can read this)
        if (idToken != null) {
            Cookie cookie = new Cookie("jwt_token", idToken);
            cookie.setHttpOnly(false);  // MUST BE FALSE!
            cookie.setSecure(false);
            cookie.setPath("/");
            cookie.setMaxAge(3600);
            response.addCookie(cookie);
            log.info("Cookie set!");
        }

        // AUDIT LOG
        try {
            // Capture the event time immediately so the persisted audit keeps correct ordering
            java.time.LocalDateTime eventTime = java.time.LocalDateTime.now();
            auditService.logLoginAsync(cognitoSub, email, "LOGIN", ipAddress, userAgent, true, null, eventTime);
        } catch (Exception e) {
            log.error("Failed to log audit for user: {}", email, e);
        }

        // REDIRECT with token in URL
        if (idToken != null) {
            String encodedToken = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
            response.sendRedirect("http://localhost:5173/?jwt=" + encodedToken);
            log.info(" Redirecting with token in URL");
        } else {
            response.sendRedirect("http://localhost:5173/");
            log.error("Redirecting WITHOUT token!");
        }
    }
}