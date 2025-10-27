package com.staffmanagement.authservice.repository;

import com.staffmanagement.authservice.entity.LoginAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginAuditRepository extends JpaRepository<LoginAudit, Long> {

    List<LoginAudit> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<LoginAudit> findByEmailOrderByCreatedAtDesc(String email);

    List<LoginAudit> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);

    List<LoginAudit> findByUserIdAndCreatedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);

    List<LoginAudit> findTop100ByOrderByCreatedAtDesc();
    List<LoginAudit> findAllByOrderByCreatedAtDesc();

}
