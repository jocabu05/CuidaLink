package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "citas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Cita {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String titulo;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private LocalTime hora;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoCita tipo = TipoCita.OTRO;

    @Column(length = 500)
    private String notas;

    @Column(nullable = false)
    private String creadoPor; // "cuidadora" or "familiar"

    @Column(nullable = false)
    private Long abueloId = 1L;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public enum TipoCita {
        CITA_MEDICA,
        MEDICAMENTO,
        ACTIVIDAD,
        VISITA,
        OTRO
    }
}
