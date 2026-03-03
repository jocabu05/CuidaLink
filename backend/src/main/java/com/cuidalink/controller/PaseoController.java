package com.cuidalink.controller;

import com.cuidalink.dto.PaseoRequest;
import com.cuidalink.entity.Paseo;
import com.cuidalink.service.PaseoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controlador REST de paseos con tracking GPS.
 * Base path: /api/paseo (requiere JWT)
 * 
 * Permite a la cuidadora iniciar/finalizar paseos con el paciente.
 * Al finalizar se guarda la ruta completa en GeoJSON.
 * 
 * Endpoints:
 *   POST /api/paseo/start  → Iniciar paseo (solo 1 activo a la vez)
 *   POST /api/paseo/stop   → Finalizar paseo (guarda ruta, distancia, duración)
 *   GET  /api/paseo/activo → Consultar si hay un paseo en curso
 */
@RestController
@RequestMapping("/api/paseo")
@RequiredArgsConstructor
public class PaseoController {
    
    private final PaseoService paseoService;
    
    @PostMapping("/start")
    public ResponseEntity<?> iniciarPaseo(Authentication auth, @RequestBody Map<String, Long> body) {
        try {
            Long cuidadoraId = (Long) auth.getPrincipal();
            Long abueloId = body.get("abueloId");
            
            Paseo paseo = paseoService.iniciarPaseo(cuidadoraId, abueloId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "paseoId", paseo.getId(),
                    "inicio", paseo.getInicio().toString(),
                    "mensaje", "🚶 Paseo iniciado"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    @PostMapping("/stop")
    public ResponseEntity<?> finalizarPaseo(Authentication auth, @RequestBody PaseoRequest request) {
        try {
            Long cuidadoraId = (Long) auth.getPrincipal();
            Paseo paseo = paseoService.finalizarPaseo(cuidadoraId, request);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "paseoId", paseo.getId(),
                    "distanciaKm", paseo.getDistanciaKm(),
                    "duracionMinutos", java.time.Duration.between(paseo.getInicio(), paseo.getFin()).toMinutes(),
                    "mensaje", String.format("✓ Paseo completado: %.2f km", paseo.getDistanciaKm())
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    @GetMapping("/activo")
    public ResponseEntity<?> getPaseoActivo(Authentication auth) {
        Long cuidadoraId = (Long) auth.getPrincipal();
        Paseo paseo = paseoService.getPaseoActivo(cuidadoraId);
        
        if (paseo == null) {
            return ResponseEntity.ok(Map.of("activo", false));
        }
        
        return ResponseEntity.ok(Map.of(
                "activo", true,
                "paseoId", paseo.getId(),
                "abueloId", paseo.getAbuelo().getId(),
                "inicio", paseo.getInicio().toString()
        ));
    }
}
