package com.cuidalink.repository;

import com.cuidalink.entity.Abuelo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AbueloRepository extends JpaRepository<Abuelo, Long> {
    List<Abuelo> findByFamiliarId(Long familiarId);
}
