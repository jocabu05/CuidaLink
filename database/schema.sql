-- CuidaLink Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS cuidalink;
USE cuidalink;

-- Tabla de abuelos (pacientes)
CREATE TABLE IF NOT EXISTS abuelos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    familiar_id BIGINT,
    telefono_emergencia VARCHAR(15),
    foto_perfil LONGTEXT,
    notas_medicas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_familiar (familiar_id)
);

-- Tabla de cuidadoras
CREATE TABLE IF NOT EXISTS cuidadoras (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(15) UNIQUE,
    pin VARCHAR(4),
    foto_perfil LONGTEXT,
    rating_promedio DECIMAL(2,1) DEFAULT 0,
    total_ratings INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_telefono (telefono)
);

-- Tabla de eventos (llegadas, pastillas, comidas, paseos, etc.)
CREATE TABLE IF NOT EXISTS eventos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    abuelo_id BIGINT,
    cuidadora_id BIGINT,
    tipo ENUM('LLEGADA', 'PASTILLA', 'COMIDA', 'PASEO', 'SIESTA', 'CAIDA', 'SALIDA', 'FUGA') NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    foto_base64 LONGTEXT,
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    verificado BOOLEAN DEFAULT FALSE,
    datos_extra JSON,
    descripcion VARCHAR(255),
    FOREIGN KEY (abuelo_id) REFERENCES abuelos(id) ON DELETE SET NULL,
    FOREIGN KEY (cuidadora_id) REFERENCES cuidadoras(id) ON DELETE SET NULL,
    INDEX idx_abuelo_fecha (abuelo_id, timestamp),
    INDEX idx_tipo (tipo)
);

-- Tabla de ratings (valoraciones)
CREATE TABLE IF NOT EXISTS ratings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cuidadora_id BIGINT,
    abuelo_id BIGINT,
    familiar_id BIGINT,
    estrellas TINYINT CHECK (estrellas BETWEEN 1 AND 5),
    comentario TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cuidadora_id) REFERENCES cuidadoras(id) ON DELETE CASCADE,
    FOREIGN KEY (abuelo_id) REFERENCES abuelos(id) ON DELETE SET NULL,
    INDEX idx_cuidadora (cuidadora_id)
);

-- Tabla de paseos (tracking de rutas)
CREATE TABLE IF NOT EXISTS paseos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    abuelo_id BIGINT,
    cuidadora_id BIGINT,
    inicio DATETIME,
    fin DATETIME,
    ruta_geojson JSON,
    distancia_km DECIMAL(4,2),
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (abuelo_id) REFERENCES abuelos(id) ON DELETE SET NULL,
    FOREIGN KEY (cuidadora_id) REFERENCES cuidadoras(id) ON DELETE SET NULL,
    INDEX idx_activo (cuidadora_id, activo)
);

-- Datos de prueba
INSERT INTO cuidadoras (nombre, telefono, pin, rating_promedio, total_ratings) VALUES
    ('María García', '645123456', '1234', 4.7, 23),
    ('Ana López', '655987654', '5678', 4.5, 15),
    ('Lucía Martínez', '666111222', '9999', 4.9, 31);

-- Tabla de familiares (acceso para familiares del paciente)
CREATE TABLE IF NOT EXISTS familiares (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telefono VARCHAR(15),
    password VARCHAR(60) NOT NULL,
    parentesco VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

INSERT INTO familiares (nombre, email, telefono, password, parentesco) VALUES
    ('Laura Ruiz', 'laura@cuidalink.com', '666333111', '$2a$10$PLACEHOLDER_HASH_1', 'Hija'),
    ('Carlos Fernández', 'carlos@cuidalink.com', '666333222', '$2a$10$PLACEHOLDER_HASH_2', 'Hijo'),
    ('Marta Sánchez', 'marta@cuidalink.com', '666333333', '$2a$10$PLACEHOLDER_HASH_3', 'Hija');

INSERT INTO abuelos (nombre, direccion, lat, lng, familiar_id, telefono_emergencia, notas_medicas) VALUES
    ('Carmen Ruiz', 'Calle Ruzafa 45, Valencia', 39.4619, -0.3778, 1, '961234567', 'Sinemet 10mg - 10:30h y 18:30h'),
    ('José Fernández', 'Avenida del Puerto 112, Valencia', 39.4568, -0.3421, 2, '961987654', 'Aricept 5mg - mañanas'),
    ('Pilar Sánchez', 'Calle Colón 78, Valencia', 39.4702, -0.3755, 3, '961555666', 'Memantina 10mg - noche');

-- Tabla de citas (calendario compartido)
CREATE TABLE IF NOT EXISTS citas (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    tipo ENUM('CITA_MEDICA', 'MEDICAMENTO', 'ACTIVIDAD', 'VISITA', 'OTRO') NOT NULL DEFAULT 'OTRO',
    notas VARCHAR(500),
    creado_por VARCHAR(20) NOT NULL,
    abuelo_id BIGINT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (abuelo_id) REFERENCES abuelos(id) ON DELETE CASCADE,
    INDEX idx_abuelo_fecha (abuelo_id, fecha)
);

INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id) VALUES
    ('Revisión neurológica', '2026-03-10', '10:00', 'CITA_MEDICA', 'Dr. Alejandro Vidal - Hospital La Fe', 'familiar', 1),
    ('Análisis de sangre', '2026-03-05', '09:00', 'CITA_MEDICA', 'Centro de salud - En ayunas', 'cuidadora', 1),
    ('Visita de Laura', '2026-03-08', '17:00', 'VISITA', 'Viene con los nietos', 'familiar', 1),
    ('Revisión medicación', '2026-03-15', '11:30', 'MEDICAMENTO', 'Ajustar dosis Memantina', 'cuidadora', 1),
    ('Taller de estimulación', '2026-02-25', '10:00', 'ACTIVIDAD', 'Centro de día', 'cuidadora', 1),
    ('Fisioterapia', '2026-02-25', '16:00', 'ACTIVIDAD', NULL, 'cuidadora', 1),
    ('Podólogo', '2026-02-28', '12:00', 'CITA_MEDICA', 'Clínica podológica Alzira', 'familiar', 1);
