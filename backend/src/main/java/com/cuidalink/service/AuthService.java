package com.cuidalink.service;

import com.cuidalink.dto.LoginRequest;
import com.cuidalink.dto.LoginResponse;
import com.cuidalink.entity.Cuidadora;
import com.cuidalink.repository.CuidadoraRepository;
import com.cuidalink.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final CuidadoraRepository cuidadoraRepository;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    
    public LoginResponse login(LoginRequest request) {
        Cuidadora cuidadora = cuidadoraRepository
                .findByTelefono(request.getTelefono())
                .orElseThrow(() -> new RuntimeException("Credenciales inválidas"));
        
        if (!passwordEncoder.matches(request.getPin(), cuidadora.getPin())) {
            throw new RuntimeException("Credenciales inválidas");
        }
        
        if (!cuidadora.getActivo()) {
            throw new RuntimeException("Cuenta desactivada");
        }
        
        String token = tokenProvider.generateToken(cuidadora.getId(), cuidadora.getTelefono());
        
        return LoginResponse.builder()
                .token(token)
                .cuidadoraId(cuidadora.getId())
                .nombre(cuidadora.getNombre())
                .telefono(cuidadora.getTelefono())
                .fotoPerfil(cuidadora.getFotoPerfil())
                .rating(cuidadora.getRatingPromedio())
                .build();
    }
    
    public Cuidadora getCuidadoraById(Long id) {
        return cuidadoraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));
    }
}
