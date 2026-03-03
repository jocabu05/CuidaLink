package com.cuidalink.dto;

import com.cuidalink.entity.Evento;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@Builder
public class DashboardResponse {
    private AbueloInfo abuelo;
    private List<EventoInfo> eventosHoy;
    private List<TareaInfo> tareasPendientes;
    private EstadisticasDia estadisticas;
    
    @Data
    @AllArgsConstructor
    @Builder
    public static class AbueloInfo {
        private Long id;
        private String nombre;
        private String direccion;
        private String fotoPerfil;
    }
    
    @Data
    @AllArgsConstructor
    @Builder
    public static class EventoInfo {
        private Long id;
        private Evento.TipoEvento tipo;
        private LocalDateTime timestamp;
        private String fotoBase64;
        private Double gpsLat;
        private Double gpsLng;
        private Boolean verificado;
        private String descripcion;
    }
    
    @Data
    @AllArgsConstructor
    @Builder
    public static class TareaInfo {
        private String tipo;
        private String hora;
        private String descripcion;
        private Boolean completada;
        private String icono;
    }
    
    @Data
    @AllArgsConstructor
    @Builder
    public static class EstadisticasDia {
        private Integer totalTareas;
        private Integer tareasCompletadas;
        private Double porcentajeAvance;
    }
}
