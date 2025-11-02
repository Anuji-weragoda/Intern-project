package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.entity.Role;
import com.staffmanagement.authservice.repository.RoleRepository;
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

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(AllureJunit5.class)
@WebMvcTest(controllers = RoleController.class)
@AutoConfigureMockMvc(addFilters = false)
class RoleControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private RoleRepository roleRepository;

    @Test
    @DisplayName("GET /api/v1/admin/roles returns list of roles")
    void listRoles_ok() throws Exception {
        given(roleRepository.findAll()).willReturn(List.of(
                Role.builder().id(1L).roleName("USER").build(),
                Role.builder().id(2L).roleName("ADMIN").build()
        ));

        mockMvc.perform(get("/api/v1/admin/roles").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].roleName").value("USER"));
    }
}
