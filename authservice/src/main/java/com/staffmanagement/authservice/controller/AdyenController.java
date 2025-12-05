package com.staffmanagement.authservice.controller;

import com.staffmanagement.authservice.dto.request.AdyenPaymentRequest;
import com.staffmanagement.authservice.dto.response.AdyenPaymentResponse;
import com.staffmanagement.authservice.payment.AdyenService;
import com.staffmanagement.authservice.dto.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments/adyen")
public class AdyenController {

    private final AdyenService adyenService;

    public AdyenController(AdyenService adyenService) {
        this.adyenService = adyenService;
    }

    @PostMapping("/initiate")
    public ResponseEntity<ApiResponse> initiate(@RequestBody AdyenPaymentRequest request) {
        try {
            AdyenPaymentResponse resp = adyenService.initiatePayment(request);
            return ResponseEntity.ok(new ApiResponse(true, "Payment initiated", resp));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new ApiResponse(false, "Payment initiation failed: " + e.getMessage(), null));
        }
    }
}
