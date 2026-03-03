package com.cuidalink.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

/**
 * Filtro de seguridad que intercepta CADA petición HTTP para verificar
 * si lleva un token JWT válido en la cabecera Authorization.
 * 
 * Flujo:
 * 1. Extrae el token de "Authorization: Bearer <token>"
 * 2. Valida el token con JwtTokenProvider
 * 3. Si es válido, extrae el ID del usuario y lo guarda en el SecurityContext
 * 4. Si no hay token o es inválido, deja pasar sin autenticar
 *    (los endpoints públicos como /api/auth/** seguirán funcionando)
 * 
 * Extiende OncePerRequestFilter para ejecutarse exactamente una vez por petición.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtTokenProvider tokenProvider;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        
        String token = getJwtFromRequest(request);
        
        if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
            Long cuidadoraId = tokenProvider.getCuidadoraIdFromToken(token);
            
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(cuidadoraId, null, new ArrayList<>());
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
