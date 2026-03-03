package com.cuidalink.repository;

import com.cuidalink.entity.Cita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

/**
 * Repositorio JPA para la entidad Cita (calendario compartido).
 * 
 * Métodos:
 * - findByAbueloIdOrderByFechaAscHoraAsc(): todas las citas ordenadas por fecha
 * - findByAbueloIdAndFechaOrderByHoraAsc(): citas de un día específico
 * - findByAbueloIdAndFechaBetween...(): citas en un rango (vista mensual)
 * - findByAbueloIdAndFechaGreaterThanEqual...(): citas futuras (próximas)
 */
@Repository
public interface CitaRepository extends JpaRepository<Cita, Long> {

    List<Cita> findByAbueloIdOrderByFechaAscHoraAsc(Long abueloId);

    List<Cita> findByAbueloIdAndFechaOrderByHoraAsc(Long abueloId, LocalDate fecha);

    List<Cita> findByAbueloIdAndFechaBetweenOrderByFechaAscHoraAsc(
            Long abueloId, LocalDate start, LocalDate end);

    List<Cita> findByAbueloIdAndFechaGreaterThanEqualOrderByFechaAscHoraAsc(
            Long abueloId, LocalDate fecha);
}
