package com.staffmanagement.authservice.service;

import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CognitoUserService {

    private final AppUserRepository appUserRepository;

    @Transactional
    public AppUser processOAuthPostLogin(OAuth2User oAuth2User) {
        String cognitoSub = oAuth2User.getAttribute("sub");

        return appUserRepository.findByCognitoSub(cognitoSub)
                .orElseGet(() -> {
                    AppUser newUser = AppUser.builder()
                            .cognitoSub(cognitoSub)
                            .email(oAuth2User.getAttribute("email"))
                            .username(oAuth2User.getAttribute("username"))
                            .displayName(oAuth2User.getAttribute("name"))
                            .isActive(true)
                            .emailVerified(Boolean.TRUE.equals(oAuth2User.getAttribute("email_verified")))
                            .build();
                    return appUserRepository.save(newUser); 
                });
    }
}
