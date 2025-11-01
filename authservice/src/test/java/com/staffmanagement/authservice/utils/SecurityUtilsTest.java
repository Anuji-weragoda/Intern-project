package com.staffmanagement.authservice.utils;

import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.Role;
import com.staffmanagement.authservice.entity.UserRole;
import com.staffmanagement.authservice.repository.AppUserRepository;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Story;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import io.qameta.allure.junit5.AllureJunit5;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@Epic("Auth Service")
@Feature("Security Utils")
@ExtendWith({MockitoExtension.class, AllureJunit5.class})
class SecurityUtilsTest {

    @Mock private AppUserRepository appUserRepository;

    @InjectMocks private SecurityUtils securityUtils;

    @Test
    @Story("Check admin role")
    @DisplayName("hasAdminRole returns true if user has ADMIN role")
    void hasAdminRole_true() {
        Role admin = Role.builder().id(2L).roleName("ADMIN").build();
        AppUser user = AppUser.builder().id(1L).cognitoSub("sub").email("a@b.com").build();
        // Link role via UserRole set
        UserRole link = UserRole.builder().user(user).role(admin).build();
        user.setUserRoles(Set.of(link));

        given(appUserRepository.findByCognitoSub("sub")).willReturn(Optional.of(user));

        Jwt jwt = Jwt.withTokenValue("t")
                .header("alg", "none")
                .claim("sub", "sub")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .build();

        assertThat(securityUtils.hasAdminRole(jwt)).isTrue();
    }
}
