package com.staffmanagement.authservice.seed;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.Role;
import com.staffmanagement.authservice.entity.UserRole;
import com.staffmanagement.authservice.repository.AppUserRepository;
import com.staffmanagement.authservice.repository.RoleRepository;
import com.staffmanagement.authservice.repository.UserRoleRepository;

@Component
public class SeedData implements CommandLineRunner {

    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    public SeedData(AppUserRepository userRepository, RoleRepository roleRepository, UserRoleRepository userRoleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Check if roles already exist and create if missing
        // Store canonical role names in DB WITHOUT the Spring Security "ROLE_" prefix
        Role adminRole = roleRepository.findByRoleName("ADMIN")
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .roleName("ADMIN")
                        .description("Administrator role")
                        .isSystemRole(true)
                        .build()));

        Role userRole = roleRepository.findByRoleName("USER")
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .roleName("USER")
                        .description("Regular user role")
                        .isSystemRole(false)
                        .build()));

        // Check if users already exist and create if missing
        AppUser user1 = userRepository.findByUsername("alice")
                .orElseGet(() -> userRepository.save(AppUser.builder()
                        .cognitoSub("sub-001")
                        .email("alice@example.com")
                        .username("alice")
                        .displayName("Alice Johnson")
                        .isActive(true)
                        .build()));

        AppUser user2 = userRepository.findByUsername("bob")
                .orElseGet(() -> userRepository.save(AppUser.builder()
                        .cognitoSub("sub-002")
                        .email("bob@example.com")
                        .username("bob")
                        .displayName("Bob Smith")
                        .isActive(true)
                        .build()));

        // Assign roles only if not already assigned
        if (userRoleRepository.findByUserAndRole(user1, adminRole).isEmpty()) {
            UserRole ur1 = userRoleRepository.save(UserRole.builder()
                    .user(user1)
                    .role(adminRole)
                    .assignedBy("system")
                    .build());
            user1.getUserRoles().add(ur1);
            adminRole.getUserRoles().add(ur1);
        }

        if (userRoleRepository.findByUserAndRole(user2, userRole).isEmpty()) {
            UserRole ur2 = userRoleRepository.save(UserRole.builder()
                    .user(user2)
                    .role(userRole)
                    .assignedBy("system")
                    .build());
            user2.getUserRoles().add(ur2);
            userRole.getUserRoles().add(ur2);
        }

        System.out.println("Seed data inserted successfully (only if missing)!");
    }
}
