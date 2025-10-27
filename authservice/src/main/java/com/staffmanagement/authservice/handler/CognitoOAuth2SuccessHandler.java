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
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@RequiredArgsConstructor
public class CognitoOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final CognitoUserService cognitoUserService;
    private final AuditService auditService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication)
            throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        cognitoUserService.processOAuthPostLogin(oAuth2User);

        String email = oAuth2User.getAttribute("email");
        String cognitoSub = oAuth2User.getAttribute("sub");
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
            auditService.logLoginAsync(cognitoSub, email, "LOGIN", ipAddress, userAgent, true, null);
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