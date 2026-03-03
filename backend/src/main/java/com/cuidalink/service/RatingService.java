package com.cuidalink.service;

import com.cuidalink.dto.RatingRequest;
import com.cuidalink.dto.RatingResponse;
import com.cuidalink.entity.Abuelo;
import com.cuidalink.entity.Cuidadora;
import com.cuidalink.entity.Rating;
import com.cuidalink.repository.AbueloRepository;
import com.cuidalink.repository.CuidadoraRepository;
import com.cuidalink.repository.RatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RatingService {
    
    private final RatingRepository ratingRepository;
    private final CuidadoraRepository cuidadoraRepository;
    private final AbueloRepository abueloRepository;
    
    @Transactional
    public Rating crearRating(Long familiarId, RatingRequest request) {
        Cuidadora cuidadora = cuidadoraRepository.findById(request.getCuidadoraId())
                .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));
        
        Abuelo abuelo = abueloRepository.findById(request.getAbueloId())
                .orElseThrow(() -> new RuntimeException("Abuelo no encontrado"));
        
        Rating rating = Rating.builder()
                .cuidadora(cuidadora)
                .abuelo(abuelo)
                .familiarId(familiarId)
                .estrellas(request.getEstrellas())
                .comentario(request.getComentario())
                .build();
        
        Rating saved = ratingRepository.save(rating);
        
        // Actualizar promedio de cuidadora
        actualizarPromedioCuidadora(cuidadora.getId());
        
        return saved;
    }
    
    public RatingResponse getRatingsCuidadora(Long cuidadoraId) {
        Cuidadora cuidadora = cuidadoraRepository.findById(cuidadoraId)
                .orElseThrow(() -> new RuntimeException("Cuidadora no encontrada"));
        
        List<Rating> ratings = ratingRepository.findByCuidadoraIdOrderByFechaDesc(cuidadoraId);
        
        List<RatingResponse.RatingItem> ratingItems = ratings.stream()
                .limit(10)
                .map(r -> RatingResponse.RatingItem.builder()
                        .estrellas(r.getEstrellas())
                        .comentario(r.getComentario())
                        .fecha(r.getFecha())
                        .nombreFamiliar("Familiar")
                        .build())
                .collect(Collectors.toList());
        
        return RatingResponse.builder()
                .cuidadoraId(cuidadoraId)
                .nombreCuidadora(cuidadora.getNombre())
                .promedioEstrellas(cuidadora.getRatingPromedio())
                .totalRatings(cuidadora.getTotalRatings())
                .ultimosRatings(ratingItems)
                .build();
    }
    
    private void actualizarPromedioCuidadora(Long cuidadoraId) {
        Double promedio = ratingRepository.calcularPromedioRating(cuidadoraId);
        Long total = ratingRepository.countByCuidadoraId(cuidadoraId);
        
        Cuidadora cuidadora = cuidadoraRepository.findById(cuidadoraId).orElseThrow();
        cuidadora.setRatingPromedio(promedio != null ? 
                BigDecimal.valueOf(promedio).setScale(1, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        cuidadora.setTotalRatings(total != null ? total.intValue() : 0);
        
        cuidadoraRepository.save(cuidadora);
    }
}
