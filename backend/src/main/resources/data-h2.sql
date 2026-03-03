-- CuidaLink H2 Seed Data
-- Loaded automatically when using profile 'dev'

-- Cuidadoras
INSERT INTO cuidadoras (nombre, telefono, pin, rating_promedio, total_ratings, activo) VALUES
    ('María García', '645123456', '1234', 4.7, 23, true);
INSERT INTO cuidadoras (nombre, telefono, pin, rating_promedio, total_ratings, activo) VALUES
    ('Ana López', '655987654', '5678', 4.5, 15, true);
INSERT INTO cuidadoras (nombre, telefono, pin, rating_promedio, total_ratings, activo) VALUES
    ('Lucía Martínez', '666111222', '9999', 4.9, 31, true);

-- Abuelos
INSERT INTO abuelos (nombre, direccion, lat, lng, familiar_id, telefono_emergencia, notas_medicas) VALUES
    ('Carmen Ruiz', 'Calle Ruzafa 45, Valencia', 39.4619, -0.3778, 1, '961234567', 'Sinemet 10mg - 10:30h y 18:30h');
INSERT INTO abuelos (nombre, direccion, lat, lng, familiar_id, telefono_emergencia, notas_medicas) VALUES
    ('José Fernández', 'Avenida del Puerto 112, Valencia', 39.4568, -0.3421, 2, '961987654', 'Aricept 5mg - mañanas');
INSERT INTO abuelos (nombre, direccion, lat, lng, familiar_id, telefono_emergencia, notas_medicas) VALUES
    ('Pilar Sánchez', 'Calle Colón 78, Valencia', 39.4702, -0.3755, 3, '961555666', 'Memantina 10mg - noche');

-- Sample events
INSERT INTO eventos (abuelo_id, cuidadora_id, tipo, verificado, descripcion, timestamp) VALUES
    (1, 1, 'LLEGADA', true, 'Llegada puntual', CURRENT_TIMESTAMP);
INSERT INTO eventos (abuelo_id, cuidadora_id, tipo, verificado, descripcion, timestamp) VALUES
    (1, 1, 'PASTILLA', true, 'Sinemet 10mg administrado', CURRENT_TIMESTAMP);
INSERT INTO eventos (abuelo_id, cuidadora_id, tipo, verificado, descripcion, timestamp) VALUES
    (1, 1, 'COMIDA', true, 'Almuerzo preparado y servido', CURRENT_TIMESTAMP);
INSERT INTO eventos (abuelo_id, cuidadora_id, tipo, verificado, descripcion, timestamp) VALUES
    (1, 1, 'PASEO', true, 'Paseo de 30 minutos por el barrio', CURRENT_TIMESTAMP);

-- Sample notes
INSERT INTO notas (texto, autor, timestamp, leida, prioridad, abuelo_id) VALUES
    ('Recordar comprar más Sinemet', 'familiar', CURRENT_TIMESTAMP, false, 'normal', 1);
INSERT INTO notas (texto, autor, timestamp, leida, prioridad, abuelo_id) VALUES
    ('La cita del médico es el jueves a las 11:00', 'familiar', CURRENT_TIMESTAMP, false, 'urgente', 1);

-- Sample rating
INSERT INTO ratings (cuidadora_id, abuelo_id, familiar_id, estrellas, comentario) VALUES
    (1, 1, 1, 5, 'Excelente trabajo, muy atenta y cariñosa');

-- Citas (calendario compartido)
INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id, created_at) VALUES
    ('Revisión neurológica', '2026-03-10', '10:00:00', 'CITA_MEDICA', 'Dr. Alejandro Vidal - Hospital La Fe', 'familiar', 1, CURRENT_TIMESTAMP);
INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id, created_at) VALUES
    ('Análisis de sangre', '2026-03-05', '09:00:00', 'CITA_MEDICA', 'Centro de salud - En ayunas', 'cuidadora', 1, CURRENT_TIMESTAMP);
INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id, created_at) VALUES
    ('Visita de Laura', '2026-03-08', '17:00:00', 'VISITA', 'Viene con los nietos', 'familiar', 1, CURRENT_TIMESTAMP);
INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id, created_at) VALUES
    ('Revisión medicación', '2026-03-15', '11:30:00', 'MEDICAMENTO', 'Ajustar dosis Memantina', 'cuidadora', 1, CURRENT_TIMESTAMP);
INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id, created_at) VALUES
    ('Taller de estimulación', '2026-02-25', '10:00:00', 'ACTIVIDAD', 'Centro de día', 'cuidadora', 1, CURRENT_TIMESTAMP);
INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id, created_at) VALUES
    ('Fisioterapia', '2026-02-25', '16:00:00', 'ACTIVIDAD', NULL, 'cuidadora', 1, CURRENT_TIMESTAMP);
INSERT INTO citas (titulo, fecha, hora, tipo, notas, creado_por, abuelo_id, created_at) VALUES
    ('Podólogo', '2026-02-28', '12:00:00', 'CITA_MEDICA', 'Clínica podológica Alzira', 'familiar', 1, CURRENT_TIMESTAMP);
