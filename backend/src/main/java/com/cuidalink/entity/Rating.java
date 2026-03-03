package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entidad JPA que representa una valoración de un familiar hacia una cuidadora.
 * 
 * Campos:
 * - cuidadora: la profesional valorada (FK ManyToOne)
 * - abuelo: el paciente relacionado (FK ManyToOne)
 * - familiarId: ID del familiar que hizo la valoración
 * - estrellas: puntuación de 1 a 5
 * - comentario: texto explicativo opcional
 * - fecha: momento de la valoración (automático)
 */
@Entity
@Table(name = "ratings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rating {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuidadora_id")
    private Cuidadora cuidadora;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "abuelo_id")
    private Abuelo abuelo;
    
    @Column(name = "familiar_id")
    private Long familiarId;
    
    @Column(nullable = false)
    private Integer estrellas;
    
    @Column(columnDefinition = "TEXT")
    private String comentario;
    
    @Column
    @Builder.Default
    private LocalDateTime fecha = LocalDateTime.now();
}
