package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "eventos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evento {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "abuelo_id")
    private Abuelo abuelo;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuidadora_id")
    private Cuidadora cuidadora;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoEvento tipo;
    
    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    
    @Column(name = "foto_base64", columnDefinition = "LONGTEXT")
    private String fotoBase64;
    
    @Column(name = "gps_lat", precision = 10)
    private Double gpsLat;
    
    @Column(name = "gps_lng", precision = 11)
    private Double gpsLng;
    
    @Column
    @Builder.Default
    private Boolean verificado = false;
    
    @Column(name = "datos_extra", columnDefinition = "JSON")
    private String datosExtra;
    
    @Column(length = 255)
    private String descripcion;
    
    public enum TipoEvento {
        LLEGADA,
        PASTILLA,
        COMIDA,
        PASEO,
        SIESTA,
        CAIDA,
        SALIDA,
        FUGA
    }
}
