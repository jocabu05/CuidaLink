package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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
