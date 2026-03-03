package com.cuidalink.controller;

import com.cuidalink.entity.Nota;
import com.cuidalink.repository.NotaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST del sistema de notas/avisos.
 * Base path: /api/notas (requiere JWT)
 * 
 * Sistema de comunicación asíncrona entre cuidadora y familiar.
 * Las notas pueden ser "normal" o "urgente" y tienen estado leída/no leída.
 * 
 * Endpoints:
 *   POST   /api/notas                → Crear nueva nota
 *   GET    /api/notas/pendientes     → Notas no leídas
 *   GET    /api/notas                → Todas las notas
 *   PUT    /api/notas/{id}/leida     → Marcar nota como leída
 *   DELETE /api/notas/{id}           → Eliminar nota
 *   DELETE /api/notas/pendientes     → Eliminar todas las pendientes
 */
@RestController
@RequestMapping("/api/notas")
public class NotaController {

    private final NotaRepository notaRepository;

    public NotaController(NotaRepository notaRepository) {
        this.notaRepository = notaRepository;
    }

    // Create a note
    @PostMapping
    public ResponseEntity<Nota> crearNota(@RequestBody Nota nota) {
        Nota saved = notaRepository.save(nota);
        return ResponseEntity.ok(saved);
    }

    // Get pending (unread) notes for a given abuelo
    @GetMapping("/pendientes")
    public ResponseEntity<List<Nota>> getNotasPendientes(
            @RequestParam(defaultValue = "1") Long abueloId) {
        List<Nota> notas = notaRepository.findByAbueloIdAndLeidaFalseOrderByTimestampDesc(abueloId);
        return ResponseEntity.ok(notas);
    }

    // Get all notes
    @GetMapping
    public ResponseEntity<List<Nota>> getAllNotas(
            @RequestParam(defaultValue = "1") Long abueloId) {
        List<Nota> notas = notaRepository.findByAbueloIdOrderByTimestampDesc(abueloId);
        return ResponseEntity.ok(notas);
    }

    // Mark note as read
    @PutMapping("/{id}/leida")
    public ResponseEntity<Map<String, String>> marcarLeida(@PathVariable Long id) {
        return notaRepository.findById(id)
                .map(nota -> {
                    nota.setLeida(true);
                    notaRepository.save(nota);
                    return ResponseEntity.ok(Map.of("status", "ok", "id", id.toString()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Mark note as read and delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> eliminarNota(@PathVariable Long id) {
        if (notaRepository.existsById(id)) {
            notaRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("status", "deleted", "id", id.toString()));
        }
        return ResponseEntity.notFound().build();
    }

    // Mark all pending as read and delete
    @DeleteMapping("/pendientes")
    public ResponseEntity<Map<String, String>> eliminarTodasPendientes(
            @RequestParam(defaultValue = "1") Long abueloId) {
        List<Nota> pendientes = notaRepository.findByAbueloIdAndLeidaFalseOrderByTimestampDesc(abueloId);
        notaRepository.deleteAll(pendientes);
        return ResponseEntity.ok(Map.of("status", "deleted", "count", String.valueOf(pendientes.size())));
    }
}
