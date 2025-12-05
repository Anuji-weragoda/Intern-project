package com.staffmanagement.authservice.dto.response;

import java.util.Map;

public class AdyenPaymentResponse {
    private Map<String, Object> rawResponse;

    public AdyenPaymentResponse() {
    }

    public AdyenPaymentResponse(Map<String, Object> rawResponse) {
        this.rawResponse = rawResponse;
    }

    public Map<String, Object> getRawResponse() {
        return rawResponse;
    }

    public void setRawResponse(Map<String, Object> rawResponse) {
        this.rawResponse = rawResponse;
    }
}
