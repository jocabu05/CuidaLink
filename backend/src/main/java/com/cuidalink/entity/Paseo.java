package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entidad JPA que representa un paseo con tracking GPS.
 * 
 * Campos:
 * - abuelo: paciente que realiza el paseo (FK ManyToOne)
 * - cuidadora: profesional que acompaña (FK ManyToOne)
 * - inicio, fin: timestamps de inicio y fin del paseo
 * - rutaGeojson: ruta completa en formato GeoJSON (array de coordenadas)
 * - distanciaKm: distancia total recorrida en kilómetros
 * - activo: true mientras el paseo está en curso (solo 1 activo por cuidadora)
 */
@Entity
@Table(name = "paseos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Paseo {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "abuelo_id")
    private Abuelo abuelo;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuidadora_id")
    private Cuidadora cuidadora;
    
    @Column
    private LocalDateTime inicio;
    
    @Column
    private LocalDateTime fin;
    
    @Column(name = "ruta_geojson", columnDefinition = "TEXT")
    private String rutaGeojson;
    
    @Column(name = "distancia_km", precision = 4, scale = 2)
    private BigDecimal distanciaKm;
    
    @Column
    @Builder.Default
    private Boolean activo = true;
}
