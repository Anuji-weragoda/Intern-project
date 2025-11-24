package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.dto.ConfirmRequest;
import com.staffmanagement.authservice.dto.ResendRequest;
import com.staffmanagement.authservice.dto.SignupResponse;
import com.staffmanagement.authservice.service.CognitoAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;

@RestController
@RequestMapping("/auth") // legacy paths used by mobile client
public class LegacyAuthController {

    private final CognitoAuthService cognitoAuthService;

    @Autowired
    public LegacyAuthController(CognitoAuthService cognitoAuthService) {
        this.cognitoAuthService = cognitoAuthService;
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@RequestBody ConfirmRequest request) {
        try {
            SignupResponse resp = cognitoAuthService.confirmSignUp(request.email(), request.confirmationCode());
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/resend")
    public ResponseEntity<?> resend(@RequestBody ResendRequest request) {
        try {
            SignupResponse resp = cognitoAuthService.resendConfirmation(request.email());
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}
