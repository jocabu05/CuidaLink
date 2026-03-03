package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entidad JPA que representa un evento/actividad registrada durante el cuidado.
 * Es la tabla central del sistema — cada acción de la cuidadora queda registrada aquí.
 * 
 * Campos principales:
 * - abuelo: paciente al que pertenece el evento (FK, relación ManyToOne LAZY)
 * - cuidadora: profesional que registró el evento (FK, relación ManyToOne LAZY)
 * - tipo: tipo de evento (enum TipoEvento: LLEGADA, PASTILLA, COMIDA, PASEO, SIESTA, CAIDA, SALIDA, FUGA)
 * - timestamp: fecha y hora exacta del evento
 * - fotoBase64: foto verificadora en Base64 (selfie de llegada, foto de pastilla...)
 * - gpsLat, gpsLng: coordenadas GPS en el momento del evento
 * - verificado: si el evento fue verificado automáticamente (geofence o OCR)
 * - datosExtra: JSON con datos adicionales (nombre medicamento, texto OCR...)
 * - descripcion: texto descriptivo del evento
 * 
 * TipoEvento:
 *   LLEGADA  → Check-in con selfie y GPS (verifica geofence)
 *   PASTILLA → Administración de medicamento (con verificación OCR)
 *   COMIDA   → Preparación/servicio de comida (con foto)
 *   PASEO    → Paseo completado con tracking GPS
 *   SIESTA   → Registro de siesta/descanso
 *   CAIDA    → Detección de caída (emergencia, notifica familia)
 *   SALIDA   → Fin de la jornada de cuidado
 *   FUGA     → Paciente fuera de zona segura (alerta máxima)
 */
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
