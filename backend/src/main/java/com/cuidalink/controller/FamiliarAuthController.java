package com.cuidalink.controller;

import com.cuidalink.dto.FamiliarLoginRequest;
import com.cuidalink.dto.FamiliarLoginResponse;
import com.cuidalink.dto.FamiliarRegisterRequest;
import com.cuidalink.entity.Familiar;
import com.cuidalink.repository.FamiliarRepository;
import com.cuidalink.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controlador REST de autenticación para FAMILIARES.
 * Base path: /api/auth/familiar (público, sin JWT requerido)
 * 
 * Endpoints:
 *   POST /api/auth/familiar/login    → Login con email + contraseña, devuelve JWT con rol FAMILIAR
 *   POST /api/auth/familiar/register → Registro de nuevo familiar con validaciones:
 *                                       - Nombre obligatorio
 *                                       - Email válido y único
 *                                       - Contraseña mín. 6 caracteres
 *                                       Genera JWT automático tras registro
 */
@RestController
@RequestMapping("/api/auth/familiar")
@RequiredArgsConstructor
public class FamiliarAuthController {
    
    private final FamiliarRepository familiarRepository;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody FamiliarLoginRequest request) {
        try {
            Familiar familiar = familiarRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("Credenciales inválidas"));
            
            if (!passwordEncoder.matches(request.getPassword(), familiar.getPassword())) {
                throw new RuntimeException("Credenciales inválidas");
            }
            
            if (!familiar.getActivo()) {
                throw new RuntimeException("Cuenta desactivada");
            }
            
            String token = tokenProvider.generateToken(familiar.getId(), familiar.getEmail(), "FAMILIAR");
            
            FamiliarLoginResponse response = FamiliarLoginResponse.builder()
                    .token(token)
                    .familiarId(familiar.getId())
                    .nombre(familiar.getNombre())
                    .email(familiar.getEmail())
                    .parentesco(familiar.getParentesco())
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody FamiliarRegisterRequest request) {
        try {
            // Validaciones
            if (request.getNombre() == null || request.getNombre().trim().isEmpty()) {
                throw new RuntimeException("El nombre es obligatorio");
            }
            if (request.getEmail() == null || !request.getEmail().contains("@")) {
                throw new RuntimeException("Email inválido");
            }
            if (request.getPassword() == null || request.getPassword().length() < 6) {
                throw new RuntimeException("La contraseña debe tener al menos 6 caracteres");
            }
            
            // Verificar que el email no exista
            if (familiarRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
                throw new RuntimeException("Ya existe una cuenta con este email");
            }
            
            // Crear el familiar
            Familiar familiar = Familiar.builder()
                    .nombre(request.getNombre().trim())
                    .email(request.getEmail().trim().toLowerCase())
                    .telefono(request.getTelefono() != null ? request.getTelefono().trim() : null)
                    .parentesco(request.getParentesco())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .activo(true)
                    .build();
            
            familiar = familiarRepository.save(familiar);
            
            // Generar token para login automático
            String token = tokenProvider.generateToken(familiar.getId(), familiar.getEmail(), "FAMILIAR");
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "token", token,
                    "familiarId", familiar.getId(),
                    "nombre", familiar.getNombre(),
                    "email", familiar.getEmail(),
                    "mensaje", "Cuenta creada correctamente"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
}
