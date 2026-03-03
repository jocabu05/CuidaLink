package com.cuidalink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mensajes_chat")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MensajeChat {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "abuelo_id", nullable = false)
    private Long abueloId;
    
    @Column(name = "remitente", nullable = false, length = 20)
    private String from; // "cuidadora" o "familiar"
    
    @Column(nullable = false, length = 1000)
    private String text;
    
    /** "text", "audio" o "image" */
    @Column(nullable = false, length = 10)
    @Builder.Default
    private String type = "text";
    
    /** Audio en base64 (solo cuando type=audio) */
    @Column(columnDefinition = "LONGTEXT")
    private String audioBase64;
    
    /** Duración del audio en segundos */
    private Integer audioDuration;
    
    /** Imagen en base64 (solo cuando type=image) */
    @Column(columnDefinition = "LONGTEXT")
    private String imageBase64;
    
    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    
    @Column
    @Builder.Default
    private Boolean leido = false;
}
