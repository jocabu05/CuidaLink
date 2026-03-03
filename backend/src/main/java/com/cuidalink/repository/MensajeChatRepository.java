package com.cuidalink.repository;

import com.cuidalink.entity.MensajeChat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio JPA para la entidad MensajeChat.
 * 
 * Métodos:
 * - findByAbueloIdOrderByTimestampAsc(): todos los mensajes en orden cronológico
 * - findTop100ByAbueloIdOrderByTimestampDesc(): últimos 100 mensajes (se invierten en el controller)
 */
@Repository
public interface MensajeChatRepository extends JpaRepository<MensajeChat, Long> {
    List<MensajeChat> findByAbueloIdOrderByTimestampAsc(Long abueloId);
    List<MensajeChat> findTop100ByAbueloIdOrderByTimestampDesc(Long abueloId);
}
