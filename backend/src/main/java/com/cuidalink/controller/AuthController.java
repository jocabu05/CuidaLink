package com.cuidalink.controller;

import com.cuidalink.dto.LoginRequest;
import com.cuidalink.dto.LoginResponse;
import com.cuidalink.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestAttribute("cuidadoraId") Long cuidadoraId) {
        try {
            var cuidadora = authService.getCuidadoraById(cuidadoraId);
            return ResponseEntity.ok(Map.of(
                    "id", cuidadora.getId(),
                    "nombre", cuidadora.getNombre(),
                    "telefono", cuidadora.getTelefono(),
                    "rating", cuidadora.getRatingPromedio()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
