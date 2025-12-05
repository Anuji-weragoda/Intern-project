package com.staffmanagement.authservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AdyenProperties {
    @Value("${adyen.apiKey:}")
    private String apiKey;

    @Value("${adyen.merchantAccount:}")
    private String merchantAccount;

    @Value("${adyen.checkoutUrl:https://checkout-test.adyen.com/v71}")
    private String checkoutUrl;

    public String getApiKey() {
        return apiKey;
    }

    public String getMerchantAccount() {
        return merchantAccount;
    }

    public String getCheckoutUrl() {
        return checkoutUrl;
    }
}
