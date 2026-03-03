package com.cuidalink.controller;

import com.cuidalink.entity.MensajeChat;
import com.cuidalink.repository.MensajeChatRepository;
import com.cuidalink.service.WebSocketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {
    
    private final MensajeChatRepository mensajeChatRepository;
    private final WebSocketService webSocketService;
    
    @PostMapping("/send")
    public ResponseEntity<?> enviarMensaje(@RequestBody Map<String, Object> body) {
        String from = (String) body.get("from");
        String text = (String) body.getOrDefault("text", "").toString();
        Long abueloId = Long.valueOf(body.get("abueloId").toString());
        String type = (String) body.getOrDefault("type", "text");
        String audioBase64 = (String) body.get("audioBase64");
        Integer audioDuration = body.get("audioDuration") != null 
                ? Integer.valueOf(body.get("audioDuration").toString()) : null;
        String imageBase64 = (String) body.get("imageBase64");
        
        MensajeChat mensaje = MensajeChat.builder()
                .abueloId(abueloId)
                .from(from)
                .text(text)
                .type(type)
                .audioBase64(audioBase64)
                .audioDuration(audioDuration)
                .imageBase64(imageBase64)
                .timestamp(LocalDateTime.now())
                .leido(false)
                .build();
        
        MensajeChat saved = mensajeChatRepository.save(mensaje);
        
        // Notificar por WebSocket al destinatario
        String notifText = "audio".equals(type) ? "\uD83C\uDFA4 Nota de voz" 
                : "image".equals(type) ? "\uD83D\uDCF7 Foto" : text;
        webSocketService.notificarMensaje(abueloId, from, notifText);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "id", saved.getId().toString(),
                "timestamp", saved.getTimestamp().toString()
        ));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarMensaje(@PathVariable Long id) {
        if (!mensajeChatRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        mensajeChatRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "deleted", id));
    }
    
    @GetMapping("/messages")
    public ResponseEntity<List<MensajeChat>> getMensajes(@RequestParam(defaultValue = "1") Long abueloId) {
        List<MensajeChat> mensajes = mensajeChatRepository.findTop100ByAbueloIdOrderByTimestampDesc(abueloId);
        Collections.reverse(mensajes); // Devolver en orden cronológico
        return ResponseEntity.ok(mensajes);
    }
}
