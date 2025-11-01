package com.staffmanagement.authservice.config;

import com.staffmanagement.authservice.handler.CognitoLogoutHandler;
import com.staffmanagement.authservice.handler.CognitoOAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfiguration {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfiguration.class);
    private final CognitoOAuth2SuccessHandler cognitoOAuth2SuccessHandler;
    private final CognitoLogoutHandler cognitoLogoutHandler;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> {})
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/", "/public/**", "/healthz").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN") 
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .successHandler(cognitoOAuth2SuccessHandler)
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            )
            .logout(logout -> logout
            .logoutUrl("/logout")                
            .logoutSuccessUrl("/")                
            .addLogoutHandler(cognitoLogoutHandler) 
            .permitAll()                         
        );

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthoritiesClaimName("cognito:groups"); 
        authoritiesConverter.setAuthorityPrefix("ROLE_");               

        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
        jwtConverter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);

        log.info("Configured JWT converter: using 'cognito:groups' with ROLE_ prefix");
        return jwtConverter;
    }

    @Bean
    public LogoutHandler defaultLogoutHandler() {
        return cognitoLogoutHandler;
    }

    
}
