package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "notas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Nota {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String texto;

    @Column(nullable = false)
    private String autor; // "familiar" or "cuidadora"

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private boolean leida = false;

    @Column(nullable = false)
    private String prioridad = "normal"; // "normal" or "urgente"

    @Column(nullable = false)
    private Long abueloId = 1L;

    @PrePersist
    public void prePersist() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
