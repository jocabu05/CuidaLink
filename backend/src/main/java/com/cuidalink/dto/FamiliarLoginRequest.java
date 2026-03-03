package com.cuidalink.dto;

import lombok.Data;

/**
 * DTO de petición de login para familiares.
 * - email: identificador único
 * - password: contraseña (se compara con hash BCrypt)
 */
@Data
public class FamiliarLoginRequest {
    private String email;
    private String password;
}
