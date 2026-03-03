package com.cuidalink.controller;

import com.cuidalink.dto.DashboardResponse;
import com.cuidalink.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST del dashboard principal.
 * Base path: /api/dashboard (requiere JWT)
 * 
 * Endpoints:
 *   GET /api/dashboard/{abueloId}/hoy → Dashboard diario completo:
 *       - Datos del paciente
 *       - Eventos registrados hoy
 *       - Tareas pendientes con estado (completada/pendiente)
 *       - Estadísticas: porcentaje de avance, total tareas
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    
    private final DashboardService dashboardService;
    
    @GetMapping("/{abueloId}/hoy")
    public ResponseEntity<DashboardResponse> getDashboardHoy(@PathVariable Long abueloId) {
        try {
            DashboardResponse response = dashboardService.getDashboardHoy(abueloId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
