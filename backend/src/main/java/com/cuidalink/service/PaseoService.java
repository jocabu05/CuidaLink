package com.cuidalink.service;

import com.cuidalink.dto.PaseoRequest;
import com.cuidalink.entity.Abuelo;
import com.cuidalink.entity.Cuidadora;
import com.cuidalink.entity.Evento;
import com.cuidalink.entity.Paseo;
import com.cuidalink.repository.AbueloRepository;
import com.cuidalink.repository.CuidadoraRepository;
import com.cuidalink.repository.EventoRepository;
import com.cuidalink.repository.PaseoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaseoService {
    
    private final PaseoRepository paseoRepository;
    private final AbueloRepository abueloRepository;
    private final CuidadoraRepository cuidadoraRepository;
    private final EventoRepository eventoRepository;
    private final WebSocketService webSocketService;
    private final ObjectMapper objectMapper;
    
    @Transactional
    public Paseo iniciarPaseo(Long cuidadoraId, Long abueloId) {
        // Verificar que no hay paseo activo
        paseoRepository.findPaseoActivo(cuidadoraId).ifPresent(p -> {
            throw new RuntimeException("Ya hay un paseo activo");
        });
        
        Abuelo abuelo = abueloRepository.findById(abueloId)
                .orElseThrow(() -> new RuntimeException("Abuelo no encontrado"));
        
        Cuidadora cuidadora = cuidadoraRepository.findById(cuidadoraId)
                .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));
        
        Paseo paseo = Paseo.builder()
                .abuelo(abuelo)
                .cuidadora(cuidadora)
                .inicio(LocalDateTime.now())
                .activo(true)
                .build();
        
        return paseoRepository.save(paseo);
    }
    
    @Transactional
    public Paseo finalizarPaseo(Long cuidadoraId, PaseoRequest request) {
        Paseo paseo = paseoRepository.findPaseoActivo(cuidadoraId)
                .orElseThrow(() -> new RuntimeException("No hay paseo activo"));
        
        // Convertir ruta a GeoJSON
        String rutaGeoJson = convertirRutaAGeoJson(request.getRuta());
        
        paseo.setFin(LocalDateTime.now());
        paseo.setRutaGeojson(rutaGeoJson);
        paseo.setDistanciaKm(BigDecimal.valueOf(request.getDistanciaKm() != null ? request.getDistanciaKm() : 0));
        paseo.setActivo(false);
        
        Paseo saved = paseoRepository.save(paseo);
        
        // Crear evento de paseo completado
        Evento evento = Evento.builder()
                .abuelo(paseo.getAbuelo())
                .cuidadora(paseo.getCuidadora())
                .tipo(Evento.TipoEvento.PASEO)
                .timestamp(LocalDateTime.now())
                .verificado(true)
                .descripcion(String.format("Paseo completado: %.2f km", request.getDistanciaKm()))
                .datosExtra(rutaGeoJson)
                .build();
        
        eventoRepository.save(evento);
        webSocketService.notificarEvento(paseo.getAbuelo().getFamiliarId(), evento);
        
        return saved;
    }
    
    public Paseo getPaseoActivo(Long cuidadoraId) {
        return paseoRepository.findPaseoActivo(cuidadoraId).orElse(null);
    }
    
    public List<Paseo> getPaseosByAbuelo(Long abueloId) {
        return paseoRepository.findByAbueloIdOrderByInicioDesc(abueloId);
    }
    
    private String convertirRutaAGeoJson(List<PaseoRequest.GpsPoint> puntos) {
        if (puntos == null || puntos.isEmpty()) {
            return "{}";
        }
        
        try {
            Map<String, Object> geoJson = new HashMap<>();
            geoJson.put("type", "LineString");
            
            double[][] coordinates = puntos.stream()
                    .map(p -> new double[]{p.getLng(), p.getLat()})
                    .toArray(double[][]::new);
            
            geoJson.put("coordinates", coordinates);
            
            return objectMapper.writeValueAsString(geoJson);
        } catch (Exception e) {
            return "{}";
        }
    }
}
