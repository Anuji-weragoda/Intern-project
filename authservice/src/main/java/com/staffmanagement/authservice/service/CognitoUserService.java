package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.repository.AppUserRepository;
import com.staffmanagement.authservice.repository.RoleRepository;
import com.staffmanagement.authservice.repository.UserRoleRepository;
import com.staffmanagement.authservice.entity.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CognitoUserService {

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final CognitoAdminService cognitoAdminService;

    @Value("${cognito.allowed-groups:}")
    private String allowedGroupsCsv;

    @Value("${cognito.sync-groups:true}")
    private boolean cognitoSyncGroups;

    @Transactional
    public AppUser processOAuthPostLogin(OAuth2User oAuth2User) {
        String cognitoSub = oAuth2User.getAttribute("sub");

        return appUserRepository.findByCognitoSub(cognitoSub)
                .orElseGet(() -> {
            // try several attributes for the Cognito username (sometimes available as 'cognito:username')
            String usernameAttr = oAuth2User.getAttribute("username");
            if (usernameAttr == null) {
            usernameAttr = oAuth2User.getAttribute("cognito:username");
            }
            // fallback to email if username not present
            String emailAttr = oAuth2User.getAttribute("email");
            String finalUsername = usernameAttr != null ? usernameAttr : emailAttr;

            AppUser newUser = AppUser.builder()
                .cognitoSub(cognitoSub)
                .email(emailAttr)
                .username(finalUsername)
                .displayName(oAuth2User.getAttribute("name"))
                            .isActive(true)
                            .emailVerified(Boolean.TRUE.equals(oAuth2User.getAttribute("email_verified")))
                            .build();

                    AppUser saved = appUserRepository.save(newUser);

                    // Ensure default USER role is assigned
                    try {
                        roleRepository.findByRoleName("USER").ifPresent(role -> {
                            // Only assign if not already present (shouldn't be)
                            if (userRoleRepository.findByUserAndRole(saved, role).isEmpty()) {
                                UserRole ur = new UserRole();
                                ur.setUser(saved);
                                ur.setRole(role);
                                ur.setAssignedBy(oAuth2User.getAttribute("email"));
                                userRoleRepository.save(ur);
                            }
                        });
                    } catch (Exception e) {
                        // log and continue silently - user created but role assign failed
                    }

                    // If configured, add the new user to the Cognito USER group
                    try {
                        if (cognitoSyncGroups) {
                            Set<String> allowedGroups = Arrays.stream((allowedGroupsCsv == null ? "" : allowedGroupsCsv).split(","))
                                    .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toSet());

                            if (allowedGroups.contains("USER")) {
                                String username = saved.getCognitoSub() != null && !saved.getCognitoSub().isBlank()
                                        ? saved.getCognitoSub()
                                        : (saved.getUsername() != null && !saved.getUsername().isBlank() ? saved.getUsername() : saved.getEmail());
                                if (username != null) {
                                    cognitoAdminService.addUserToGroup(username, "USER");
                                }
                            }
                        }
                    } catch (Exception ex) {
                        // don't fail user creation if Cognito sync fails
                    }

                    return saved;
                });
    }
}
