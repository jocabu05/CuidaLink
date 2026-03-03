package com.cuidalink.repository;

import com.cuidalink.entity.Evento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventoRepository extends JpaRepository<Evento, Long> {
    
    List<Evento> findByAbueloIdOrderByTimestampDesc(Long abueloId);
    
    Page<Evento> findByAbueloIdOrderByTimestampDesc(Long abueloId, Pageable pageable);
    
    List<Evento> findByCuidadoraIdOrderByTimestampDesc(Long cuidadoraId);
    
    @Query("SELECT e FROM Evento e WHERE e.abuelo.id = :abueloId AND e.timestamp >= :inicio AND e.timestamp <= :fin ORDER BY e.timestamp DESC")
    List<Evento> findByAbueloIdAndTimestampBetween(
            @Param("abueloId") Long abueloId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin
    );
    
    @Query("SELECT e FROM Evento e WHERE e.abuelo.id = :abueloId AND CAST(e.timestamp AS DATE) = CURRENT_DATE ORDER BY e.timestamp ASC")
    List<Evento> findTodayEventsByAbueloId(@Param("abueloId") Long abueloId);
    
    @Query("SELECT COUNT(e) FROM Evento e WHERE e.cuidadora.id = :cuidadoraId AND e.verificado = true")
    Long countVerificadosByCuidadoraId(@Param("cuidadoraId") Long cuidadoraId);
}
