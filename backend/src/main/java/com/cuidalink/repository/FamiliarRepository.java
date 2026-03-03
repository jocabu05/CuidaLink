package com.cuidalink.repository;

import com.cuidalink.entity.Familiar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FamiliarRepository extends JpaRepository<Familiar, Long> {
    Optional<Familiar> findByEmail(String email);
    boolean existsByEmail(String email);
}
