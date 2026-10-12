package com.kcalog.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record TossLoginRequest(@NotBlank String code) {
}
