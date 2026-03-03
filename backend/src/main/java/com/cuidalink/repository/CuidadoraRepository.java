package com.cuidalink.repository;

import com.cuidalink.entity.Cuidadora;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio JPA para la entidad Cuidadora.
 * 
 * Métodos:
 * - findByTelefono(): busca cuidadora por teléfono (usado en login)
 * - findByTelefonoAndPin(): búsqueda combinada (no usado actualmente, el PIN se verifica con BCrypt)
 * - existsByTelefono(): verifica si ya existe una cuidadora con ese teléfono
 */
@Repository
public interface CuidadoraRepository extends JpaRepository<Cuidadora, Long> {
    Optional<Cuidadora> findByTelefono(String telefono);
    Optional<Cuidadora> findByTelefonoAndPin(String telefono, String pin);
    boolean existsByTelefono(String telefono);
}
