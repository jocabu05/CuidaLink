-- CuidaLink — Seed Data para PostgreSQL / Neon
-- Se ejecuta automáticamente con el perfil 'prod'

-- Cuidadoras (solo si no existen)
INSERT INTO cuidadoras (nombre, telefono, pin, rating_promedio, total_ratings, activo)
SELECT 'María García', '645123456', '1234', 4.7, 23, true
WHERE NOT EXISTS (SELECT 1 FROM cuidadoras WHERE telefono = '645123456');

INSERT INTO cuidadoras (nombre, telefono, pin, rating_promedio, total_ratings, activo)
SELECT 'Ana López', '655987654', '5678', 4.5, 15, true
WHERE NOT EXISTS (SELECT 1 FROM cuidadoras WHERE telefono = '655987654');

INSERT INTO cuidadoras (nombre, telefono, pin, rating_promedio, total_ratings, activo)
SELECT 'Lucía Martínez', '666111222', '9999', 4.9, 31, true
WHERE NOT EXISTS (SELECT 1 FROM cuidadoras WHERE telefono = '666111222');

-- Familiares
INSERT INTO familiares (nombre, email, telefono, password, parentesco)
SELECT 'Laura Ruiz', 'laura@cuidalink.com', '666333111', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDqEBIEiF3a2PnSdCr/AWY/08.WV8y', 'Hija'
WHERE NOT EXISTS (SELECT 1 FROM familiares WHERE email = 'laura@cuidalink.com');

INSERT INTO familiares (nombre, email, telefono, password, parentesco)
SELECT 'Carlos Fernández', 'carlos@cuidalink.com', '666333222', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDqEBIEiF3a2PnSdCr/AWY/08.WV8y', 'Hijo'
WHERE NOT EXISTS (SELECT 1 FROM familiares WHERE email = 'carlos@cuidalink.com');

-- Abuelos (pacientes en Valencia)
INSERT INTO abuelos (nombre, direccion, lat, lng, familiar_id, telefono_emergencia, notas_medicas)
SELECT 'Carmen Ruiz', 'Calle Ruzafa 45, Valencia', 39.4619, -0.3778, 1, '961234567', 'Sinemet 10mg - 10:30h y 18:30h'
WHERE NOT EXISTS (SELECT 1 FROM abuelos WHERE nombre = 'Carmen Ruiz');

INSERT INTO abuelos (nombre, direccion, lat, lng, familiar_id, telefono_emergencia, notas_medicas)
SELECT 'José Fernández', 'Avenida del Puerto 112, Valencia', 39.4568, -0.3421, 2, '961987654', 'Aricept 5mg - mañanas'
WHERE NOT EXISTS (SELECT 1 FROM abuelos WHERE nombre = 'José Fernández');

-- Eventos de ejemplo
INSERT INTO eventos (abuelo_id, cuidadora_id, tipo, verificado, descripcion)
SELECT 1, 1, 'LLEGADA', true, 'Llegada puntual'
WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE descripcion = 'Llegada puntual');

INSERT INTO eventos (abuelo_id, cuidadora_id, tipo, verificado, descripcion)
SELECT 1, 1, 'PASTILLA', true, 'Sinemet 10mg administrado'
WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE descripcion = 'Sinemet 10mg administrado');

-- Notas de ejemplo
INSERT INTO notas (texto, autor, timestamp, leida, prioridad, abuelo_id)
SELECT 'Recordar comprar más Sinemet', 'familiar', CURRENT_TIMESTAMP, false, 'normal', 1
WHERE NOT EXISTS (SELECT 1 FROM notas WHERE texto = 'Recordar comprar más Sinemet');

-- Rating de ejemplo
INSERT INTO ratings (cuidadora_id, abuelo_id, familiar_id, estrellas, comentario)
SELECT 1, 1, 1, 5, 'Excelente trabajo, muy atenta y cariñosa'
WHERE NOT EXISTS (SELECT 1 FROM ratings WHERE comentario = 'Excelente trabajo, muy atenta y cariñosa');

-- Citas de ejemplo
INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id)
SELECT 'Revisión neurológica', '2026-03-10', '10:00', 'CITA_MEDICA', 'Dr. Alejandro Vidal - Hospital La Fe', 'familiar', 1
WHERE NOT EXISTS (SELECT 1 FROM citas WHERE titulo = 'Revisión neurológica');

INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id)
SELECT 'Análisis de sangre', '2026-03-05', '09:00', 'CITA_MEDICA', 'Centro de salud - En ayunas', 'cuidadora', 1
WHERE NOT EXISTS (SELECT 1 FROM citas WHERE titulo = 'Análisis de sangre');
