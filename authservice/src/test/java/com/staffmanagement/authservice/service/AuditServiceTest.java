package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.LoginAudit;
import com.staffmanagement.authservice.repository.AppUserRepository;
import com.staffmanagement.authservice.repository.LoginAuditRepository;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Story;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import io.qameta.allure.junit5.AllureJunit5;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@Epic("Auth Service")
@Feature("Audit Service")
@ExtendWith({MockitoExtension.class, AllureJunit5.class})
class AuditServiceTest {

    @Mock private LoginAuditRepository loginAuditRepository;
    @Mock private AppUserRepository appUserRepository;
    @Mock private EntityManager entityManager;

    @InjectMocks private AuditService auditService;

    @Test
    @Story("Async login audit logging")
    @DisplayName("logLoginAsync persists LoginAudit with provided eventTime and user link")
    void logLoginAsync_persists() {
        AppUser user = AppUser.builder().id(10L).email("x@y.com").cognitoSub("sub").build();
        given(appUserRepository.findByCognitoSub("sub")).willReturn(Optional.of(user));

        LocalDateTime eventTime = LocalDateTime.now().minusMinutes(1);
        auditService.logLoginAsync("sub", "x@y.com", "PROFILE_FETCH", "127.0.0.1", "UA", true, null, eventTime);

        ArgumentCaptor<LoginAudit> captor = ArgumentCaptor.forClass(LoginAudit.class);
        verify(entityManager).persist(captor.capture());
        verify(entityManager).flush();

        LoginAudit saved = captor.getValue();
        assertThat(saved.getEventType()).isEqualTo("PROFILE_FETCH");
        assertThat(saved.getCreatedAt()).isEqualTo(eventTime);
        assertThat(saved.getUser()).isNotNull();
    }
}
