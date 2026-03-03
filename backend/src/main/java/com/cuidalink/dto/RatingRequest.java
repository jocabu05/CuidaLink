package com.cuidalink.dto;

import lombok.Data;

/**
 * DTO de petición de valoración de cuidadora.
 * - cuidadoraId: la profesional a valorar
 * - abueloId: paciente relacionado
 * - estrellas: puntuación 1-5
 * - comentario: texto explicativo opcional
 */
@Data
public class RatingRequest {
    private Long cuidadoraId;
    private Long abueloId;
    private Integer estrellas;
    private String comentario;
}
