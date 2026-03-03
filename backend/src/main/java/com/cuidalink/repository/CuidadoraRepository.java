package com.cuidalink.repository;

import com.cuidalink.entity.Cuidadora;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CuidadoraRepository extends JpaRepository<Cuidadora, Long> {
    Optional<Cuidadora> findByTelefono(String telefono);
    Optional<Cuidadora> findByTelefonoAndPin(String telefono, String pin);
    boolean existsByTelefono(String telefono);
}
