package com.cuidalink.dto;

import lombok.Data;

@Data
public class FamiliarRegisterRequest {
    private String nombre;
    private String email;
    private String telefono;
    private String parentesco;
    private String password;
    private String codigoInvitacion;
}
