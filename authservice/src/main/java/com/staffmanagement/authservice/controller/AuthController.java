package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.dto.LoginRequest;
import com.staffmanagement.authservice.dto.LoginResponse;
import com.staffmanagement.authservice.service.CognitoAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final CognitoAuthService cognitoAuthService;

    @Autowired
    public AuthController(CognitoAuthService cognitoAuthService) {
        this.cognitoAuthService = cognitoAuthService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse resp = cognitoAuthService.authenticate(request.email(), request.password());
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}
