import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Configurar URL base del backend desde variables de entorno o valor por defecto
const API_URL = Constants.expoConfig?.extra?.apiUrl 
    || process.env.EXPO_PUBLIC_API_URL 
    || 'http://172.20.10.11:8080/api';

const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 3000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para añadir token JWT
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Token expirado, limpiar sesión
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

export default api;

// Tipos de respuesta
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    mensaje?: string;
}

export interface LoginResponse {
    token: string;
    cuidadoraId: number;
    nombre: string;
    telefono: string;
    fotoPerfil?: string;
    rating: number;
}

export interface DashboardResponse {
    abuelo: {
        id: number;
        nombre: string;
        direccion: string;
        fotoPerfil?: string;
    };
    eventosHoy: EventoInfo[];
    tareasPendientes: TareaInfo[];
    estadisticas: {
        totalTareas: number;
        tareasCompletadas: number;
        porcentajeAvance: number;
    };
}

export interface EventoInfo {
    id: number;
    tipo: 'LLEGADA' | 'PASTILLA' | 'COMIDA' | 'PASEO' | 'SIESTA' | 'CAIDA' | 'SALIDA' | 'FUGA';
    timestamp: string;
    fotoBase64?: string;
    gpsLat?: number;
    gpsLng?: number;
    verificado: boolean;
    descripcion: string;
}

export interface TareaInfo {
    tipo: string;
    hora: string;
    descripcion: string;
    completada: boolean;
    icono: string;
}

export interface UbicacionAbuelo {
    abueloId: number;
    nombre: string;
    domicilioLat: number;
    domicilioLng: number;
    ultimaLat: number;
    ultimaLng: number;
    ultimaActualizacion: string | null;
    tipoEvento: string | null;
    enZonaSegura: boolean;
    distanciaMetros: number;
}

export interface PerfilAbuelo {
    id: number;
    nombre: string;
    direccion: string;
    lat: number;
    lng: number;
    telefonoEmergencia: string;
    notasMedicas: string;
    fotoPerfil: string | null;
    familiarId: number;
}
