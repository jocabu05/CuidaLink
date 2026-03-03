package com.cuidalink.dto;

import lombok.Data;

@Data
public class RatingRequest {
    private Long cuidadoraId;
    private Long abueloId;
    private Integer estrellas;
    private String comentario;
}
