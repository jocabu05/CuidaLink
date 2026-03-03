package com.cuidalink.dto;

import lombok.Data;

/**
 * DTO de petición de login para cuidadoras.
 * - telefono: número de teléfono (identificador único)
 * - pin: código de 4 dígitos
 */
@Data
public class LoginRequest {
    private String telefono;
    private String pin;
}
