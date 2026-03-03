package com.cuidalink.dto;

import lombok.Data;
import java.util.List;

@Data
public class PaseoRequest {
    private Long abueloId;
    private List<GpsPoint> ruta;
    private Double distanciaKm;
    
    @Data
    public static class GpsPoint {
        private Double lat;
        private Double lng;
        private Long timestamp;
    }
}
