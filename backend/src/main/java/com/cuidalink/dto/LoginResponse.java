package com.cuidalink.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO de respuesta de login exitoso para cuidadoras.
 * Contiene el token JWT y los datos básicos del perfil.
 */
@Data
@AllArgsConstructor
@Builder
public class LoginResponse {
    private String token;
    private Long cuidadoraId;
    private String nombre;
    private String telefono;
    private String fotoPerfil;
    private BigDecimal rating;
}
