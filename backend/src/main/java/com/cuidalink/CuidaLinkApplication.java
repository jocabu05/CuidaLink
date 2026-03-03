package com.cuidalink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Clase principal de la aplicación CuidaLink.
 * Punto de entrada del backend Spring Boot.
 * Arranca el servidor embebido (Tomcat) en el puerto 8080
 * y escanea automáticamente todos los componentes del paquete com.cuidalink.
 */
@SpringBootApplication
public class CuidaLinkApplication {
    public static void main(String[] args) {
        SpringApplication.run(CuidaLinkApplication.class, args);
    }
}
