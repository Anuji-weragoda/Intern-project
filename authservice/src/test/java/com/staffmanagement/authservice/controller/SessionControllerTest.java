package com.staffmanagement.authservice.controller;

import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Story;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import io.qameta.allure.junit5.AllureJunit5;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Epic("Auth Service")
@Feature("Session Controller")
@ExtendWith(AllureJunit5.class)
@WebMvcTest(controllers = SessionController.class)
@AutoConfigureMockMvc(addFilters = false)
class SessionControllerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    @Story("Logout redirection")
    @DisplayName("POST /api/v1/sessions/logout redirects to /logout")
    void logout_redirects() throws Exception {
        mockMvc.perform(post("/api/v1/sessions/logout"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", "/logout"));
    }
}
