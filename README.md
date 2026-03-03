<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Expo-54-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" />
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

<h1 align="center">🧠 CuidaLink</h1>

<p align="center">
  <strong>Plataforma digital de asistencia para cuidadores de personas con Alzheimer</strong>
</p>

<p align="center">
  <em>Trabajo Final de Grado — Jorge Castera Bueno</em>
</p>

---

## 📋 Descripción

**CuidaLink** es una aplicación móvil multiplataforma (iOS / Android) diseñada para facilitar y profesionalizar el trabajo diario de los cuidadores de personas con Alzheimer. Conecta al **cuidador/a profesional** con la **familia** del paciente, ofreciendo transparencia total sobre el cuidado mediante verificación fotográfica, geolocalización y comunicación en tiempo real.

## ✨ Funcionalidades principales

### 👩‍⚕️ Rol Cuidadora
| Función | Descripción |
|---------|-------------|
| 📋 **Dashboard de tareas** | Jornada diaria con 5 tareas verificables (llegada, medicación, paseo, comida, siesta) |
| 📸 **Verificación fotográfica** | Selfie de llegada, foto del medicamento con OCR simulado, foto de la comida |
| 🗺️ **Mapa interactivo** | Zona segura del paciente + POIs cercanos (farmacias, hospitales, parques…) con marcadores personalizados |
| 🚶 **Tracking de paseo** | Ruta GPS en tiempo real, distancia, duración, con pausa/reanudación |
| 😴 **Control de siesta** | Temporizador con registro automático |
| 💬 **Chat** | Mensajería texto, imagen y audio con la familia |
| ⭐ **Valoración diaria** | Rating 1-5 con comentario al finalizar la jornada |
| 📅 **Calendario** | Vista mensual con todos los eventos y citas |
| 🔔 **Recordatorios** | Notificaciones push para medicación y tareas |
| 🆘 **Detección de caídas** | Acelerómetro con doble fase de confirmación |
| 🎉 **Confetti** | Celebración animada al completar todas las tareas |

### 👨‍👩‍👧 Rol Familiar
| Función | Descripción |
|---------|-------------|
| 📊 **Panel de resumen** | Eventos del día, estadísticas, gestión de tareas, línea temporal de actividad |
| 💊 **Gestión de medicación** | CRUD completo de medicamentos con horarios, dosis, recordatorios y adherencia semanal |
| 📝 **Notas** | Envío de notas a la cuidadora (normal / urgente), con confirmación de lectura |
| 💬 **Chat** | Comunicación directa con la cuidadora |
| 📅 **Calendario** | Vista compartida de eventos y citas |
| 📈 **Informe semanal** | Estadísticas comparativas, distribución por actividad, tendencias, exportar a PDF |

### 🌙 Características globales
- **Modo oscuro** completo con paleta azul unificada
- **Diseño accesible** pensado para usuarios mayores (botones grandes, tipografía clara)
- **Almacenamiento offline** con sincronización automática

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    📱 MOBILE APP                     │
│           React Native + Expo (TypeScript)           │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Cuidadora│  │ Familiar │  │   Servicios       │   │
│  │ 6 tabs   │  │ 6 tabs   │  │ 18 services       │   │
│  │ 13 scr.  │  │ 10 scr.  │  │ (API, local, GPS) │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└────────────────────┬────────────────────────────────┘
                     │ REST API (Axios)
                     ▼
┌─────────────────────────────────────────────────────┐
│                  🖥️ BACKEND API                      │
│            Spring Boot 3.2 + Java 17                 │
│                                                      │
│  Controllers → Services → Repositories → Entities    │
│  JWT Auth · CORS · Global Exception Handler          │
└────────────────────┬────────────────────────────────┘
                     │ JPA / Hibernate
                     ▼
┌─────────────────────────────────────────────────────┐
│              🗄️ BASE DE DATOS                        │
│         H2 (dev) / MySQL (producción)                │
│                                                      │
│  9 entidades: Abuelo, Cuidadora, Familiar, Evento,  │
│  Cita, Nota, MensajeChat, Paseo, Rating             │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del proyecto

```
CuidaLink/
├── 📱 mobile/                    # App React Native + Expo
│   ├── App.tsx                    # Navegación principal (tabs + stacks)
│   ├── src/
│   │   ├── screens/               # 23 pantallas
│   │   │   ├── DashboardScreen    # Panel cuidadora (tareas, progreso, notas)
│   │   │   ├── FamiliarDashboard  # Panel familiar (resumen, tareas, eventos)
│   │   │   ├── ChatScreen         # Mensajería texto/imagen/audio
│   │   │   ├── MapaZonaScreen     # Mapa Leaflet con zona segura + POIs
│   │   │   ├── PaseoScreen        # Tracking GPS de paseos
│   │   │   ├── MedicacionScreen   # Gestión de medicamentos (familiar)
│   │   │   ├── CalendarScreen     # Calendario mensual
│   │   │   ├── InformeScreen      # Informes semanales + PDF
│   │   │   ├── CheckinScreen      # Selfie + geolocalización
│   │   │   ├── PastillaScreen     # Foto medicamento + OCR
│   │   │   ├── ComidaScreen       # Foto de comida
│   │   │   ├── SiestaScreen       # Temporizador de siesta
│   │   │   └── ...                # +11 pantallas más
│   │   ├── components/            # BigButton, TaskCard, WearableWidget...
│   │   ├── context/               # ThemeContext (dark mode + roles)
│   │   ├── services/              # 18 servicios (API, GPS, chat, eventos...)
│   │   ├── styles/                # Tema unificado, tipografía, sombras
│   │   └── __tests__/             # Tests unitarios (Jest)
│   └── package.json
│
├── 🖥️ backend/                   # API REST Spring Boot
│   └── src/main/java/com/cuidalink/
│       ├── config/                # CORS, DataInitializer, GlobalExceptionHandler
│       ├── controller/            # REST controllers
│       ├── dto/                   # Data Transfer Objects
│       ├── entity/                # JPA entities (9 tablas)
│       ├── repository/            # Spring Data JPA repos
│       ├── security/              # JWT auth, filtros, UserDetailsService
│       └── service/               # Lógica de negocio
│
├── 🗄️ database/
│   └── schema.sql                 # Esquema SQL + datos de prueba
│
└── 📊 web-dashboard/             # (Futuro) Panel web de administración
```

---

## 🚀 Instalación y ejecución

### Requisitos previos
- **Node.js** ≥ 18
- **Java** 17+
- **Maven** 3.8+
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go** en tu móvil ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

### 📱 App móvil

```bash
cd mobile
npm install
npx expo start
```

Escanea el QR con Expo Go o pulsa `a` para abrir en emulador Android.

### 🖥️ Backend

```bash
cd backend
mvn spring-boot:run
```

La API arranca en `http://localhost:8080` con base de datos H2 en memoria.

> **Nota:** La app funciona en modo offline-first. Las funciones principales (tareas, eventos, chat, calendario) funcionan sin backend gracias al almacenamiento local con AsyncStorage.

---

## 🧪 Tests

```bash
cd mobile
npm test
```

Tests unitarios con Jest para los servicios principales:
- `reminderService` — Programación de notificaciones
- `notasService` — CRUD de notas + fallback API
- `fallDetectionService` — Algoritmo de detección de caídas (doble fase)

---

## 📸 Pantallas destacadas

| Dashboard Cuidadora | Mapa Zona Segura | Gestión Medicación |
|:---:|:---:|:---:|
| Tareas del día con emojis, barra de progreso, notas del familiar | Marcadores teardrop con emoji, clusters, búsqueda, zona circular | Timeline de tomas, adherencia semanal, CRUD de medicamentos |

| Chat | Calendario | Informe Semanal |
|:---:|:---:|:---:|
| Mensajes texto, imagen y audio con waveform | Vista mensual con filtros por tipo y gestión de citas | Estadísticas comparativas, tendencias, exportar PDF |

---

## 🛠️ Tecnologías

### Frontend (Mobile)
| Tecnología | Uso |
|---|---|
| React Native 0.81 | Framework principal |
| Expo SDK 54 | Build, cámara, GPS, notificaciones, sensores |
| TypeScript 5.9 | Tipado estático |
| React Navigation 7 | Navegación (tabs + stack) |
| AsyncStorage | Persistencia local offline |
| Leaflet (WebView) | Mapa interactivo zona segura |
| expo-camera | Captura de fotos (selfie, medicamento, comida) |
| expo-location | Geolocalización y geofencing |
| expo-notifications | Push notifications |
| expo-sensors | Acelerómetro (detección de caídas) |
| Chart Kit | Gráficos en informes |

### Backend
| Tecnología | Uso |
|---|---|
| Spring Boot 3.2 | Framework backend |
| Java 17 | Lenguaje |
| Spring Security + JWT | Autenticación |
| Spring Data JPA | Acceso a datos |
| H2 Database | Base de datos en desarrollo |
| Maven | Gestión de dependencias |

---

## 👤 Autor

**Jorge Castera Bueno**

- GitHub: [@jocabu05](https://github.com/jocabu05)

---

## 📄 Licencia

Este proyecto es un Trabajo Final de Grado (TFG) con fines académicos.

---

<p align="center">
  Hecho con ❤️ para quienes cuidan de los que más lo necesitan
</p>
