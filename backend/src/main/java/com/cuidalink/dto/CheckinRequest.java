package com.cuidalink.dto;

import lombok.Data;

/**
 * DTO de petición de check-in (llegada al domicilio).
 * - abueloId: paciente asignado
 * - selfieBase64: foto de verificación en Base64
 * - lat, lng: coordenadas GPS actuales (para verificar geofence)
 */
@Data
public class CheckinRequest {
    private Long abueloId;
    private String selfieBase64;
    private Double lat;
    private Double lng;
}
