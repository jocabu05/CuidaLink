package com.cuidalink.dto;

import lombok.Data;

@Data
public class CheckinRequest {
    private Long abueloId;
    private String selfieBase64;
    private Double lat;
    private Double lng;
}
