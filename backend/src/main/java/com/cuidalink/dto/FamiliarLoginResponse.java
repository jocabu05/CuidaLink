package com.cuidalink.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

/**
 * DTO de respuesta de login exitoso para familiares.
 * Contiene el JWT y datos del perfil (nombre, email, parentesco).
 */
@Data
@AllArgsConstructor
@Builder
public class FamiliarLoginResponse {
    private String token;
    private Long familiarId;
    private String nombre;
    private String email;
    private String parentesco;
}
