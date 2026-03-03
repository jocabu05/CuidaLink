package com.cuidalink.repository;

import com.cuidalink.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio JPA para la entidad Rating.
 * Incluye queries agregadas para calcular estadísticas.
 * 
 * Métodos:
 * - findByCuidadoraIdOrderByFechaDesc(): últimas valoraciones de una cuidadora
 * - calcularPromedioRating(): AVG(estrellas) para recalcular el promedio
 * - countByCuidadoraId(): total de valoraciones recibidas
 */
@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {
    
    List<Rating> findByCuidadoraIdOrderByFechaDesc(Long cuidadoraId);
    
    @Query("SELECT AVG(r.estrellas) FROM Rating r WHERE r.cuidadora.id = :cuidadoraId")
    Double calcularPromedioRating(@Param("cuidadoraId") Long cuidadoraId);
    
    @Query("SELECT COUNT(r) FROM Rating r WHERE r.cuidadora.id = :cuidadoraId")
    Long countByCuidadoraId(@Param("cuidadoraId") Long cuidadoraId);
}
