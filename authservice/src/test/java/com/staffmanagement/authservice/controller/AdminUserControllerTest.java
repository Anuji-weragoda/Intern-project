package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.dto.request.AssignRolesRequest;
import com.staffmanagement.authservice.dto.response.AdminUserDTO;
import com.staffmanagement.authservice.service.AdminUserService;
import io.qameta.allure.junit5.AllureJunit5;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(AllureJunit5.class)
@WebMvcTest(controllers = AdminUserController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminUserControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private AdminUserService adminUserService;

    @Test
    @DisplayName("GET /api/v1/admin/users returns a page of users")
    void listUsers_ok() throws Exception {
        Page<AdminUserDTO> page = new PageImpl<>(List.of(AdminUserDTO.builder()
                .id(1L).email("a@b.com").username("john").build()));
        given(adminUserService.searchUsers(isNull(), eq(0), eq(10))).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/users").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].email", is("a@b.com")));
    }

    @Test
    @DisplayName("GET /api/v1/admin/users/{id} returns user")
    void getUser_ok() throws Exception {
        given(adminUserService.getUser(5L)).willReturn(AdminUserDTO.builder().id(5L).email("x@y.com").build());

        mockMvc.perform(get("/api/v1/admin/users/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(5)));
    }

    @Test
    @DisplayName("PATCH /api/v1/admin/users/{id}/roles forwards to service with JWT")
    void assignRoles_ok() throws Exception {
        Map<String, Object> body = Map.of(
                "addRoles", List.of("ADMIN"),
                "removeRoles", List.of("USER")
        );

        mockMvc.perform(patch("/api/v1/admin/users/9/roles")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> {
                            jwt.claim("sub", "manager-sub");
                            jwt.claim("email", "manager@example.com");
                        }))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(body)))
                .andExpect(status().isOk());

        verify(adminUserService).assignRolesToUser(eq(9L), any(AssignRolesRequest.class), any());
    }

    @Test
    @DisplayName("POST /api/v1/admin/users/{id}/resync-groups triggers resync")
    void resync_ok() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users/7/resync-groups"))
                .andExpect(status().isOk());
        verify(adminUserService).resyncUserGroups(7L);
    }
}
