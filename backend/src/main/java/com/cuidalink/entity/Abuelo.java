package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "abuelos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Abuelo {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String nombre;
    
    @Column(length = 255)
    private String direccion;
    
    @Column(precision = 10)
    private Double lat;
    
    @Column(precision = 11)
    private Double lng;
    
    @Column(name = "familiar_id")
    private Long familiarId;
    
    @Column(name = "telefono_emergencia", length = 15)
    private String telefonoEmergencia;
    
    @Column(name = "foto_perfil", columnDefinition = "LONGTEXT")
    private String fotoPerfil;
    
    @Column(name = "notas_medicas", columnDefinition = "TEXT")
    private String notasMedicas;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @OneToMany(mappedBy = "abuelo", cascade = CascadeType.ALL)
    private List<Evento> eventos;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
