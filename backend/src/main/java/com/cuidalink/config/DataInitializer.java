package com.cuidalink.config;

import com.cuidalink.entity.*;
import com.cuidalink.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {
    
    private final PasswordEncoder passwordEncoder;
    
    @Bean
    CommandLineRunner initData(
            CuidadoraRepository cuidadoraRepository,
            AbueloRepository abueloRepository,
            FamiliarRepository familiarRepository) {
        
        return args -> {
            // Solo inicializar si la base de datos está vacía
            if (cuidadoraRepository.count() > 0) {
                log.info("Base de datos ya inicializada, saltando...");
                return;
            }
            
            log.info("Inicializando datos de prueba...");
            
            // Crear cuidadoras de demo (PINs hasheados con BCrypt)
            Cuidadora maria = cuidadoraRepository.save(Cuidadora.builder()
                    .nombre("María García")
                    .telefono("645123456")
                    .pin(passwordEncoder.encode("1234"))
                    .ratingPromedio(BigDecimal.valueOf(4.7))
                    .totalRatings(23)
                    .activo(true)
                    .build());
            
            Cuidadora ana = cuidadoraRepository.save(Cuidadora.builder()
                    .nombre("Ana López")
                    .telefono("655987654")
                    .pin(passwordEncoder.encode("5678"))
                    .ratingPromedio(BigDecimal.valueOf(4.5))
                    .totalRatings(15)
                    .activo(true)
                    .build());
            
            Cuidadora lucia = cuidadoraRepository.save(Cuidadora.builder()
                    .nombre("Lucía Martínez")
                    .telefono("666111222")
                    .pin(passwordEncoder.encode("9999"))
                    .ratingPromedio(BigDecimal.valueOf(4.9))
                    .totalRatings(31)
                    .activo(true)
                    .build());
            
            log.info("Cuidadoras creadas: María, Ana, Lucía");
            
            // Crear abuelos de demo
            Abuelo carmen = abueloRepository.save(Abuelo.builder()
                    .nombre("Carmen Ruiz")
                    .direccion("Calle Ruzafa 45, Valencia")
                    .lat(39.4619)
                    .lng(-0.3778)
                    .familiarId(1L)
                    .telefonoEmergencia("961234567")
                    .notasMedicas("Sinemet 10mg - 10:30h y 18:30h. Paseo diario recomendado.")
                    .build());
            
            Abuelo jose = abueloRepository.save(Abuelo.builder()
                    .nombre("José Fernández")
                    .direccion("Avenida del Puerto 112, Valencia")
                    .lat(39.4568)
                    .lng(-0.3421)
                    .familiarId(2L)
                    .telefonoEmergencia("961987654")
                    .notasMedicas("Aricept 5mg - mañanas. Restricción de sal.")
                    .build());
            
            Abuelo pilar = abueloRepository.save(Abuelo.builder()
                    .nombre("Pilar Sánchez")
                    .direccion("Calle Colón 78, Valencia")
                    .lat(39.4702)
                    .lng(-0.3755)
                    .familiarId(3L)
                    .telefonoEmergencia("961555666")
                    .notasMedicas("Memantina 10mg - noche. Diabetes controlada.")
                    .build());
            
            log.info("Abuelos creados: Carmen, José, Pilar");
            
            // Crear familiares de demo
            Familiar laura = familiarRepository.save(Familiar.builder()
                    .nombre("Laura Ruiz")
                    .email("laura@cuidalink.com")
                    .telefono("666333111")
                    .password(passwordEncoder.encode("familia123"))
                    .parentesco("Hija")
                    .activo(true)
                    .build());
            
            Familiar carlos = familiarRepository.save(Familiar.builder()
                    .nombre("Carlos Fernández")
                    .email("carlos@cuidalink.com")
                    .telefono("666333222")
                    .password(passwordEncoder.encode("familia123"))
                    .parentesco("Hijo")
                    .activo(true)
                    .build());
            
            Familiar marta = familiarRepository.save(Familiar.builder()
                    .nombre("Marta Sánchez")
                    .email("marta@cuidalink.com")
                    .telefono("666333333")
                    .password(passwordEncoder.encode("familia123"))
                    .parentesco("Hija")
                    .activo(true)
                    .build());
            
            log.info("Familiares creados: Laura, Carlos, Marta");
            log.info("✅ Datos de prueba inicializados correctamente");
            log.info("📱 Login cuidadora: 645123456 / PIN: 1234");
            log.info("👨‍👩‍👧 Login familiar: laura@cuidalink.com / familia123");
        };
    }
}
