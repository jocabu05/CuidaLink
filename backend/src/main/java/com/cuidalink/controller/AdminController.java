package com.cuidalink.controller;

import com.cuidalink.entity.Cuidadora;
import com.cuidalink.entity.Familiar;
import com.cuidalink.repository.CuidadoraRepository;
import com.cuidalink.repository.FamiliarRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controlador de administración para gestionar cuentas de cuidadoras y familiares.
 * En producción, estos endpoints estarían protegidos con rol ADMIN.
 */
@RestController
@RequestMapping("/api/auth/admin")
@RequiredArgsConstructor
public class AdminController {
    
    private final CuidadoraRepository cuidadoraRepository;
    private final FamiliarRepository familiarRepository;
    private final PasswordEncoder passwordEncoder;
    
    // ─── CUIDADORAS ───
    
    @PostMapping("/cuidadora")
    public ResponseEntity<?> createCuidadora(@RequestBody CreateCuidadoraRequest request) {
        try {
            if (request.getNombre() == null || request.getNombre().trim().isEmpty()) {
                throw new RuntimeException("El nombre es obligatorio");
            }
            if (request.getTelefono() == null || request.getTelefono().trim().isEmpty()) {
                throw new RuntimeException("El teléfono es obligatorio");
            }
            if (request.getPin() == null || request.getPin().length() != 4) {
                throw new RuntimeException("El PIN debe tener 4 dígitos");
            }
            
            if (cuidadoraRepository.findByTelefono(request.getTelefono().trim()).isPresent()) {
                throw new RuntimeException("Ya existe una cuidadora con este teléfono");
            }
            
            Cuidadora cuidadora = Cuidadora.builder()
                    .nombre(request.getNombre().trim())
                    .telefono(request.getTelefono().trim())
                    .pin(passwordEncoder.encode(request.getPin()))
                    .ratingPromedio(BigDecimal.ZERO)
                    .totalRatings(0)
                    .activo(true)
                    .build();
            
            cuidadora = cuidadoraRepository.save(cuidadora);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "id", cuidadora.getId(),
                    "nombre", cuidadora.getNombre(),
                    "telefono", cuidadora.getTelefono(),
                    "mensaje", "Cuidadora creada correctamente. PIN: " + request.getPin()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    @GetMapping("/cuidadoras")
    public ResponseEntity<?> listCuidadoras() {
        List<Map<String, Object>> result = cuidadoraRepository.findAll().stream()
                .map(c -> Map.<String, Object>of(
                        "id", c.getId(),
                        "nombre", c.getNombre(),
                        "telefono", c.getTelefono(),
                        "activo", c.getActivo(),
                        "ratingPromedio", c.getRatingPromedio()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
    
    @PutMapping("/cuidadora/{id}/pin")
    public ResponseEntity<?> resetCuidadoraPin(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String newPin = body.get("pin");
            if (newPin == null || newPin.length() != 4) {
                throw new RuntimeException("El PIN debe tener 4 dígitos");
            }
            
            Cuidadora cuidadora = cuidadoraRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));
            
            cuidadora.setPin(passwordEncoder.encode(newPin));
            cuidadoraRepository.save(cuidadora);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "mensaje", "PIN actualizado correctamente"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    @PutMapping("/cuidadora/{id}/toggle")
    public ResponseEntity<?> toggleCuidadora(@PathVariable Long id) {
        try {
            Cuidadora cuidadora = cuidadoraRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));
            
            cuidadora.setActivo(!cuidadora.getActivo());
            cuidadoraRepository.save(cuidadora);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "activo", cuidadora.getActivo(),
                    "mensaje", cuidadora.getActivo() ? "Cuenta activada" : "Cuenta desactivada"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    // ─── FAMILIARES ───
    
    @GetMapping("/familiares")
    public ResponseEntity<?> listFamiliares() {
        List<Map<String, Object>> result = familiarRepository.findAll().stream()
                .map(f -> Map.<String, Object>of(
                        "id", f.getId(),
                        "nombre", f.getNombre(),
                        "email", f.getEmail(),
                        "telefono", f.getTelefono() != null ? f.getTelefono() : "",
                        "parentesco", f.getParentesco() != null ? f.getParentesco() : "",
                        "activo", f.getActivo()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
    
    @PutMapping("/familiar/{id}/password")
    public ResponseEntity<?> resetFamiliarPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String newPassword = body.get("password");
            if (newPassword == null || newPassword.length() < 6) {
                throw new RuntimeException("La contraseña debe tener al menos 6 caracteres");
            }
            
            Familiar familiar = familiarRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Familiar no encontrado"));
            
            familiar.setPassword(passwordEncoder.encode(newPassword));
            familiarRepository.save(familiar);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "mensaje", "Contraseña actualizada correctamente"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    @PutMapping("/familiar/{id}/toggle")
    public ResponseEntity<?> toggleFamiliar(@PathVariable Long id) {
        try {
            Familiar familiar = familiarRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Familiar no encontrado"));
            
            familiar.setActivo(!familiar.getActivo());
            familiarRepository.save(familiar);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "activo", familiar.getActivo(),
                    "mensaje", familiar.getActivo() ? "Cuenta activada" : "Cuenta desactivada"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    // ─── DTOs ───
    
    @Data
    public static class CreateCuidadoraRequest {
        private String nombre;
        private String telefono;
        private String pin;
    }
}
