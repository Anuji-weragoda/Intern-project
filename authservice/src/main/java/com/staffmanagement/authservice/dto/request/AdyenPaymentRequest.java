package com.staffmanagement.authservice.dto.request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public class AdyenPaymentRequest {
    // preferred shape used by server
    private String amountCurrency;
    private Long amountValue;

    // alternative shape often used by clients (amount as top-level, currency top-level)
    private String amount;
    private String currency;

    private String reference;
    private String returnUrl;
    private String paymentMethodType;
    private String merchantAccount;

    public String getAmountCurrency() {
        return amountCurrency != null ? amountCurrency : currency;
    }

    public void setAmountCurrency(String amountCurrency) {
        this.amountCurrency = amountCurrency;
    }

    public Long getAmountValue() {
        return amountValue;
    }

    public void setAmountValue(Long amountValue) {
        this.amountValue = amountValue;
    }

    public String getAmount() {
        return amount;
    }

    @JsonProperty("amount")
    public void setAmount(String amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    @JsonProperty("currency")
    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getReturnUrl() {
        return returnUrl;
    }

    public void setReturnUrl(String returnUrl) {
        this.returnUrl = returnUrl;
    }

    public String getPaymentMethodType() {
        return paymentMethodType;
    }

    public void setPaymentMethodType(String paymentMethodType) {
        this.paymentMethodType = paymentMethodType;
    }

    public String getMerchantAccount() {
        return merchantAccount;
    }

    @JsonProperty("merchantAccount")
    public void setMerchantAccount(String merchantAccount) {
        this.merchantAccount = merchantAccount;
    }

    /**
     * Resolve to a minor-unit long value expected by Adyen.
     * If explicit amountValue provided, return it. Otherwise try to parse top-level amount
     * and convert to minor units by multiplying by 100 (common currencies).
     */
    public Long resolveAmountValue() {
        if (amountValue != null) return amountValue;
        if (amount == null) return null;
        try {
            BigDecimal a = new BigDecimal(amount);
            return a.multiply(BigDecimal.valueOf(100)).longValue();
        } catch (Exception e) {
            return null;
        }
    }
}
