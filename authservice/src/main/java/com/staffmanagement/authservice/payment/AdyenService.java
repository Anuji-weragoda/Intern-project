package com.staffmanagement.authservice.payment;

import com.staffmanagement.authservice.config.AdyenProperties;
import com.staffmanagement.authservice.dto.request.AdyenPaymentRequest;
import com.staffmanagement.authservice.dto.response.AdyenPaymentResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class AdyenService {

    private static final Logger log = LoggerFactory.getLogger(AdyenService.class);

    private final AdyenProperties properties;
    private final RestTemplate restTemplate = new RestTemplate();

    public AdyenService(AdyenProperties properties) {
        this.properties = properties;
    }

    public AdyenPaymentResponse initiatePayment(AdyenPaymentRequest request) {

        if (properties.getApiKey() == null || properties.getApiKey().isEmpty()) {
            log.error("Adyen API key is not configured (adyen.apiKey)");
            throw new IllegalStateException("Adyen API key is not configured");
        }

        
        String url = properties.getCheckoutUrl() + "/sessions";

        // -------- Build Body --------
        Map<String, Object> body = new HashMap<>();
        Map<String, Object> amount = new HashMap<>();

        Long minorValue = request.resolveAmountValue();
        if (minorValue == null && request.getAmountValue() != null) {
            minorValue = request.getAmountValue();
        }

        amount.put("currency", request.getAmountCurrency());
        amount.put("value", minorValue);
        body.put("amount", amount);

        body.put("reference", request.getReference());

        // Merchant account (client can override)
        String merchant = request.getMerchantAccount() != null
                ? request.getMerchantAccount()
                : properties.getMerchantAccount();
        body.put("merchantAccount", merchant);

        body.put("returnUrl", request.getReturnUrl());

        // -------- Headers --------
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-Key", properties.getApiKey());

        log.debug("Creating Adyen SESSION at {} merchantAccount={} amount={} {} reference={}",
                url, merchant, minorValue, request.getAmountCurrency(), request.getReference());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(url, entity, Map.class);
            log.debug("Adyen SESSION response status={} body={}",
                    resp.getStatusCodeValue(), resp.getBody());
            return new AdyenPaymentResponse(resp.getBody());

        } catch (HttpStatusCodeException ex) {
            String respBody = ex.getResponseBodyAsString();
            int status = ex.getRawStatusCode();
            log.error("Adyen API error: status={} body={}", status, respBody);
            throw new RuntimeException("Adyen API error: " + status + " - " + respBody);

        } catch (Exception ex) {
            log.error("Unexpected error when calling Adyen", ex);
            throw new RuntimeException("Unexpected error: " + ex.getMessage(), ex);
        }
    }
}
