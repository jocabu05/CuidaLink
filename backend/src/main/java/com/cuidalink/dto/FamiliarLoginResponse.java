package com.cuidalink.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

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
