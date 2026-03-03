package com.cuidalink.repository;

import com.cuidalink.entity.Nota;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotaRepository extends JpaRepository<Nota, Long> {

    List<Nota> findByAbueloIdAndLeidaFalseOrderByTimestampDesc(Long abueloId);

    List<Nota> findByAbueloIdOrderByTimestampDesc(Long abueloId);
    
    Page<Nota> findByAbueloIdOrderByTimestampDesc(Long abueloId, Pageable pageable);

    List<Nota> findByAbueloIdAndAutorOrderByTimestampDesc(Long abueloId, String autor);
}
