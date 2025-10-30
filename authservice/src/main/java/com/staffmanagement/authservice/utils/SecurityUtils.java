package com.staffmanagement.authservice.utils;

import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.Role;
import com.staffmanagement.authservice.repository.AppUserRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {
    private final AppUserRepository appUserRepository;

    public SecurityUtils(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    public boolean hasAdminRole(Jwt jwt) {
        AppUser user = getCurrentUser(jwt);
        return user != null && user.getRoles().stream()
                .map(Role::getRoleName)
                .anyMatch(roleName -> roleName.equals("ADMIN"));
    }

    public AppUser getCurrentUser(Jwt jwt) {
        String sub = jwt.getSubject();
        return appUserRepository.findByCognitoSub(sub)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}