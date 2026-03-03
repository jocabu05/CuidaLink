package com.cuidalink.dto;

import lombok.Data;

/**
 * DTO de petición de registro de nuevo familiar.
 * - nombre: nombre completo (obligatorio)
 * - email: debe ser único y contener @
 * - password: mínimo 6 caracteres
 * - parentesco: relación con el paciente ("Hija", "Hijo"...)
 * - codigoInvitacion: código para vincular con un paciente (futuro)
 */
@Data
public class FamiliarRegisterRequest {
    private String nombre;
    private String email;
    private String telefono;
    private String parentesco;
    private String password;
    private String codigoInvitacion;
}
