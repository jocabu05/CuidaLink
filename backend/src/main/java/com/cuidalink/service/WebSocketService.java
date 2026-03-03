package com.cuidalink.service;

import com.cuidalink.entity.Evento;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketService {
    
    private final SimpMessagingTemplate messagingTemplate;
    
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    
    public void notificarEvento(Long familiarId, Evento evento) {
        if (familiarId == null) {
            log.warn("No se puede notificar: familiarId es null");
            return;
        }
        
        Map<String, Object> mensaje = new HashMap<>();
        mensaje.put("tipo", "EVENTO");
        mensaje.put("eventoTipo", evento.getTipo().name());
        mensaje.put("hora", evento.getTimestamp().format(TIME_FORMATTER));
        mensaje.put("descripcion", evento.getDescripcion());
        mensaje.put("verificado", evento.getVerificado());
        mensaje.put("abueloId", evento.getAbuelo() != null ? evento.getAbuelo().getId() : null);
        mensaje.put("cuidadoraNombre", evento.getCuidadora() != null ? evento.getCuidadora().getNombre() : null);
        
        if (evento.getFotoBase64() != null) {
            mensaje.put("tieneFoto", true);
        }
        
        if (evento.getGpsLat() != null && evento.getGpsLng() != null) {
            mensaje.put("gps", Map.of("lat", evento.getGpsLat(), "lng", evento.getGpsLng()));
        }
        
        String destino = "/topic/familia/" + familiarId;
        messagingTemplate.convertAndSend(destino, mensaje);
        
        log.info("Notificación enviada a {}: {}", destino, evento.getTipo());
    }
    
    public void notificarEmergencia(Long familiarId, Evento evento) {
        if (familiarId == null) {
            log.warn("No se puede notificar emergencia: familiarId es null");
            return;
        }
        
        Map<String, Object> mensaje = new HashMap<>();
        mensaje.put("tipo", "EMERGENCIA");
        mensaje.put("eventoTipo", evento.getTipo().name());
        mensaje.put("hora", evento.getTimestamp().format(TIME_FORMATTER));
        mensaje.put("descripcion", evento.getDescripcion());
        mensaje.put("urgente", true);
        
        if (evento.getGpsLat() != null && evento.getGpsLng() != null) {
            mensaje.put("gps", Map.of("lat", evento.getGpsLat(), "lng", evento.getGpsLng()));
        }
        
        String destino = "/topic/familia/" + familiarId;
        messagingTemplate.convertAndSend(destino, mensaje);
        
        // También enviar a canal de emergencias global
        messagingTemplate.convertAndSend("/topic/emergencias", mensaje);
        
        log.warn("⚠️ EMERGENCIA notificada a {}: {}", destino, evento.getDescripcion());
    }
    
    public void notificarMensaje(Long familiarId, String remitente, String contenido) {
        Map<String, Object> mensaje = new HashMap<>();
        mensaje.put("tipo", "CHAT");
        mensaje.put("remitente", remitente);
        mensaje.put("contenido", contenido);
        
        String destino = "/topic/chat/" + familiarId;
        messagingTemplate.convertAndSend(destino, mensaje);
    }
}
