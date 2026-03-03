package com.cuidalink.controller;

import com.cuidalink.dto.RatingRequest;
import com.cuidalink.dto.RatingResponse;
import com.cuidalink.entity.Rating;
import com.cuidalink.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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
