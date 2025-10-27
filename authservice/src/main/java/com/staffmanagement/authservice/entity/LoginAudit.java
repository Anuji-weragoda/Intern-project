package com.staffmanagement.authservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;

@Entity
@Table(name = "login_audit", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@org.hibernate.annotations.DynamicInsert
@org.hibernate.annotations.DynamicUpdate
public class LoginAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "fk_login_audit_user"))
    private AppUser user;

    @Column(name = "cognito_sub")
    private String cognitoSub;

    @Column(name = "email")
    private String email;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType; // LOGIN, LOGOUT, LOGIN_FAILED, MFA_CHALLENGE

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "device_info", columnDefinition = "JSONB")
    private String deviceInfo;

    @Column(name = "location_info", columnDefinition = "JSONB")
    private String locationInfo;

    @Column(name = "success")
    private boolean success = true;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "session_id")
    private String sessionId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
