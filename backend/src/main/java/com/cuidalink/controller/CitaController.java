package com.cuidalink.controller;

import com.cuidalink.entity.Cita;
import com.cuidalink.repository.CitaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST del calendario compartido de citas.
 * Base path: /api/citas (requiere JWT)
 * 
 * Ambos roles (cuidadora y familiar) pueden crear, editar y ver citas.
 * 
 * Endpoints:
 *   GET    /api/citas              → Todas las citas de un paciente
 *   GET    /api/citas/fecha        → Citas de un día específico
 *   GET    /api/citas/rango        → Citas entre dos fechas (vista mensual)
 *   GET    /api/citas/proximas     → Citas futuras (próximas)
 *   POST   /api/citas              → Crear nueva cita
 *   PUT    /api/citas/{id}         → Actualizar cita existente
 *   DELETE /api/citas/{id}         → Eliminar cita
 */
@RestController
@RequestMapping("/api/citas")
public class CitaController {

    private final CitaRepository citaRepository;

    public CitaController(CitaRepository citaRepository) {
        this.citaRepository = citaRepository;
    }

    // Get all citas for an abuelo
    @GetMapping
    public ResponseEntity<List<Cita>> getAllCitas(
            @RequestParam(defaultValue = "1") Long abueloId) {
        return ResponseEntity.ok(
                citaRepository.findByAbueloIdOrderByFechaAscHoraAsc(abueloId));
    }

    // Get citas for a specific date
    @GetMapping("/fecha")
    public ResponseEntity<List<Cita>> getCitasByDate(
            @RequestParam(defaultValue = "1") Long abueloId,
            @RequestParam String fecha) {
        LocalDate date = LocalDate.parse(fecha);
        return ResponseEntity.ok(
                citaRepository.findByAbueloIdAndFechaOrderByHoraAsc(abueloId, date));
    }

    // Get citas between dates (for a month view)
    @GetMapping("/rango")
    public ResponseEntity<List<Cita>> getCitasByRange(
            @RequestParam(defaultValue = "1") Long abueloId,
            @RequestParam String desde,
            @RequestParam String hasta) {
        LocalDate start = LocalDate.parse(desde);
        LocalDate end = LocalDate.parse(hasta);
        return ResponseEntity.ok(
                citaRepository.findByAbueloIdAndFechaBetweenOrderByFechaAscHoraAsc(abueloId, start, end));
    }

    // Get upcoming citas
    @GetMapping("/proximas")
    public ResponseEntity<List<Cita>> getProximasCitas(
            @RequestParam(defaultValue = "1") Long abueloId) {
        return ResponseEntity.ok(
                citaRepository.findByAbueloIdAndFechaGreaterThanEqualOrderByFechaAscHoraAsc(
                        abueloId, LocalDate.now()));
    }

    // Create a cita
    @PostMapping
    public ResponseEntity<Cita> crearCita(@RequestBody Cita cita) {
        Cita saved = citaRepository.save(cita);
        return ResponseEntity.ok(saved);
    }

    // Update a cita
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarCita(@PathVariable Long id, @RequestBody Cita updated) {
        return citaRepository.findById(id)
                .map(cita -> {
                    cita.setTitulo(updated.getTitulo());
                    cita.setFecha(updated.getFecha());
                    cita.setHora(updated.getHora());
                    cita.setTipo(updated.getTipo());
                    cita.setNotas(updated.getNotas());
                    citaRepository.save(cita);
                    return ResponseEntity.ok(cita);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete a cita
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> eliminarCita(@PathVariable Long id) {
        if (citaRepository.existsById(id)) {
            citaRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Cita eliminada"));
        }
        return ResponseEntity.notFound().build();
    }
}
