package com.cuidalink.dto;

import lombok.Data;
import java.util.List;

/**
 * DTO para finalizar un paseo con la ruta GPS completa.
 * - abueloId: paciente
 * - ruta: lista de puntos GPS con timestamp (para dibujar la ruta en el mapa)
 * - distanciaKm: distancia total calculada en el móvil
 * 
 * GpsPoint: cada punto contiene lat, lng y timestamp (milisegundos epoch)
 */
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
