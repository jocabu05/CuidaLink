package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

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
    
    @Column(name = "ruta_geojson", columnDefinition = "JSON")
    private String rutaGeojson;
    
    @Column(name = "distancia_km", precision = 4, scale = 2)
    private BigDecimal distanciaKm;
    
    @Column
    @Builder.Default
    private Boolean activo = true;
}
