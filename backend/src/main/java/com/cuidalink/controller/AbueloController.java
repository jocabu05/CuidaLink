package com.cuidalink.controller;

import com.cuidalink.entity.Abuelo;
import com.cuidalink.entity.Evento;
import com.cuidalink.repository.AbueloRepository;
import com.cuidalink.repository.EventoRepository;
import com.cuidalink.repository.CuidadoraRepository;
import com.cuidalink.service.EventoService;
import com.cuidalink.service.WebSocketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/abuelo")
@RequiredArgsConstructor
public class AbueloController {

    private final AbueloRepository abueloRepository;
    private final EventoRepository eventoRepository;
    private final CuidadoraRepository cuidadoraRepository;
    private final WebSocketService webSocketService;

    /**
     * GET /api/abuelo/{id}/ubicacion
     * Devuelve la última ubicación conocida del abuelo basada en eventos con GPS
     */
    @GetMapping("/{id}/ubicacion")
    public ResponseEntity<?> getUbicacion(@PathVariable Long id) {
        Abuelo abuelo = abueloRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Abuelo no encontrado"));

        // Buscar último evento con coordenadas GPS
        List<Evento> eventosConGps = eventoRepository.findByAbueloIdOrderByTimestampDesc(id)
                .stream()
                .filter(e -> e.getGpsLat() != null && e.getGpsLng() != null)
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("abueloId", abuelo.getId());
        response.put("nombre", abuelo.getNombre());
        response.put("domicilioLat", abuelo.getLat());
        response.put("domicilioLng", abuelo.getLng());

        if (!eventosConGps.isEmpty()) {
            Evento ultimo = eventosConGps.get(0);
            double distancia = calcularDistancia(
                    abuelo.getLat(), abuelo.getLng(),
                    ultimo.getGpsLat(), ultimo.getGpsLng()
            );
            boolean enZonaSegura = distancia <= 200; // 200 metros de zona segura

            response.put("ultimaLat", ultimo.getGpsLat());
            response.put("ultimaLng", ultimo.getGpsLng());
            response.put("ultimaActualizacion", ultimo.getTimestamp().toString());
            response.put("tipoEvento", ultimo.getTipo().name());
            response.put("enZonaSegura", enZonaSegura);
            response.put("distanciaMetros", Math.round(distancia));
        } else {
            // Sin datos GPS, asumir en domicilio
            response.put("ultimaLat", abuelo.getLat());
            response.put("ultimaLng", abuelo.getLng());
            response.put("ultimaActualizacion", null);
            response.put("tipoEvento", null);
            response.put("enZonaSegura", true);
            response.put("distanciaMetros", 0);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/abuelo/{id}/alerta-fuga
     * Registra una alerta de fuga y notifica a la familia
     */
    @PostMapping("/{id}/alerta-fuga")
    public ResponseEntity<?> alertaFuga(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        try {
            Long cuidadoraId = (Long) auth.getPrincipal();

            Abuelo abuelo = abueloRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Abuelo no encontrado"));

            var cuidadora = cuidadoraRepository.findById(cuidadoraId)
                    .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));

            Double lat = body.get("lat") != null ? Double.valueOf(body.get("lat").toString()) : null;
            Double lng = body.get("lng") != null ? Double.valueOf(body.get("lng").toString()) : null;

            Evento evento = Evento.builder()
                    .abuelo(abuelo)
                    .cuidadora(cuidadora)
                    .tipo(Evento.TipoEvento.FUGA)
                    .timestamp(LocalDateTime.now())
                    .gpsLat(lat)
                    .gpsLng(lng)
                    .verificado(false)
                    .descripcion("🚨 ALERTA: Paciente fuera de zona segura")
                    .build();

            Evento saved = eventoRepository.save(evento);
            webSocketService.notificarEmergencia(abuelo.getFamiliarId(), saved);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "eventoId", saved.getId(),
                    "mensaje", "🚨 Alerta de fuga enviada a la familia"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * GET /api/abuelo/{id}/perfil
     * Devuelve los datos del perfil del abuelo
     */
    @GetMapping("/{id}/perfil")
    public ResponseEntity<?> getPerfil(@PathVariable Long id) {
        Abuelo abuelo = abueloRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Abuelo no encontrado"));

        Map<String, Object> perfil = new LinkedHashMap<>();
        perfil.put("id", abuelo.getId());
        perfil.put("nombre", abuelo.getNombre());
        perfil.put("direccion", abuelo.getDireccion());
        perfil.put("lat", abuelo.getLat());
        perfil.put("lng", abuelo.getLng());
        perfil.put("telefonoEmergencia", abuelo.getTelefonoEmergencia());
        perfil.put("notasMedicas", abuelo.getNotasMedicas());
        perfil.put("fotoPerfil", abuelo.getFotoPerfil());
        perfil.put("familiarId", abuelo.getFamiliarId());

        return ResponseEntity.ok(perfil);
    }

    /**
     * Calcula la distancia en metros entre dos coordenadas GPS usando Haversine
     */
    private double calcularDistancia(Double lat1, Double lng1, Double lat2, Double lng2) {
        if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
            return 0;
        }
        double R = 6371000; // Radio de la Tierra en metros
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
