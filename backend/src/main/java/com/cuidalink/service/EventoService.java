package com.cuidalink.service;

import com.cuidalink.dto.CheckinRequest;
import com.cuidalink.dto.PastillaRequest;
import com.cuidalink.entity.Abuelo;
import com.cuidalink.entity.Cuidadora;
import com.cuidalink.entity.Evento;
import com.cuidalink.repository.AbueloRepository;
import com.cuidalink.repository.CuidadoraRepository;
import com.cuidalink.repository.EventoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Servicio central que registra TODOS los tipos de eventos de cuidado.
 * Cada evento se persiste en BD y se notifica en tiempo real vía WebSocket.
 * 
 * Métodos principales:
 * - registrarCheckin(): Check-in con selfie + GPS. Verifica geofence (200m del domicilio).
 * - registrarPastilla(): Medicamento con foto + OCR. Almacena datos de verificación en JSON.
 * - registrarComida(): Comida con foto verificadora.
 * - registrarSiesta(): Registro de siesta/descanso.
 * - registrarCaida(): Alerta de emergencia con GPS. Notifica por canal urgente.
 * - registrarSalida(): Fin de jornada.
 * 
 * Geofencing: Usa fórmula Haversine para calcular distancia GPS.
 *   Si la cuidadora está a <200m del domicilio → verificado=true.
 */
@Service
@RequiredArgsConstructor
public class EventoService {
    
    private final EventoRepository eventoRepository;
    private final AbueloRepository abueloRepository;
    private final CuidadoraRepository cuidadoraRepository;
    private final WebSocketService webSocketService;
    private final ObjectMapper objectMapper;
    
    // Distancia máxima permitida para check-in (200 metros)
    private static final double GEOFENCE_RADIUS_METERS = 200.0;
    
    @Transactional
    public Evento registrarCheckin(Long cuidadoraId, CheckinRequest request) {
        Abuelo abuelo = abueloRepository.findById(request.getAbueloId())
                .orElseThrow(() -> new RuntimeException("Abuelo no encontrado"));
        
        Cuidadora cuidadora = cuidadoraRepository.findById(cuidadoraId)
                .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));
        
        // Verificar geofence
        boolean dentroDeGeofence = verificarGeofence(
                abuelo.getLat(), abuelo.getLng(),
                request.getLat(), request.getLng()
        );
        
        Evento evento = Evento.builder()
                .abuelo(abuelo)
                .cuidadora(cuidadora)
                .tipo(Evento.TipoEvento.LLEGADA)
                .timestamp(LocalDateTime.now())
                .fotoBase64(request.getSelfieBase64())
                .gpsLat(request.getLat())
                .gpsLng(request.getLng())
                .verificado(dentroDeGeofence)
                .descripcion(dentroDeGeofence ? "Llegada verificada" : "Llegada fuera de zona")
                .build();
        
        Evento saved = eventoRepository.save(evento);
        
        // Notificar a familia en tiempo real
        webSocketService.notificarEvento(abuelo.getFamiliarId(), saved);
        
        return saved;
    }
    
    @Transactional
    public Evento registrarPastilla(Long cuidadoraId, PastillaRequest request) {
        Abuelo abuelo = abueloRepository.findById(request.getAbueloId())
                .orElseThrow(() -> new RuntimeException("Abuelo no encontrado"));
        
        Cuidadora cuidadora = cuidadoraRepository.findById(cuidadoraId)
                .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));
        
        // Datos extra con info de OCR
        Map<String, Object> datosExtra = new HashMap<>();
        datosExtra.put("medicamento", request.getMedicamento());
        datosExtra.put("ocrTexto", request.getOcrTexto());
        datosExtra.put("verificadoOcr", request.getVerificadoOcr());
        
        String datosExtraJson;
        try {
            datosExtraJson = objectMapper.writeValueAsString(datosExtra);
        } catch (Exception e) {
            datosExtraJson = "{}";
        }
        
        Evento evento = Evento.builder()
                .abuelo(abuelo)
                .cuidadora(cuidadora)
                .tipo(Evento.TipoEvento.PASTILLA)
                .timestamp(LocalDateTime.now())
                .fotoBase64(request.getFotoBase64())
                .verificado(Boolean.TRUE.equals(request.getVerificadoOcr()))
                .descripcion(request.getMedicamento() + " - " + 
                        (request.getVerificadoOcr() ? "Verificado OCR ✓" : "Sin verificar"))
                .datosExtra(datosExtraJson)
                .build();
        
        Evento saved = eventoRepository.save(evento);
        webSocketService.notificarEvento(abuelo.getFamiliarId(), saved);
        
        return saved;
    }
    
    @Transactional
    public Evento registrarComida(Long cuidadoraId, Long abueloId, String fotoBase64) {
        Abuelo abuelo = abueloRepository.findById(abueloId)
                .orElseThrow(() -> new RuntimeException("Abuelo no encontrado"));
        
        Cuidadora cuidadora = cuidadoraRepository.findById(cuidadoraId)
                .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));
        
        Evento evento = Evento.builder()
                .abuelo(abuelo)
                .cuidadora(cuidadora)
                .tipo(Evento.TipoEvento.COMIDA)
                .timestamp(LocalDateTime.now())
                .fotoBase64(fotoBase64)
                .verificado(true)
                .descripcion("Comida servida")
                .build();
        
        Evento saved = eventoRepository.save(evento);
        webSocketService.notificarEvento(abuelo.getFamiliarId(), saved);
        
        return saved;
    }
    
    @Transactional
    public Evento registrarCaida(Long cuidadoraId, Long abueloId, Double lat, Double lng) {
        Abuelo abuelo = abueloRepository.findById(abueloId)
                .orElseThrow(() -> new RuntimeException("Abuelo no encontrado"));
        
        Cuidadora cuidadora = cuidadoraRepository.findById(cuidadoraId)
                .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));
        
        Evento evento = Evento.builder()
                .abuelo(abuelo)
                .cuidadora(cuidadora)
                .tipo(Evento.TipoEvento.CAIDA)
                .timestamp(LocalDateTime.now())
                .gpsLat(lat)
                .gpsLng(lng)
                .verificado(false)
                .descripcion("⚠️ POSIBLE CAÍDA DETECTADA")
                .build();
        
        Evento saved = eventoRepository.save(evento);
        webSocketService.notificarEmergencia(abuelo.getFamiliarId(), saved);
        
        return saved;
    }
    
    public List<Evento> getEventosHoy(Long abueloId) {
        return eventoRepository.findTodayEventsByAbueloId(abueloId);
    }
    
    public List<Evento> getEventosByAbuelo(Long abueloId) {
        return eventoRepository.findByAbueloIdOrderByTimestampDesc(abueloId);
    }
    
    public Page<Evento> getEventosByAbueloPaged(Long abueloId, Pageable pageable) {
        return eventoRepository.findByAbueloIdOrderByTimestampDesc(abueloId, pageable);
    }
    
    private boolean verificarGeofence(Double homeLat, Double homeLng, Double currentLat, Double currentLng) {
        if (homeLat == null || homeLng == null || currentLat == null || currentLng == null) {
            return false;
        }
        double distancia = calcularDistanciaHaversine(homeLat, homeLng, currentLat, currentLng);
        return distancia <= GEOFENCE_RADIUS_METERS;
    }
    
    /**
     * Calcula la distancia en metros entre dos coordenadas GPS usando la fórmula de Haversine.
     */
    private double calcularDistanciaHaversine(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371000; // Radio de la Tierra en metros
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
