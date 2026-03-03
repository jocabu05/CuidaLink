/**
 * eventosService.ts — Servicio central de eventos/actividades de cuidado.
 *
 * Conecta con los endpoints REST del backend para:
 * - registrarCheckin(): check-in con selfie + GPS (verifica geofence)
 * - registrarPastilla(): medicamento con foto + OCR
 * - registrarComida(): comida con foto
 * - registrarSiesta(): registro de siesta
 * - registrarCaida(): alerta de emergencia
 * - getDashboardHoy(): dashboard diario del paciente
 * - getEventosPaciente(): historial completo de eventos
 * - getUbicacion(): última ubicación GPS del paciente
 * - getPerfilAbuelo(): datos del perfil del paciente
 */
import api, { DashboardResponse, EventoInfo, UbicacionAbuelo, PerfilAbuelo } from './api';
    abueloId: number;
    selfieBase64: string;
    lat: number;
    lng: number;
}

interface PastillaData {
    abueloId: number;
    fotoBase64: string;
    medicamento: string;
    ocrTexto?: string;
    verificadoOcr: boolean;
}

interface ComidaData {
    abueloId: number;
    fotoBase64?: string;
}

interface GpsPoint {
    lat: number;
    lng: number;
    timestamp: number;
}

interface PaseoData {
    abueloId: number;
    ruta: GpsPoint[];
    distanciaKm: number;
}

class EventosService {
    // Obtener dashboard del día
    async getDashboardHoy(abueloId: number): Promise<DashboardResponse> {
        const response = await api.get<DashboardResponse>(`/dashboard/${abueloId}/hoy`);
        return response.data;
    }

    // Registrar check-in con selfie y GPS
    async registrarCheckin(data: CheckinData): Promise<{ success: boolean; mensaje: string; verificado: boolean }> {
        const response = await api.post('/checkin', data);
        return response.data;
    }

    // Registrar pastilla con foto
    async registrarPastilla(data: PastillaData): Promise<{ success: boolean; mensaje: string; verificado: boolean }> {
        const response = await api.post('/pastilla', data);
        return response.data;
    }

    // Registrar comida
    async registrarComida(data: ComidaData): Promise<{ success: boolean; mensaje: string }> {
        const response = await api.post('/comida', data);
        return response.data;
    }

    // Reportar caída detectada
    async reportarCaida(abueloId: number, lat?: number, lng?: number): Promise<{ success: boolean; mensaje: string }> {
        const response = await api.post('/caida', { abueloId, lat, lng });
        return response.data;
    }

    // Obtener eventos del día
    async getEventosHoy(abueloId: number): Promise<EventoInfo[]> {
        const response = await api.get<EventoInfo[]>(`/eventos/${abueloId}/hoy`);
        return response.data;
    }

    // Iniciar paseo
    async iniciarPaseo(abueloId: number): Promise<{ success: boolean; paseoId: number; mensaje: string }> {
        const response = await api.post('/paseo/start', { abueloId });
        return response.data;
    }

    // Finalizar paseo con ruta
    async finalizarPaseo(data: PaseoData): Promise<{ success: boolean; distanciaKm: number; mensaje: string }> {
        const response = await api.post('/paseo/stop', data);
        return response.data;
    }

    // Obtener paseo activo
    async getPaseoActivo(): Promise<{ activo: boolean; paseoId?: number; abueloId?: number; inicio?: string } | null> {
        const response = await api.get('/paseo/activo');
        return response.data;
    }

    // Obtener última ubicación del abuelo
    async getUbicacionAbuelo(abueloId: number): Promise<UbicacionAbuelo> {
        const response = await api.get<UbicacionAbuelo>(`/abuelo/${abueloId}/ubicacion`);
        return response.data;
    }

    // Enviar alerta de fuga
    async alertarFuga(abueloId: number, lat?: number, lng?: number): Promise<{ success: boolean; mensaje: string }> {
        const response = await api.post(`/abuelo/${abueloId}/alerta-fuga`, { lat, lng });
        return response.data;
    }

    // Obtener perfil del abuelo
    async getPerfilAbuelo(abueloId: number): Promise<PerfilAbuelo> {
        const response = await api.get<PerfilAbuelo>(`/abuelo/${abueloId}/perfil`);
        return response.data;
    }
}

export default new EventosService();

