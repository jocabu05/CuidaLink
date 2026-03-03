package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "familiares")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Familiar {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String nombre;
    
    @Column(unique = true, length = 100)
    private String email;
    
    @Column(length = 15)
    private String telefono;
    
    @Column(length = 60, nullable = false)
    private String password;
    
    @Column(name = "parentesco", length = 50)
    private String parentesco;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
