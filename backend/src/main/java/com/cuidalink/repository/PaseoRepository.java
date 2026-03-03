package com.cuidalink.repository;

import com.cuidalink.entity.Paseo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio JPA para la entidad Paseo.
 * 
 * Métodos:
 * - findPaseoActivo(): busca el paseo en curso de una cuidadora (activo=true)
 * - findByAbueloIdOrderByInicioDesc(): historial de paseos de un paciente
 * - findTodayPaseosByAbueloId(): paseos del día actual
 */
@Repository
public interface PaseoRepository extends JpaRepository<Paseo, Long> {
    
    @Query("SELECT p FROM Paseo p WHERE p.cuidadora.id = :cuidadoraId AND p.activo = true")
    Optional<Paseo> findPaseoActivo(@Param("cuidadoraId") Long cuidadoraId);
    
    List<Paseo> findByAbueloIdOrderByInicioDesc(Long abueloId);
    
    @Query("SELECT p FROM Paseo p WHERE p.abuelo.id = :abueloId AND p.inicio >= :startOfDay AND p.inicio < :startOfNextDay")
    List<Paseo> findTodayPaseosByAbueloId(@Param("abueloId") Long abueloId,
                                           @Param("startOfDay") LocalDateTime startOfDay,
                                           @Param("startOfNextDay") LocalDateTime startOfNextDay);
}
