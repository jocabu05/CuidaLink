-- ============================================================================
-- CuidaLink - Esquema de Base de Datos
-- Motor: MySQL 8.0+
-- Descripción: Base de datos para la app de asistencia a cuidadores de
--              pacientes con Alzheimer. Gestiona pacientes, cuidadoras,
--              familiares, eventos diarios, paseos con GPS, valoraciones,
--              citas compartidas y sistema de chat.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS cuidalink;
USE cuidalink;

-- ============================================================================
-- TABLA: abuelos
-- Almacena los datos de los pacientes con Alzheimer.
-- Cada paciente tiene coordenadas GPS de su domicilio para geofencing
-- y está vinculado a un familiar que supervisa su cuidado.
-- ============================================================================
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

-- ============================================================================
-- TABLA: cuidadoras
-- Almacena los datos de las profesionales que cuidan a los pacientes.
-- Se autentican con teléfono + PIN (hasheado con BCrypt).
-- Mantiene un sistema de valoraciones con promedio acumulado.
-- ============================================================================
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

-- ============================================================================
-- TABLA: eventos
-- Registro central de TODAS las actividades diarias del cuidado.
-- Tipos: LLEGADA (check-in GPS), PASTILLA (con verificación OCR),
--         COMIDA (con foto), PASEO, SIESTA, CAIDA (emergencia),
--         SALIDA (fin jornada), FUGA (alerta zona segura).
-- Cada evento puede incluir foto (base64), coordenadas GPS y datos JSON.
-- ============================================================================
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

-- ============================================================================
-- TABLA: ratings
-- Sistema de valoración (1-5 estrellas) que los familiares dan a las
-- cuidadoras. Se usa para calcular el rating promedio de cada cuidadora.
-- ============================================================================
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

-- ============================================================================
-- TABLA: paseos
-- Tracking GPS de paseos con pacientes. Almacena la ruta completa en
-- formato GeoJSON, distancia recorrida y tiempos de inicio/fin.
-- Solo puede haber un paseo activo por cuidadora a la vez.
-- ============================================================================
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

-- Datos de prueba: 3 cuidadoras con diferentes ratings
INSERT INTO cuidadoras (nombre, telefono, pin, rating_promedio, total_ratings) VALUES
    ('María García', '645123456', '1234', 4.7, 23),   -- PIN: 1234
    ('Ana López', '655987654', '5678', 4.5, 15),       -- PIN: 5678
    ('Lucía Martínez', '666111222', '9999', 4.9, 31); -- PIN: 9999

-- ============================================================================
-- TABLA: familiares
-- Familiares de los pacientes que acceden a la app para supervisar.
-- Se autentican con email + contraseña (hasheada con BCrypt).
-- Cada familiar tiene un parentesco con el paciente.
-- ============================================================================
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

-- Datos de prueba: 3 familiares (contraseñas hasheadas con BCrypt en producción)
INSERT INTO familiares (nombre, email, telefono, password, parentesco) VALUES
    ('Laura Ruiz', 'laura@cuidalink.com', '666333111', '$2a$10$PLACEHOLDER_HASH_1', 'Hija'),
    ('Carlos Fernández', 'carlos@cuidalink.com', '666333222', '$2a$10$PLACEHOLDER_HASH_2', 'Hijo'),
    ('Marta Sánchez', 'marta@cuidalink.com', '666333333', '$2a$10$PLACEHOLDER_HASH_3', 'Hija');

-- Datos de prueba: 3 pacientes en Valencia, cada uno vinculado a un familiar
INSERT INTO abuelos (nombre, direccion, lat, lng, familiar_id, telefono_emergencia, notas_medicas) VALUES
    ('Carmen Ruiz', 'Calle Ruzafa 45, Valencia', 39.4619, -0.3778, 1, '961234567', 'Sinemet 10mg - 10:30h y 18:30h'),
    ('José Fernández', 'Avenida del Puerto 112, Valencia', 39.4568, -0.3421, 2, '961987654', 'Aricept 5mg - mañanas'),
    ('Pilar Sánchez', 'Calle Colón 78, Valencia', 39.4702, -0.3755, 3, '961555666', 'Memantina 10mg - noche');

-- ============================================================================
-- TABLA: citas
-- Calendario compartido entre cuidadora y familiar.
-- Tipos: CITA_MEDICA, MEDICAMENTO, ACTIVIDAD, VISITA, OTRO.
-- Permite a ambos roles crear y ver citas del paciente.
-- ============================================================================
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

-- Datos de prueba: citas variadas para el paciente Carmen (id=1)
INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id) VALUES
    ('Revisión neurológica', '2026-03-10', '10:00', 'CITA_MEDICA', 'Dr. Alejandro Vidal - Hospital La Fe', 'familiar', 1),
    ('Análisis de sangre', '2026-03-05', '09:00', 'CITA_MEDICA', 'Centro de salud - En ayunas', 'cuidadora', 1),
    ('Visita de Laura', '2026-03-08', '17:00', 'VISITA', 'Viene con los nietos', 'familiar', 1),
    ('Revisión medicación', '2026-03-15', '11:30', 'MEDICAMENTO', 'Ajustar dosis Memantina', 'cuidadora', 1),
    ('Taller de estimulación', '2026-02-25', '10:00', 'ACTIVIDAD', 'Centro de día', 'cuidadora', 1),
    ('Fisioterapia', '2026-02-25', '16:00', 'ACTIVIDAD', NULL, 'cuidadora', 1),
    ('Podólogo', '2026-02-28', '12:00', 'CITA_MEDICA', 'Clínica podológica Alzira', 'familiar', 1);
