package com.cuidalink.dto;

import lombok.Data;

@Data
public class PastillaRequest {
    private Long abueloId;
    private String fotoBase64;
    private String medicamento;
    private String ocrTexto;
    private Boolean verificadoOcr;
}
