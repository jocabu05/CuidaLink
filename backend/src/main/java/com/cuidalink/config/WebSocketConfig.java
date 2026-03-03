package com.cuidalink.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuración de WebSocket con STOMP para comunicación en tiempo real.
 * 
 * Se usa para:
 * - Notificar a familiares cuando la cuidadora registra un evento
 * - Alertas de emergencia (caídas, fugas)
 * - Mensajes de chat en tiempo real
 * 
 * Canales:
 * - /topic/familia/{id}: eventos y alertas para un familiar específico
 * - /topic/emergencias: canal global de emergencias
 * - /app/*: prefijo para mensajes del cliente al servidor
 * 
 * Endpoint WebSocket: /ws (con soporte SockJS como fallback)
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Prefijo para mensajes que van a clientes
        config.enableSimpleBroker("/topic", "/queue");
        // Prefijo para mensajes que vienen de clientes
        config.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
        
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }
}
