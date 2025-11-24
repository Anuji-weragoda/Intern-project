package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.dto.LoginRequest;
import com.staffmanagement.authservice.dto.LoginResponse;
import com.staffmanagement.authservice.dto.SignupRequest;
import com.staffmanagement.authservice.dto.SignupResponse;
import com.staffmanagement.authservice.dto.ConfirmRequest;
import com.staffmanagement.authservice.dto.ResendRequest;
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

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        try {
            String fullName = request.fullName();
            String givenName = null;
            String familyName = null;
            if (fullName != null && !fullName.isBlank()) {
                String[] parts = fullName.trim().split("\\s+", 2);
                givenName = parts[0];
                if (parts.length > 1) familyName = parts[1];
            }

            SignupResponse resp = cognitoAuthService.signUp(request.email(), request.password(), givenName, familyName);
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@RequestBody ConfirmRequest request) {
        try {
            SignupResponse resp = cognitoAuthService.confirmSignUp(request.email(), request.confirmationCode());
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/resend")
    public ResponseEntity<?> resend(@RequestBody ResendRequest request) {
        try {
            SignupResponse resp = cognitoAuthService.resendConfirmation(request.email());
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}
