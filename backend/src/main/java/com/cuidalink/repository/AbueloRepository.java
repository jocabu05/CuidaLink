package com.cuidalink.repository;

import com.cuidalink.entity.Abuelo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio JPA para la entidad Abuelo (pacientes).
 * Spring Data genera automáticamente las queries SQL a partir de los nombres de métodos.
 * 
 * Métodos:
 * - findByFamiliarId(): busca pacientes vinculados a un familiar específico
 * - Hereda: findById, findAll, save, delete, count... de JpaRepository
 */
@Repository
public interface AbueloRepository extends JpaRepository<Abuelo, Long> {
    List<Abuelo> findByFamiliarId(Long familiarId);
}
