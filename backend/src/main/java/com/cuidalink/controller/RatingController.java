package com.cuidalink.controller;

import com.cuidalink.dto.RatingRequest;
import com.cuidalink.dto.RatingResponse;
import com.cuidalink.entity.Rating;
import com.cuidalink.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controlador REST de valoraciones.
 * Base path: /api/rating (requiere JWT)
 * 
 * Los familiares valoran a las cuidadoras con estrellas (1-5) y comentarios.
 * 
 * Endpoints:
 *   GET  /api/rating/{cuidadoraId} → Perfil de valoraciones: promedio, total, últimos 10
 *   POST /api/rating               → Crear nueva valoración (actualiza promedio automáticamente)
 */
@RestController
@RequestMapping("/api/rating")
@RequiredArgsConstructor
public class RatingController {
    
    private final RatingService ratingService;
    
    @GetMapping("/{cuidadoraId}")
    public ResponseEntity<RatingResponse> getRatings(@PathVariable Long cuidadoraId) {
        try {
            RatingResponse response = ratingService.getRatingsCuidadora(cuidadoraId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping
    public ResponseEntity<?> crearRating(@RequestBody RatingRequest request) {
        try {
            // En producción, el familiarId vendría del token de autenticación
            Long familiarId = 1L;
            Rating rating = ratingService.crearRating(familiarId, request);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "ratingId", rating.getId(),
                    "mensaje", "⭐ Valoración enviada"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
}
