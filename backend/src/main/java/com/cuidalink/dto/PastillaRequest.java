package com.cuidalink.dto;

import lombok.Data;

/**
 * DTO de petición de registro de medicamento.
 * - abueloId: paciente
 * - fotoBase64: foto de la pastilla/caja
 * - medicamento: nombre del medicamento
 * - ocrTexto: texto detectado por OCR en la caja
 * - verificadoOcr: true si el OCR confirmó que es el medicamento correcto
 */
@Data
public class PastillaRequest {
    private Long abueloId;
    private String fotoBase64;
    private String medicamento;
    private String ocrTexto;
    private Boolean verificadoOcr;
}
