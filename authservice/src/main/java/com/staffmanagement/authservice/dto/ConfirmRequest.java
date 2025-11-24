package com.staffmanagement.authservice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public record ConfirmRequest(String email,
							 @JsonProperty("confirmationCode") @JsonAlias("code") String confirmationCode) {
}
