package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Entidad JPA que representa a una cuidadora profesional.
 * 
 * Campos principales:
 * - nombre: nombre completo de la cuidadora
 * - telefono: número único usado como identificador de login
 * - pin: código de 4 dígitos hasheado con BCrypt para autenticación
 * - fotoPerfil: imagen en Base64
 * - ratingPromedio: media de valoraciones (1-5 estrellas)
 * - totalRatings: cantidad total de valoraciones recibidas
 * - activo: si la cuenta está habilitada o desactivada
 * - eventos: relación 1:N con los eventos que ha registrado
 * - ratings: relación 1:N con las valoraciones recibidas
 */
@Entity
@Table(name = "cuidadoras")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cuidadora {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String nombre;
    
    @Column(unique = true, length = 15)
    private String telefono;
    
    @Column(length = 60)
    private String pin;
    
    @Column(name = "foto_perfil", columnDefinition = "TEXT")
    private String fotoPerfil;
    
    @Column(name = "rating_promedio", precision = 2, scale = 1)
    @Builder.Default
    private BigDecimal ratingPromedio = BigDecimal.ZERO;
    
    @Column(name = "total_ratings")
    @Builder.Default
    private Integer totalRatings = 0;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @OneToMany(mappedBy = "cuidadora", cascade = CascadeType.ALL)
    private List<Evento> eventos;
    
    @OneToMany(mappedBy = "cuidadora", cascade = CascadeType.ALL)
    private List<Rating> ratings;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
