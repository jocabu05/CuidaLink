package com.cuidalink.service;

import com.cuidalink.dto.LoginRequest;
import com.cuidalink.dto.LoginResponse;
import com.cuidalink.entity.Cuidadora;
import com.cuidalink.repository.CuidadoraRepository;
import com.cuidalink.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Servicio de autenticación para cuidadoras.
 * 
 * login(): Recibe teléfono + PIN, verifica contra BCrypt,
 *          y devuelve un JWT con los datos de la cuidadora.
 * 
 * Flujo de login:
 * 1. Busca cuidadora por teléfono en BD
 * 2. Compara PIN con hash BCrypt almacenado
 * 3. Verifica que la cuenta esté activa
 * 4. Genera token JWT con ID y teléfono
 * 5. Devuelve LoginResponse con token, nombre, foto y rating
 */
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
