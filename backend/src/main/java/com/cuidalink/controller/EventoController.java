package com.cuidalink.controller;

import com.cuidalink.dto.CheckinRequest;
import com.cuidalink.dto.PastillaRequest;
import com.cuidalink.entity.Evento;
import com.cuidalink.service.EventoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EventoController {
    
    private final EventoService eventoService;
    
    @PostMapping("/checkin")
    public ResponseEntity<?> checkin(Authentication auth, @RequestBody CheckinRequest request) {
        try {
            Long cuidadoraId = extractCuidadoraId(auth);
            Evento evento = eventoService.registrarCheckin(cuidadoraId, request);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "eventoId", evento.getId(),
                    "verificado", evento.getVerificado(),
                    "mensaje", evento.getVerificado() ? 
                            "✓ Llegada verificada" : "⚠️ Llegada registrada (fuera de zona)"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    @PostMapping("/pastilla")
    public ResponseEntity<?> pastilla(Authentication auth, @RequestBody PastillaRequest request) {
        try {
            Long cuidadoraId = extractCuidadoraId(auth);
            Evento evento = eventoService.registrarPastilla(cuidadoraId, request);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "eventoId", evento.getId(),
                    "verificado", evento.getVerificado(),
                    "mensaje", evento.getVerificado() ? 
                            "✓ Medicamento verificado por OCR" : "Medicamento registrado"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    @PostMapping("/comida")
    public ResponseEntity<?> comida(Authentication auth, @RequestBody Map<String, Object> body) {
        try {
            Long cuidadoraId = extractCuidadoraId(auth);
            Long abueloId = Long.valueOf(body.get("abueloId").toString());
            String foto = (String) body.get("fotoBase64");
            
            Evento evento = eventoService.registrarComida(cuidadoraId, abueloId, foto);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "eventoId", evento.getId(),
                    "mensaje", "✓ Comida registrada"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    @PostMapping("/caida")
    public ResponseEntity<?> reportarCaida(Authentication auth, @RequestBody Map<String, Object> body) {
        try {
            Long cuidadoraId = extractCuidadoraId(auth);
            Long abueloId = Long.valueOf(body.get("abueloId").toString());
            Double lat = body.get("lat") != null ? Double.valueOf(body.get("lat").toString()) : null;
            Double lng = body.get("lng") != null ? Double.valueOf(body.get("lng").toString()) : null;
            
            Evento evento = eventoService.registrarCaida(cuidadoraId, abueloId, lat, lng);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "eventoId", evento.getId(),
                    "mensaje", "🚨 Alerta de caída enviada"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    @GetMapping("/eventos/{abueloId}")
    public ResponseEntity<List<Evento>> getEventos(@PathVariable Long abueloId) {
        return ResponseEntity.ok(eventoService.getEventosByAbuelo(abueloId));
    }
    
    @GetMapping("/eventos/{abueloId}/paged")
    public ResponseEntity<Page<Evento>> getEventosPaged(
            @PathVariable Long abueloId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(eventoService.getEventosByAbueloPaged(abueloId, pageable));
    }
    
    @GetMapping("/eventos/{abueloId}/hoy")
    public ResponseEntity<List<Evento>> getEventosHoy(@PathVariable Long abueloId) {
        return ResponseEntity.ok(eventoService.getEventosHoy(abueloId));
    }
    
    private Long extractCuidadoraId(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof Long)) {
            throw new RuntimeException("No autenticado");
        }
        return (Long) auth.getPrincipal();
    }
}
