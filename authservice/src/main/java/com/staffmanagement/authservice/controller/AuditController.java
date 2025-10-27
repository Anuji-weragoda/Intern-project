package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.entity.LoginAudit;
import com.staffmanagement.authservice.dto.response.LoginAuditDTO;
import com.staffmanagement.authservice.repository.LoginAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/audit-log")
@RequiredArgsConstructor
public class AuditController {

    private final LoginAuditRepository loginAuditRepository;

    @GetMapping
    public ResponseEntity<List<LoginAuditDTO>> getAuditLogs(
            @RequestParam(required = false, name = "user_id") Long userId,
            @RequestParam(required = false, name = "rangeStart")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime rangeStart,
            @RequestParam(required = false, name = "rangeEnd")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime rangeEnd
    ) {
        List<LoginAudit> audits;

        if (userId != null && rangeStart != null && rangeEnd != null) {
            audits = loginAuditRepository.findByUserIdAndCreatedAtBetween(userId, rangeStart, rangeEnd);
        } else if (userId != null) {
            audits = loginAuditRepository.findByUserIdOrderByCreatedAtDesc(userId);
        } else if (rangeStart != null && rangeEnd != null) {
            audits = loginAuditRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(rangeStart, rangeEnd);
        } else {
            audits = loginAuditRepository.findAllByOrderByCreatedAtDesc();
        }

        List<LoginAuditDTO> dtos = audits.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // Add this method here ⬇️
    private LoginAuditDTO convertToDTO(LoginAudit audit) {
    LoginAuditDTO.LoginAuditDTOBuilder builder = LoginAuditDTO.builder()
            .id(audit.getId())
            .email(audit.getEmail())  // This comes from audit.email column
            .eventType(audit.getEventType())
            .ipAddress(audit.getIpAddress())
            .userAgent(audit.getUserAgent())
            .success(audit.isSuccess())
            .failureReason(audit.getFailureReason())
            .createdAt(audit.getCreatedAt())
            .cognitoSub(audit.getCognitoSub());  // This comes from audit.cognitoSub column
    
    // Try to get user info from the relationship OR from the audit columns
    if (audit.getUser() != null) {
        builder.userId(audit.getUser().getId())
               .userEmail(audit.getUser().getEmail())
               .displayName(audit.getUser().getDisplayName());
    } else {
        // Fallback: if no user relationship, use the audit's own fields
        builder.userId(null)
               .userEmail(audit.getEmail())  // Use email from audit record
               .displayName(null);
    }
    
    return builder.build();
}
}