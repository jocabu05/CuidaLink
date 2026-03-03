package com.cuidalink.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@Builder
public class RatingResponse {
    private Long cuidadoraId;
    private String nombreCuidadora;
    private BigDecimal promedioEstrellas;
    private Integer totalRatings;
    private List<RatingItem> ultimosRatings;
    
    @Data
    @AllArgsConstructor
    @Builder
    public static class RatingItem {
        private Integer estrellas;
        private String comentario;
        private LocalDateTime fecha;
        private String nombreFamiliar;
    }
}
