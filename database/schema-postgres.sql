-- ============================================================================
-- CuidaLink — Esquema PostgreSQL (Neon Cloud)
-- Compatible con: PostgreSQL 15+ / Neon Serverless
-- ============================================================================

-- TABLA: abuelos
CREATE TABLE IF NOT EXISTS abuelos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    familiar_id BIGINT,
    telefono_emergencia VARCHAR(15),
    foto_perfil TEXT,
    notas_medicas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_abuelos_familiar ON abuelos(familiar_id);

-- TABLA: cuidadoras
CREATE TABLE IF NOT EXISTS cuidadoras (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(15) UNIQUE,
    pin VARCHAR(4),
    foto_perfil TEXT,
    rating_promedio DECIMAL(2,1) DEFAULT 0,
    total_ratings INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cuidadoras_telefono ON cuidadoras(telefono);

-- TABLA: familiares
CREATE TABLE IF NOT EXISTS familiares (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telefono VARCHAR(15),
    password VARCHAR(60) NOT NULL,
    parentesco VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_familiares_email ON familiares(email);

-- TABLA: eventos (usa VARCHAR en vez de ENUM para compatibilidad)
CREATE TABLE IF NOT EXISTS eventos (
    id BIGSERIAL PRIMARY KEY,
    abuelo_id BIGINT REFERENCES abuelos(id) ON DELETE SET NULL,
    cuidadora_id BIGINT REFERENCES cuidadoras(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('LLEGADA','PASTILLA','COMIDA','PASEO','SIESTA','CAIDA','SALIDA','FUGA')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    foto_base64 TEXT,
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    verificado BOOLEAN DEFAULT FALSE,
    datos_extra TEXT,
    descripcion VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_eventos_abuelo_fecha ON eventos(abuelo_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);

-- TABLA: ratings
CREATE TABLE IF NOT EXISTS ratings (
    id BIGSERIAL PRIMARY KEY,
    cuidadora_id BIGINT REFERENCES cuidadoras(id) ON DELETE CASCADE,
    abuelo_id BIGINT REFERENCES abuelos(id) ON DELETE SET NULL,
    familiar_id BIGINT,
    estrellas SMALLINT CHECK (estrellas BETWEEN 1 AND 5),
    comentario TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ratings_cuidadora ON ratings(cuidadora_id);

-- TABLA: paseos
CREATE TABLE IF NOT EXISTS paseos (
    id BIGSERIAL PRIMARY KEY,
    abuelo_id BIGINT REFERENCES abuelos(id) ON DELETE SET NULL,
    cuidadora_id BIGINT REFERENCES cuidadoras(id) ON DELETE SET NULL,
    inicio TIMESTAMP,
    fin TIMESTAMP,
    ruta_geojson TEXT,
    distancia_km DECIMAL(4,2),
    activo BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_paseos_activo ON paseos(cuidadora_id, activo);

-- TABLA: notas
CREATE TABLE IF NOT EXISTS notas (
    id BIGSERIAL PRIMARY KEY,
    texto VARCHAR(1000) NOT NULL,
    autor VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    prioridad VARCHAR(10) DEFAULT 'normal',
    abuelo_id BIGINT DEFAULT 1
);

-- TABLA: mensajes_chat
CREATE TABLE IF NOT EXISTS mensajes_chat (
    id BIGSERIAL PRIMARY KEY,
    abuelo_id BIGINT NOT NULL,
    remitente VARCHAR(20) NOT NULL,
    text VARCHAR(1000) NOT NULL,
    type VARCHAR(10) DEFAULT 'text',
    audio_base64 TEXT,
    audio_duration INT,
    image_base64 TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE
);

-- TABLA: citas
CREATE TABLE IF NOT EXISTS citas (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'OTRO' CHECK (tipo IN ('CITA_MEDICA','MEDICAMENTO','ACTIVIDAD','VISITA','OTRO')),
    notas VARCHAR(500),
    creado_por VARCHAR(20) NOT NULL,
    abuelo_id BIGINT NOT NULL DEFAULT 1 REFERENCES abuelos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_citas_abuelo_fecha ON citas(abuelo_id, fecha);
