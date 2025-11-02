package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.LoginAudit;
import com.staffmanagement.authservice.repository.LoginAuditRepository;
import io.qameta.allure.junit5.AllureJunit5;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(AllureJunit5.class)
@WebMvcTest(controllers = AuditController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuditControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private LoginAuditRepository loginAuditRepository;

    @Test
    @DisplayName("GET /api/v1/admin/audit-log returns converted DTOs")
    void auditLog_ok() throws Exception {
        AppUser user = AppUser.builder().id(10L).email("user@example.com").build();
        LoginAudit audit = LoginAudit.builder()
                .id(1L)
                .user(user)
                .email("user@example.com")
                .cognitoSub("sub")
                .eventType("LOGIN")
                .ipAddress("127.0.0.1")
                .userAgent("UA")
                .createdAt(LocalDateTime.now())
                .success(true)
                .build();
        given(loginAuditRepository.findAllByOrderByCreatedAtDesc()).willReturn(List.of(audit));

        mockMvc.perform(get("/api/v1/admin/audit-log").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email", is("user@example.com")))
                .andExpect(jsonPath("$[0].userId", is(10)));
    }
}
