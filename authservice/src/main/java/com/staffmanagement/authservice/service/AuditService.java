package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.LoginAudit;
import com.staffmanagement.authservice.repository.AppUserRepository;
import com.staffmanagement.authservice.repository.LoginAuditRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuditService {

    private final LoginAuditRepository loginAuditRepository;
    private final AppUserRepository appUserRepository;
    private final EntityManager entityManager;

    /**
     * Logs a login event asynchronously.
     * This method runs in a background thread to avoid slowing down authentication.
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logLoginAsync(String cognitoSub,
                              String email,
                              String eventType,
                              String ipAddress,
                              String userAgent,
                              boolean success,
                              String failureReason) {
        try {
            log.debug("Starting to save login audit for user: {} - event: {}", email, eventType);
            
            // Find the user (if exists) to link the audit to AppUser
            AppUser user = appUserRepository.findByCognitoSub(cognitoSub).orElse(null);
            if (user == null) {
                user = appUserRepository.findByEmail(email).orElse(null);
            }
            
            if (user != null) {
                log.debug("Found user with ID: {} for audit", user.getId());
                user.setLastLoginAt(java.time.LocalDateTime.now());
                appUserRepository.save(user);
            } else {
                log.warn("No user found for cognitoSub: {} or email: {}", cognitoSub, email);
            }

            // Build the audit record
            LoginAudit audit = LoginAudit.builder()
                    .user(user)
                    .cognitoSub(cognitoSub)
                    .email(email)
                    .eventType(eventType) 
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .success(success)
                    .failureReason(failureReason)
                    .build();

            // Save and flush to DB immediately
            entityManager.persist(audit);
            entityManager.flush();
            
            log.info("Successfully persisted {} audit for user: {} with ID: {}", 
                    eventType, email, audit.getId());
        } catch (Exception e) {
            log.error("Failed to save login audit for {}: {}", email, e.getMessage(), e);
        }
    }

    /**
     * Logs a logout event.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logLogout(String cognitoSub,
                          String email,
                          String ipAddress,
                          String userAgent) {
        try {
            // Try to find user by both cognitoSub and email
            AppUser user = appUserRepository.findByCognitoSub(cognitoSub).orElse(null);
            if (user == null) {
                user = appUserRepository.findByEmail(email).orElse(null);
            }

            LoginAudit audit = LoginAudit.builder()
                    .user(user)
                    .cognitoSub(cognitoSub)
                    .email(email)
                    .eventType("LOGOUT") 
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .success(true)
                    .build();

            // Save and flush immediately to ensure persistence
            LoginAudit savedAudit = loginAuditRepository.saveAndFlush(audit);
            log.info("Successfully saved logout audit for user: {} with ID: {}", email, savedAudit.getId());
        } catch (Exception e) {
            log.error("Failed to save logout audit for {}: {}", email, e.getMessage(), e);
        }
    }
}
