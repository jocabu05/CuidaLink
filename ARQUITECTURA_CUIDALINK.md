# 📱 CuidaLink — Guía Completa de la Arquitectura

**Aplicación de asistencia a cuidadores de pacientes con Alzheimer**

---

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Arquitectura Backend](#arquitectura-backend)
3. [Arquitectura Mobile](#arquitectura-mobile)
4. [Flujo de Datos](#flujo-de-datos)
5. [Pantallas Principales](#pantallas-principales)
6. [Servicios Críticos](#servicios-críticos)
7. [Autenticación y Seguridad](#autenticación-y-seguridad)

---

## 🎯 Visión General

### Stack Tecnológico
```
┌─────────────────────────────────────────────────┐
│         FRONTEND MOBILE (React Native)           │
│  React Native 0.81 + Expo SDK 54 + TypeScript   │
│  22 Pantallas | 18 Servicios | 4 Componentes    │
└────────────────────┬────────────────────────────┘
                     │ HTTPS REST API
                     │ JWT Bearer Token
                     ▼
┌─────────────────────────────────────────────────┐
│        BACKEND API (Spring Boot 3.2)             │
│  Java 17 | JPA/Hibernate | MySQL/PostgreSQL     │
│  11 Controladores | 6 Servicios | 9 Entidades   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│      BASE DE DATOS (Neon PostgreSQL Cloud)       │
│  8 Tablas | Geofencing | JSON para GPS          │
└─────────────────────────────────────────────────┘
```

### Actores
- **Cuidadora**: Profesional que cuida al paciente. Login: teléfono + PIN
- **Familiar**: Supervisor (hija/hijo). Login: email + contraseña
- **Abuelo**: Paciente con Alzheimer. Datos centrales.

---

## 🏗️ Arquitectura Backend

### 📂 Estructura de Carpetas
```
backend/src/main/java/com/cuidalink/
├── CuidaLinkApplication.java          ← Clase principal de Spring Boot
├── config/
│   ├── SecurityConfig.java            ← JWT, CORS, filtros
│   ├── WebSocketConfig.java           ← Chat en tiempo real (STOMP)
│   ├── DataInitializer.java           ← Datos de demo (BCrypt hashed)
│   └── GlobalExceptionHandler.java    ← Manejo de excepciones HTTP
├── security/
│   ├── JwtTokenProvider.java          ← Generador/validador JWT
│   └── JwtAuthenticationFilter.java   ← Filtro que intercepta requests
├── controller/                         ← Endpoints REST
│   ├── AuthController.java            → /api/auth
│   ├── FamiliarAuthController.java    → /api/familiar/auth
│   ├── EventoController.java          → /api/eventos (actividades)
│   ├── PaseoController.java           → /api/paseos (paseos GPS)
│   ├── ChatController.java            → /api/chat (mensajes)
│   ├── NotaController.java            → /api/notas
│   ├── CitaController.java            → /api/citas (calendario)
│   ├── RatingController.java          → /api/ratings (valoraciones)
│   ├── DashboardController.java       → /api/dashboard (stats)
│   ├── AbueloController.java          → /api/abuelos (pacientes)
│   └── AdminController.java           → /api/admin
├── service/                            ← Lógica de negocio
│   ├── AuthService.java               ← Login cuidadora, JWT
│   ├── EventoService.java             ← Registro de eventos (LLEGADA, PASTILLA, CAIDA...)
│   ├── PaseoService.java              ← Tracking GPS de paseos
│   ├── DashboardService.java          ← Cálculo de estadísticas
│   ├── RatingService.java             ← Gestión de valoraciones
│   ├── WebSocketService.java          ← Chat en tiempo real
│   └── otros...
├── entity/                             ← Clases JPA (tablas)
│   ├── Abuelo.java                    ← Paciente
│   ├── Cuidadora.java                 ← Profesional (PIN hasheado)
│   ├── Familiar.java                  ← Supervisor (contraseña hasheada)
│   ├── Evento.java                    ← Actividad diaria (enum TipoEvento)
│   ├── Paseo.java                     ← Paseo con ruta GeoJSON
│   ├── Rating.java                    ← Valoración 1-5 estrellas
│   ├── MensajeChat.java               ← Mensaje (texto, audio, imagen)
│   ├── Cita.java                      ← Cita del calendario
│   └── Nota.java                      ← Comunicado cuidadora↔familiar
├── dto/                                ← Data Transfer Objects (requests/responses)
│   ├── LoginRequest.java              ← {telefono, pin}
│   ├── LoginResponse.java             ← {token, cuidadoraId, nombre...}
│   ├── EventoRequest.java
│   └── otros...
└── repository/                         ← Interfaz JPA (queries to DB)
    ├── CuidadoraRepository.java       → findByTelefono()
    ├── AbueloRepository.java
    ├── EventoRepository.java          → findByCuidadoraAndTipo()
    └── otros...
```

### 🔑 Entidades Principales

#### **Abuelo (Paciente)**
```java
@Entity
public class Abuelo {
    Long id;
    String nombre;              // "Carmen Ruiz"
    String direccion;           // "Calle Ruzafa 45, Valencia"
    Double lat, lng;            // Coordenadas GPS del domicilio (39.4619, -0.3778)
    Long familiarId;            // Quién lo supervisa
    String telefono_emergencia; // "961234567"
    String notas_medicas;       // "Sinemet 10mg - 10:30h y 18:30h"
    String foto_perfil;         // Base64 de foto
}
```

#### **Cuidadora (Profesional)**
```java
@Entity
public class Cuidadora {
    Long id;
    String nombre;              // "María García"
    String telefono;            // "645123456" (UNIQUE)
    String pin;                 // "1234" ← HASHEADO CON BCRYPT
    String foto_perfil;         // Base64
    Double rating_promedio;     // 4.7 (de 1-5)
    Integer total_ratings;      // Cuántas valoraciones tiene
    Boolean activo;
}
```

#### **Evento (Actividad Diaria)**
```java
@Entity
public class Evento {
    Long id;
    Long abuelo_id;             // FK → a quién se le registra
    Long cuidadora_id;          // FK → quién lo registra
    TipoEvento tipo;            // ENUM: LLEGADA, PASTILLA, COMIDA, PASEO, SIESTA, CAIDA, SALIDA, FUGA
    LocalDateTime timestamp;    // Cuándo pasó
    String foto_base64;         // Foto verificadora (selfie de llegada, pastilla...)
    Double gps_lat, gps_lng;    // Coordenadas GPS
    Boolean verificado;         // ¿Se validó automáticamente? (geofence, OCR)
    String datos_extra;         // JSON con detalles: {"medicamento": "Sinemet", "dosis": "10mg"}
    String descripcion;         // Texto descriptivo
}
```

#### **TipoEvento (Enum de Actividades)**
```
LLEGADA  → Check-in matutino con selfie + GPS (verifica geofence 200m)
PASTILLA → Administración de medicamento (con foto + OCR)
COMIDA   → Preparación/servicio de comida
PASEO    → Paseo completado (tracking GPS completo = GeoJSON)
SIESTA   → Registro de siesta/descanso
CAIDA    → ⚠️ Detección de caída (EMERGENCIA, notifica familia)
SALIDA   → Fin de la jornada de cuidado
FUGA     → ⚠️ Paciente fuera de zona segura (ALERTA MÁXIMA)
```

#### **Familiar (Supervisor)**
```java
@Entity
public class Familiar {
    Long id;
    String nombre;              // "Laura Ruiz"
    String email;               // "laura@cuidalink.com" (UNIQUE)
    String telephone;
    String password;            // HASHEADO CON BCRYPT
    String parentesco;          // "Hija", "Hijo", etc.
    Boolean activo;
}
```

### 🔐 Autenticación y Seguridad

#### **Flujo de Login Cuidadora**
```
1. Usuario ingresa: Teléfono "645123456" + PIN "1234"
2. AuthService.loginCuidadora() busca cuidadora por teléfono
3. Compara PIN contra BCRYPT hasheado en BD
4. Si OK → JwtTokenProvider.generateToken() crea JWT
5. JWT firmado con HMAC-SHA256 (secret en application.yml)
6. Responde: {token: "eyJhbGc...", cuidadoraId: 1, nombre: "María García"}
7. Mobile almacena token en AsyncStorage
8. Cada request añade: Authorization: Bearer <token>
```

#### **JwtTokenProvider.java**
```java
public class JwtTokenProvider {
    // Genera token con subject="cuidadoraId" y rol="CUIDADORA"
    public String generateToken(String identifier, UserRole role) {
        return Jwts.builder()
            .setSubject(identifier)
            .claim("role", role)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(SignatureAlgorithm.HS512, secretKey)
            .compact();
    }
    
    // Valida token y extrae el ID
    public Long getCuidadoraIdFromToken(String token) {
        return Long.parseLong(Jwts.parserBuilder()
            .setSigningKey(secretKey)
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getSubject());
    }
}
```

#### **JwtAuthenticationFilter.java**
```java
// Se ejecuta en CADA request
public void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) {
    String token = extractTokenFromHeader(request); // "Bearer ..."
    
    if (isValidToken(token)) {
        Long cuidadoraId = jwtTokenProvider.getCuidadoraIdFromToken(token);
        // Configura SecurityContext para que @CurrentUser funcione
        SecurityContextHolder.setContext(authentication);
    }
    filterChain.doFilter(request, response);
}
```

---

## 📱 Arquitectura Mobile

### 📂 Estructura de Carpetas
```
mobile/src/
├── App.tsx                         ← Componente raíz con navegación
├── screens/                         ← 22 Pantallas
│   ├── SplashScreen.tsx            → Logo inicial (carga 3s)
│   ├── RoleSelectionScreen.tsx     → Elegir: Cuidadora vs Familiar
│   ├── LoginScreen.tsx             → Login cuidadora (teléfono + PIN)
│   ├── FamiliarLoginScreen.tsx     → Login familiar (email + contraseña)
│   ├── FamiliarRegisterScreen.tsx  → Registro familiar
│   ├── DashboardScreen.tsx         → Inicio cuidadora (actividades hoy)
│   ├── FamiliarDashboardScreen.tsx → Inicio familiar (supervisión)
│   ├── CheckinScreen.tsx           → Check-in matutino (selfie + GPS)
│   ├── PastillaScreen.tsx          → Administrar medicamento (foto + OCR)
│   ├── ComidaScreen.tsx            → Registrar comida
│   ├── SiestaScreen.tsx            → Registrar siesta
│   ├── PaseoScreen.tsx             → Paseo con tracking GPS
│   ├── ChatScreen.tsx              → Chat en tiempo real (texto, audio, fotos)
│   ├── CalendarScreen.tsx          → Calendario de citas
│   ├── HistorialScreen.tsx         → Historial de eventos
│   ├── InformeScreen.tsx           → Reporte semanal con gráficas
│   ├── BienestarScreen.tsx         → Score semanal de bienestar + hábitos
│   ├── NotasScreen.tsx             → Comunicados cuidadora↔familiar
│   ├── PerfilAbueloScreen.tsx      → Datos del paciente + medicamentos
│   ├── LocalizarScreen.tsx         → Mapa de ubicación en tiempo real
│   ├── MapaZonaScreen.tsx          → Mapa de zona segura (geofence)
│   └── ValorarScreen.tsx           → Valorar cuidadora (1-5 estrellas)
├── services/                        ← 18 Servicios (lógica de app)
│   ├── api.ts                      → Axios instance (base URL, interceptores)
│   ├── authService.ts              → Login, logout, token storage
│   ├── eventosService.ts           → CRUD eventos (LLEGADA, PASTILLA...)
│   ├── tareasService.ts            → Tareas diarias
│   ├── reminderService.ts          → Notificaciones push programadas
│   ├── notificationService.ts      → Mostrar notificaciones
│   ├── locationService.ts          → GPS (permisos, tracking)
│   ├── fallDetectionService.ts     → Detector de caídas (acelerómetro)
│   ├── wearableService.ts          → Datos de smartwatch
│   ├── chatService.ts              → WebSocket chat
│   ├── notasService.ts             → Comunicados
│   ├── ratingLocalService.ts       → Valoraciones locales
│   ├── fotoService.ts              → Captura de fotos (ImagePicker)
│   ├── voiceService.ts             → Grabación de audio
│   ├── localEventStorage.ts        → SQLite local de eventos
│   ├── calendarReminderService.ts  → Recordatorios de citas
│   ├── weeklyReportService.ts      → Compilar reporte semanal
│   └── taskEventEmitter.ts         → Event emitter (cambios en tareas)
├── components/                      ← 4 Componentes reutilizables
│   ├── BigButton.tsx               → Botón grande (para pantallas de tareas)
│   ├── TaskCard.tsx                → Card de tarea
│   ├── TaskEditorModal.tsx         → Modal para editar tareas
│   └── WearableWidget.tsx          → Widget de datos de wearable
├── context/                         ← Estado global
│   └── ThemeContext.tsx            → Dark/light mode
├── styles/
│   └── theme.ts                    → Design tokens (colores, fuentes, spacing)
└── __tests__/                       ← Tests unitarios
    ├── fallDetectionService.test.ts
    ├── notasService.test.ts
    └── reminderService.test.ts
```

### 🎨 Navigation Flow

```
          ┌──────────────────┐
          │  SplashScreen    │ (3s)
          └────────┬─────────┘
                   │
          ┌────────▼──────────┐
          │ RoleSelection     │
          └──┬──────────────┬─┘
             │              │
    ┌────────▼───┐    ┌─────▼────────────┐
    │ Login      │    │ FamiliarLogin    │
    │ (Cuidadora)│    │ + FamiliarRegis  │
    └────────┬───┘    └─────┬────────────┘
             │              │
    ┌────────▼──────────────▼─────┐
    │     MAIN NAVIGATION          │
    │  Bottom Tab Navigator        │
    ├──────────────────────────────┤
    │ Dashboard | Tareas | Más...  │
    └──────────────────────────────┘
```

---

## 🔄 Flujo de Datos (Ejemplo: Registrar LLEGADA)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. MOBILE (CheckinScreen.tsx)                                    │
│    - Usuario toca botón "Registrar Llegada"                     │
│    - Toma selfie con cámara                                     │
│    - Obtiene GPS actual                                         │
│    - Comprime foto a Base64                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │ POST /api/eventos
                       │ {
                       │   tipo: "LLEGADA",
                       │   fotoBase64: "data:image/jpeg;base64,/9j/...",
                       │   gpsLat: 39.4619,
                       │   gpsLng: -0.3778
                       │ }
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. BACKEND API (EventoController.java)                          │
│    @PostMapping("/registro")                                    │
│    public RegistroResponse registrarEvento():                   │
│        - JwtAuthenticationFilter extrae cuidadoraId del token   │
│        - EventoService.registrarLlegada() calcula:             │
│            * Verifica geofence: ¿Está a <200m del domicilio?   │
│            * Valida foto con OCR (si es PASTILLA)              │
│            * Guarda datos_extra JSON                           │
│        - EventoRepository.save() → INSERT en Evento             │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Response 200 OK
                       │ {
                       │   eventoId: 42,
                       │   verificado: true,
                       │   mensaje: "Llegada registrada, zona segura"
                       │ }
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. MOBILE (localEventStorage.ts)                                │
│    - Almacena evento en SQLite local                            │
│    - Actualiza UI (DashboardScreen se refresca)                 │
│    - Emite evento a través de taskEventEmitter                 │
│    - Muestra notificación: "✓ Llegada registrada"               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 4. FAMILIAR (FamiliarDashboardScreen.tsx)                       │
│    - WebSocket conectado a /topic/familia/{abueloId}            │
│    - WebSocketService publica evento                            │
│    - El familiar ve actualización en tiempo real:               │
│      "Carmen: Llegada registrada a las 08:15 ✓"                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📺 Pantallas Principales

### 1️⃣ **CheckinScreen.tsx** (Llegada)
**Ubicación:** `mobile/src/screens/CheckinScreen.tsx` (151 líneas)

**Qué hace:**
- Primer evento del día: check-in matutino
- Toma selfie del cuidador (verificación de identidad)
- Captura GPS actual
- Verifica geofence (¿está en la zona segura = 200m del domicilio?)

**Flujo:**
```
Botón "Iniciar jornada"
    ↓
Pide permisos de cámara + GPS
    ↓
Modal con cámara en vivo
    ↓
Usuario toma selfie
    ↓
Comprime a Base64 + obtiene GPS
    ↓
POST /api/eventos/llegada
    ↓
Respuesta: {verificado: true/false, mensaje}
    ↓
Notificación: "✓ Llegada registrada"
```

**Componentes importantes:**
- `useState([lat, lng])` → coordenadas GPS
- `CameraView ref` → acceso a cámara
- `eventosService.registrarLlegada()` → envía al backend

---

### 2️⃣ **PastillaScreen.tsx** (Medicamento)
**Ubicación:** `mobile/src/screens/PastillaScreen.tsx` (146 líneas)

**Qué hace:**
- Registra administración de medicamento
- Toma foto de la pastilla (verificación visual)
- OCR automático para extraer nombre del medicamento
- Guarda horarios programados

**Flujo:**
```
Seleccionar medicamento del listado
    ↓
Foto de la pastilla
    ↓
OCR detecta: "Sinemet 10mg"
    ↓
POST /api/eventos/pastilla
    ↓
Backend valida nombre + dosis
    ↓
Notificación familiar: "Sinemet administrado ✓"
```

---

### 3️⃣ **PaseoScreen.tsx** (Paseo con GPS)
**Ubicación:** `mobile/src/screens/PaseoScreen.tsx` (490 líneas)

**Qué hace:**
- Inicia paseo y registra ruta GPS completa
- Captura puntos GPS cada 10 segundos
- Guarda en formato GeoJSON (estándar geográfico)
- Calcula distancia y duración

**Datos guardados:**
```json
{
  "tipo": "PASEO",
  "ruta_geojson": {
    "type": "LineString",
    "coordinates": [
      [-0.3778, 39.4619],  // [lng, lat] (orden GeoJSON)
      [-0.3776, 39.4620],
      [-0.3775, 39.4622],
      ...
    ]
  },
  "distancia_km": 2.5,
  "inicio": "2026-03-03T10:00:00",
  "fin": "2026-03-03T10:45:00"
}
```

---

### 4️⃣ **ChatScreen.tsx** (Mensajería)
**Ubicación:** `mobile/src/screens/ChatScreen.tsx` (955 líneas)

**Qué hace:**
- Chat en tiempo real entre cuidadora ↔ familiar
- Soporta 3 tipos de contenido:
  - **Text**: mensaje de texto
  - **Audio**: nota de voz (grabada, almacenada en Base64)
  - **Image**: fotos

**WebSocket:**
```
Conexión: ws://backend:8080/ws/chat
Canal: /topic/familia/{abueloId}

Enviar: /app/chat/mensaje
{
  "abueloId": 1,
  "from": "cuidadora",
  "text": "Carmen dormió bien anoche",
  "type": "text"
}

Recibir: Broadcast a todos suscritos a /topic/familia/1
```

**Funcionalidad:**
- `voiceService.startRecording()` → Graba audio
- ImagePicker → Selecciona foto de galería
- Comprime imágenes a Base64
- Almacena messages en SQLite + API

---

### 5️⃣ **DashboardScreen.tsx** (Inicio Cuidadora)
**Ubicación:** `mobile/src/screens/DashboardScreen.tsx` (919 líneas)

**Qué hace:**
- Pantalla principal del cuidador
- Resumen de actividades del día
- Lista de tareas pendientes
- Acciones rápidas (botones para las 6 actividades)

**Elementos:**
```
┌──────────────────────────────────┐
│  Header: "Hola, María"           │
│  Paciente: Carmen Ruiz           │
│  Hoy 3/3 | 08:15                 │
├──────────────────────────────────┤
│  Actividades Completadas (4/6)   │
│  ✓ Llegada    08:15              │
│  ✓ Pastilla   09:00              │
│  ✓ Comida     13:30              │
│  ○ Paseo      (pendiente)        │
├──────────────────────────────────┤
│  [Llegada] [Pastilla] [Comida]   │
│  [Siesta]  [Paseo]   [Salida]    │
└──────────────────────────────────┘
```

**Datos que muestra:**
- Hoy: eventos completados vs planeados
- Última ubicación GPS del paciente
- Pastillas próximas a administrar
- Notas pendientes del familiar

---

### 6️⃣ **FamiliarDashboardScreen.tsx** (Inicio Familiar)
**Ubicación:** `mobile/src/screens/FamiliarDashboardScreen.tsx` (963 líneas)

**Qué hace:**
- Pantalla de supervisión del familiar
- Resumen del estado del paciente
- Ubicación en tiempo real
- Notificaciones de eventos importantes

**Elementos:**
```
┌──────────────────────────────────┐
│  Panel de: Laura Ruiz (Hija)     │
├──────────────────────────────────┤
│  Carmen Ruiz — Estado HOY        │
│  ✓ Actividades: 4/6 completadas  │
│  📍 Ubicación: Calle Ruzafa 45   │
│  ⏱️  Última actividad: 14:30     │
│  ♥️  Ritmo cardíaco: 72 bpm      │
├──────────────────────────────────┤
│  Resumen semanal:                │
│  Lunes: 6/6 ✓  Martes: 5/6 ✓    │
│  Miércoles: 4/6 ✓                │
├──────────────────────────────────┤
│  Acciones rápidas:               │
│  [Chat]  [Notas]  [Localizar]   │
│  [Valorar Cuidadora] [Informes]  │
└──────────────────────────────────┘
```

**WebSocket para actualizaciones en tiempo real:**
- Se conecta a `/topic/familia/{abueloId}`
- Recibe eventos en vivo: nuevas actividades, alertas
- Notificación push si evento es CAIDA o FUGA

---

### 7️⃣ **InformeScreen.tsx** (Reporte Semanal)
**Ubicación:** `mobile/src/screens/InformeScreen.tsx` (811 líneas)

**Qué hace:**
- Análisis estadístico de 7 días
- Gráficas de tendencias
- Matriz de adherencia a medicación

**Datos:**
```
ADHERENCIA A MEDICACIÓN SEMANAL (%)
┌────────┬────────┬────────┬────────┐
│Lunes   │Martes  │Miércr  │Jueves  │ ...
├────────┼────────┼────────┼────────┤
│ Sinemet│  100%  │  100%  │   50%  │ Sinemet 10mg
│Aricept │   50%  │  100%  │  100%  │ Aricept 5mg
├────────┼────────┼────────┼────────┤
│TOTAL   │   75%  │  100%  │   75%  │
└────────┴────────┴────────┴────────┘

ACTIVIDADES COMPLETADAS (gráfica lineal)
       6 ┌─────────────────────────┐
       5 │      ╱╲      ╱╲          │
  Tareas │     ╱  ╲    ╱  ╲        │
       4 │    ╱    ╲──╱    ╲      │
       3 │───╱            ╲──╱──   │
       0 └─────────────────────────┘
          L M X J V S D
```

---

### 8️⃣ **CalendarScreen.tsx** (Calendario de Citas)
**Ubicación:** `mobile/src/screens/CalendarScreen.tsx` (1049 líneas)

**Qué hace:**
- Calendario compartido cuidadora ↔ familiar
- Crear, editar, eliminar citas
- Tipos: CITA_MEDICA, MEDICAMENTO, ACTIVIDAD, VISITA, OTRO

**Estructura:**
```
         MARZO 2026
   L  M  X  J  V  S  D
             1  2  3  4  5
   6  7  8  9 10 11 12
  13 14 15[16]17 18 19  ← Hoy seleccionado
  20 21 22 23 24 25 26
  27 28 29 30 31

[16] muestra citas:
  • 10:00 - Revisión neurológica (CITA_MEDICA)
  • 14:30 - Tomar Sinemet (MEDICAMENTO)
  • 17:00 - Visita de Laura (VISITA)
```

---

## 🔧 Servicios Críticos

### **authService.ts**
```typescript
// Login
const loginCuidadora = async (telefono: string, pin: string) => {
  const response = await api.post('/auth/login', { telefono, pin });
  // response = {token, cuidadoraId, nombre, rating}
  await AsyncStorage.setItem('token', response.token);
  // Todos los requests siguientes usan este token
}

// Logout
const logout = async () => {
  await AsyncStorage.removeItem('token');
  // Limpia todo
}
```

### **eventosService.ts**
```typescript
// Registrar evento
const registrarEvento = async (tipo: 'LLEGADA' | 'PASTILLA' | ..., datos: {
  fotoBase64?: string,
  gpsLat?: number,
  gpsLng?: number,
  datosExtra?: object
}) => {
  const response = await api.post('/eventos', {
    tipo,
    ...datos
  });
  // Guarda en local + notifica cambios
  await localEventStorage.agregarEvento(response);
  taskEventEmitter.emit('eventoCreado', response);
}
```

### **locationService.ts**
```typescript
// Tracking GPS continuo
const startLocationTracking = async (intervalo: number = 10000) => {
  // Solicita permisos
  // Inicia listener cada 10 segundos
  // Retorna: {lat, lng, accuracy, timestamp}
  // Usado por: CheckinScreen, PaseoScreen, DashboardScreen
}

// Detectar geofence
const isInsideGeofence = (lat, lng, centerLat, centerLng, radiusM = 200) => {
  const dist = calculateDistance(lat, lng, centerLat, centerLng);
  return dist <= radiusM;
}
```

### **fallDetectionService.ts**
```typescript
// Detector de caídas con acelerómetro
const startFallDetection = async () => {
  // Fase 1: Detectar caída (aceleración vertical > 3g)
  // Fase 2: Confirmar con impacto (aceleración horizontal > 2g en <500ms)
  // Si detecta → 
  //   1. Vibración fuerte
  //   2. Notificación local
  //   3. POST /api/eventos con tipo='CAIDA'
  //   4. WebSocket notificación URGENTE a familiar
  //   5. Si usuario no cancela en 60s → llamada de emergencia
}
```

### **reminderService.ts**
```typescript
// Recordatorios push para medicamentos
const scheduleReminder = async (medicamento, horario: '08:00') => {
  // Calcula próximo evento
  // Usa react-native-push-notification
  // En horario especificado: notificación visible
  // Si cuidador no marca en 30 min → notificación escalada
}
```

### **chatService.ts**
```typescript
// WebSocket para chat en tiempo real
const connectWebSocket = async (abueloId) => {
  const ws = new WebSocket('ws://backend:8080/ws/chat');
  
  // Subscribe a canal
  ws.send({
    command: 'SUBSCRIBE',
    destination: `/topic/familia/${abueloId}`
  });
  
  // Escucha mensajes
  ws.onmessage = (event) => {
    const mensaje = JSON.parse(event.data);
    // Actualiza UI
    setMensajes([...mensajes, mensaje]);
  };
}
```

### **localEventStorage.ts**
```typescript
// SQLite local para sync offline
const agregarEvento = async (evento: LocalEvento) => {
  // Almacena evento en SQLite local
  // Cuando hay conexión → sincroniza con servidor
  // Fallback si POST /api/eventos falla
}
```

---

## 🏥 Casos de Uso Principales

### **Caso 1: Cuidadora Registra Medicamento**

```
PastillaScreen.tsx
    ↓
1. Selecciona medicamento del listado
2. Toma foto con cámara
3. eventosService.registrarPastilla()
    ↓
Backend (EventoController):
    ↓
4. EventoService busca OCR de medicamento
5. Valida: ¿Medicamento coincide con la foto?
6. Inserta en tabla 'eventos' con tipo='PASTILLA'
7. WebSocket publica a /topic/familia/1
    ↓
Familiar (FamiliarDashboardScreen):
    ↓
8. Recibe WebSocket: "Sinemet administrado"
9. Notification push: "📅 11:00 - Sinemet ✓"
```

### **Caso 2: Familiar Supervisa en Tiempo Real**

```
Familiar abre FamiliarDashboardScreen
    ↓
1. Se conecta con WebSocket
2. GET /api/dashboard/{abueloId}
3. Obtiene: últimos eventos + ubicación actual
4. Renderiza:
   - Header con nombre paciente
   - Última actividad con hora
   - Ubicación en mapa
   - Badges: ¿En zona segura? ¿Ritmo cardíaco OK?
    ↓
Cuando cuidadora registra evento:
    ↓
5. WebSocket evento llega en tiempo real
6. UI se actualiza automáticamente
7. Si evento = CAIDA o FUGA → Notificación push urgente
```

### **Caso 3: Alerta de Caída (Emergencia)**

```
Smartwatch/Acelerómetro detecta caída
    ↓
fallDetectionService (mobile):
    ↓
1. Vibración fuerte + notificación: "¿Estás bien?"
2. Si cuidador NO confirma en 60s:
    ↓
3. POST /api/eventos con tipo='CAIDA'
4. EventoService marca como verificado=true (automático)
5. WebSocket publica: 
   {evento: 'CAIDA', urgencia: 'MAXIMA', timestamp}
    ↓
Familiar (FamiliarDashboardScreen):
    ↓
6. Push notification: "🚨 CAÍDA DETECTADA a las 14:30"
7. Botón rojo: "Llamar emergencias"
8. Ubicación del paciente abierta automáticamente
```

---

## 🗄️ Modelo de Base de Datos

### **Diagrama de Entidades**
```
┌─────────────┐        ┌──────────────┐
│  ABUELOS    │        │  FAMILIARES  │
│─────────────│        │──────────────│
│ id (PK)     │◄───────│ familiar_id  │
│ nombre      │        │ email        │
│ lat, lng    │        │ password(bcr)│
│ created_at  │        └──────────────┘
└──────┬──────┘
       │ (1:N)
       ◄─────────────────┐
       │                 │
       ▼                 ▼
┌──────────────┐    ┌──────────────┐
│  EVENTOS     │    │  PASEOS      │
│──────────────│    │──────────────│
│ id (PK)      │    │ id (PK)      │
│ abuelo_id(FK)│    │ abuelo_id(FK)│
│ tipo (ENUM)  │    │ ruta_geojson │
│ foto_base64  │    │ distancia_km │
│ verificado   │    │ inicio, fin  │
│ timestamp    │    └──────────────┘
└──────────────┘

┌──────────────┐    ┌──────────────┐
│  CUIDADORAS  │    │   RATINGS    │
│──────────────│    │──────────────│
│ id (PK)      │◄───│ cuidadora_id │
│ telefono(UQ) │    │ estrellas    │
│ pin(bcrypt)  │    │ comentario   │
│ rating_prom  │    └──────────────┘
└──────────────┘

┌─────────────────────┐
│   MENSAJES_CHAT     │
│─────────────────────│
│ id (PK)             │
│ abuelo_id (FK)      │
│ from (ENUM)         │
│ text, audio, image  │
│ type                │
│ timestamp           │
└─────────────────────┘
```

---

## 📊 Flujo de Aplicación Completo

```
INICIO APP
    ↓
SplashScreen (3s) → verifica si token existe
    ↓
¿Token válido?
    ├─ NO → RoleSelectionScreen
    │        ├─ LoginScreen (tel+pin)
    │        └─ FamiliarLoginScreen (email+pass)
    │
    └─ SÍ → obtiene rol y abre DashboardScreen
             (Cuidadora) o FamiliarDashboardScreen (Familiar)

PANTALLA PRINCIPAL
    ↓
Tab Navigator:
├─ Dashboard
├─ Tareas rápidas (botones para 6 actividades)
├─ Calendario
├─ Chat
├─ Historial
└─ Más (Notas, Perfil, Localizar, Informes)

CADA ACCIÓN
    ↓
LocalEventStorage (SQLite) + API (backend)
    ↓
WebSocket notifica a otros usuarios
    ↓
Notificaciones push si es urgente (CAIDA, FUGA)
```

---

## 🔗 URLs de API Importantes

| Endpoint | Método | Qué hace |
|----------|--------|----------|
| `/api/auth/login` | POST | Login cuidadora |
| `/api/familiar/auth/login` | POST | Login familiar |
| `/api/eventos` | GET/POST | Listar/crear eventos |
| `/api/eventos/{id}` | PUT/DELETE | Editar/borrar evento |
| `/api/paseos` | GET/POST | Paseos GPS |
| `/api/chat/mensaje` | POST | Enviar mensaje |
| `/api/dashboard/{abueloId}` | GET | Stats del día |
| `/api/notas` | GET/POST | Comunicados |
| `/api/citas` | GET/POST | Calendario |
| `/api/ratings` | POST | Valorar cuidadora |
| `/ws/chat` | WS | WebSocket para chat |

---

## 🎓 Resumen para Memorizar

### **Lo Fundamental:**

1. **Entidades:**
   - ABUELO = paciente
   - CUIDADORA = profesional (login teléfono+PIN)
   - FAMILIAR = supervisor (login email+contraseña)
   - EVENTO = registro de actividad (LLEGADA, PASTILLA, PASEO...)

2. **Flujo Login:**
   - POST teléfono+pin → servidor compara contra BCRYPT
   - Server devuelve JWT
   - Mobile guarda token en AsyncStorage
   - Cada request usa: `Authorization: Bearer <token>`

3. **Pantallas de Tareas:**
   - CheckinScreen → selfie + GPS
   - PastillaScreen → foto medicamento
   - PaseoScreen → tracking GPS completo
   - ComidaScreen, SiestaScreen → registro simple

4. **Dashboard:**
   - Cuidadora ve: tareas completadas hoy + botones rápidos
   - Familiar ve: estado supervisión + ubicación en vivo

5. **Chat & Alertas:**
   - WebSocket conectado a `/topic/familia/{abueloId}`
   - Mensajes en tiempo real (texto, audio, imágenes)
   - Alertas urgentes si CAIDA o FUGA

---

## 📝 Notas Finales

- **Base de datos:** PostgreSQL en Neon Cloud (migrada desde H2)
- **Autenticación:** JWT firmado con HMAC-SHA256
- **GPS:** Geofence 200m alrededor del domicilio
- **Notificaciones:** Push via Expo Notifications
- **Storage:** SQLite local para sync offline
- **Chat:** WebSocket STOMP + mensajes de voz/fotos

---

**Este documento describe la arquitectura completa a fecha 3/3/2026**
**Commit: 0fb4e90**
