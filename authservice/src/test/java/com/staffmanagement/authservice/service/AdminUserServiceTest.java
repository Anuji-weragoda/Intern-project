package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.dto.request.AssignRolesRequest;
import com.staffmanagement.authservice.dto.response.AdminUserDTO;
import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.Role;
import com.staffmanagement.authservice.entity.UserRole;
import com.staffmanagement.authservice.repository.AppUserRepository;
import com.staffmanagement.authservice.repository.RoleRepository;
import com.staffmanagement.authservice.repository.UserRoleRepository;
import io.qameta.allure.junit5.AllureJunit5;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.oauth2.jwt.Jwt;

import java.lang.reflect.Field;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith({MockitoExtension.class, AllureJunit5.class})
class AdminUserServiceTest {

    @Mock private AppUserRepository appUserRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private CognitoAdminService cognitoAdminService;

    @InjectMocks private AdminUserService adminUserService;

    private AppUser user;

    @BeforeEach
    void init() throws Exception {
        user = AppUser.builder()
                .id(100L)
                .email("user@example.com")
                .username("john")
                .isActive(true)
                .userRoles(new HashSet<>())
                .build();

        // Set allowed groups and sync flag via reflection
        Field f = AdminUserService.class.getDeclaredField("allowedGroupsCsv");
        f.setAccessible(true);
        f.set(adminUserService, "ADMIN,USER");
        Field f2 = AdminUserService.class.getDeclaredField("cognitoSyncGroups");
        f2.setAccessible(true);
        f2.set(adminUserService, true);
    }

    @Test
    @DisplayName("searchUsers returns mapped page of AdminUserDTO")
    void searchUsers_ok() {
        Page<AppUser> page = new PageImpl<>(List.of(user));
        given(appUserRepository.findAll(any(Pageable.class))).willReturn(page);

        Page<AdminUserDTO> result = adminUserService.searchUsers(null, 0, 10);
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmail()).isEqualTo("user@example.com");
    }

    @Test
    @DisplayName("assignRolesToUser incremental add/remove syncs Cognito groups")
    void assignRoles_incremental_ok() {
        given(appUserRepository.findById(100L)).willReturn(Optional.of(user));
        Role adminRole = Role.builder().id(1L).roleName("ADMIN").build();
        Role userRole = Role.builder().id(2L).roleName("USER").build();
        given(roleRepository.findByRoleName("ADMIN")).willReturn(Optional.of(adminRole));
        given(roleRepository.findByRoleName("USER")).willReturn(Optional.of(userRole));
        given(userRoleRepository.findByUserAndRole(eq(user), eq(adminRole))).willReturn(Optional.empty());
        given(userRoleRepository.findByUserAndRole(eq(user), eq(userRole))).willReturn(Optional.of(UserRole.builder().user(user).role(userRole).build()));

        AssignRolesRequest req = new AssignRolesRequest();
        req.setAddRoles(List.of("ADMIN"));
        req.setRemoveRoles(List.of("USER"));

        Jwt jwt = Jwt.withTokenValue("tkn").header("alg","none").claim("email","manager@example.com").build();

        adminUserService.assignRolesToUser(100L, req, jwt);

        verify(userRoleRepository).save(any(UserRole.class));
        verify(userRoleRepository).delete(any(UserRole.class));
        // Cognito sync invoked
        verify(cognitoAdminService).addUserToGroup(eq("john"), eq("ADMIN"));
        verify(cognitoAdminService).removeUserFromGroup(eq("john"), eq("USER"));
    }

    @Test
    @DisplayName("assignRolesToUser full replace removes and adds appropriately")
    void assignRoles_fullReplace_ok() {
        given(appUserRepository.findById(100L)).willReturn(Optional.of(user));
        Role adminRole = Role.builder().id(1L).roleName("ADMIN").build();
        Role hrRole = Role.builder().id(3L).roleName("HR").build();
        // current roles: USER only
        Role current = Role.builder().id(2L).roleName("USER").build();
        UserRole currentLink = UserRole.builder().user(user).role(current).build();
        given(userRoleRepository.findByUser(user)).willReturn(List.of(currentLink));

        given(roleRepository.findByRoleName("ADMIN")).willReturn(Optional.of(adminRole));
        given(roleRepository.findByRoleName("HR")).willReturn(Optional.of(hrRole));

        AssignRolesRequest req = new AssignRolesRequest(List.of("ADMIN","HR"), null, null);
        Jwt jwt = Jwt.withTokenValue("tkn").header("alg","none").claim("email","manager@example.com").build();

        adminUserService.assignRolesToUser(100L, req, jwt);

        // removed USER
        verify(userRoleRepository).delete(eq(currentLink));
        // added ADMIN and HR
        verify(userRoleRepository, times(2)).save(any(UserRole.class));
        // Cognito sync for allowed groups ADMIN/USER only -> expect add ADMIN and remove USER, HR ignored
        verify(cognitoAdminService).addUserToGroup(eq("john"), eq("ADMIN"));
        verify(cognitoAdminService).removeUserFromGroup(eq("john"), eq("USER"));
        verifyNoMoreInteractions(cognitoAdminService);
    }
}
