package com.cuidalink.service;

import com.cuidalink.dto.DashboardResponse;
import com.cuidalink.entity.Abuelo;
import com.cuidalink.entity.Evento;
import com.cuidalink.repository.AbueloRepository;
import com.cuidalink.repository.EventoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Servicio que genera el dashboard diario de la cuidadora.
 * 
 * getDashboardHoy(): Para un paciente dado, devuelve:
 *   - Datos del paciente (nombre, dirección, foto)
 *   - Lista de eventos registrados hoy
 *   - Lista de tareas pendientes del día (LLEGADA, PASTILLA, PASEO, COMIDA)
 *   - Estadísticas: total tareas, completadas, % de avance
 * 
 * generarTareasDia(): Compara las tareas estándar (4 tipos)
 *   con los eventos ya registrados para marcar cuáles están hechas.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {
    
    private final AbueloRepository abueloRepository;
    private final EventoRepository eventoRepository;
    
    public DashboardResponse getDashboardHoy(Long abueloId) {
        Abuelo abuelo = abueloRepository.findById(abueloId)
                .orElseThrow(() -> new RuntimeException("Abuelo no encontrado"));
        
        List<Evento> eventosHoy = eventoRepository.findTodayEventsByAbueloId(abueloId);
        
        // Convertir eventos a DTOs
        List<DashboardResponse.EventoInfo> eventosInfo = eventosHoy.stream()
                .map(e -> DashboardResponse.EventoInfo.builder()
                        .id(e.getId())
                        .tipo(e.getTipo())
                        .timestamp(e.getTimestamp())
                        .fotoBase64(e.getFotoBase64())
                        .gpsLat(e.getGpsLat())
                        .gpsLng(e.getGpsLng())
                        .verificado(e.getVerificado())
                        .descripcion(e.getDescripcion())
                        .build())
                .collect(Collectors.toList());
        
        // Generar tareas del día
        List<DashboardResponse.TareaInfo> tareas = generarTareasDia(eventosHoy);
        
        // Calcular estadísticas
        int totalTareas = tareas.size();
        int tareasCompletadas = (int) tareas.stream()
                .filter(DashboardResponse.TareaInfo::getCompletada)
                .count();
        double porcentaje = totalTareas > 0 ? (tareasCompletadas * 100.0 / totalTareas) : 0;
        
        return DashboardResponse.builder()
                .abuelo(DashboardResponse.AbueloInfo.builder()
                        .id(abuelo.getId())
                        .nombre(abuelo.getNombre())
                        .direccion(abuelo.getDireccion())
                        .fotoPerfil(abuelo.getFotoPerfil())
                        .build())
                .eventosHoy(eventosInfo)
                .tareasPendientes(tareas)
                .estadisticas(DashboardResponse.EstadisticasDia.builder()
                        .totalTareas(totalTareas)
                        .tareasCompletadas(tareasCompletadas)
                        .porcentajeAvance(porcentaje)
                        .build())
                .build();
    }
    
    private List<DashboardResponse.TareaInfo> generarTareasDia(List<Evento> eventos) {
        List<DashboardResponse.TareaInfo> tareas = new ArrayList<>();
        
        // Verificar qué tareas ya están hechas
        boolean llegadaHecha = eventos.stream()
                .anyMatch(e -> e.getTipo() == Evento.TipoEvento.LLEGADA);
        boolean pastillaHecha = eventos.stream()
                .anyMatch(e -> e.getTipo() == Evento.TipoEvento.PASTILLA);
        boolean paseoHecho = eventos.stream()
                .anyMatch(e -> e.getTipo() == Evento.TipoEvento.PASEO);
        boolean comidaHecha = eventos.stream()
                .anyMatch(e -> e.getTipo() == Evento.TipoEvento.COMIDA);
        
        tareas.add(DashboardResponse.TareaInfo.builder()
                .tipo("LLEGADA")
                .hora("09:00")
                .descripcion("Llegada al domicilio")
                .completada(llegadaHecha)
                .icono("📍")
                .build());
        
        tareas.add(DashboardResponse.TareaInfo.builder()
                .tipo("PASTILLA")
                .hora("10:30")
                .descripcion("Sinemet 10mg")
                .completada(pastillaHecha)
                .icono("💊")
                .build());
        
        tareas.add(DashboardResponse.TareaInfo.builder()
                .tipo("PASEO")
                .hora("12:00")
                .descripcion("Paseo por el barrio")
                .completada(paseoHecho)
                .icono("🚶")
                .build());
        
        tareas.add(DashboardResponse.TareaInfo.builder()
                .tipo("COMIDA")
                .hora("14:00")
                .descripcion("Preparar comida")
                .completada(comidaHecha)
                .icono("🍽️")
                .build());
        
        return tareas;
    }
}
