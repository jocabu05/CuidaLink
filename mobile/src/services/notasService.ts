/**
 * notasService.ts — Servicio de notas/avisos entre cuidadora y familiar.
 *
 * Funcionalidades:
 * - crearNota(): crea nota con prioridad (normal/urgente) y la envía al backend
 * - getNotas(): obtiene todas las notas (intenta backend, fallback local)
 * - marcarLeida(): marca una nota como leída en backend y local
 * - eliminarNota(): borra nota del backend y del almacén local
 * - getContadorPendientes(): cuenta notas no leídas (para badges)
 *
 * Patrón offline-first: cache local en AsyncStorage como respaldo.
 * Emite evento 'nota_leida' vía taskEventEmitter para actualizar badges.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { notifyNotaLeida } from './taskEventEmitter';

const NOTAS_KEY = '@cuidalink_notas';

export interface Nota {
    id: string;
    texto: string;
    autor: 'familiar' | 'cuidadora';
    timestamp: string;
    leida: boolean;
    prioridad: 'normal' | 'urgente';
}

class NotasService {
    // ─── GET ALL NOTES ───
    async getNotas(): Promise<Nota[]> {
        try {
            const res = await api.get('/notas');
            return this.mapBackendNotas(res.data);
        } catch {
            // Fallback to local
            const data = await AsyncStorage.getItem(NOTAS_KEY);
            return data ? JSON.parse(data) : [];
        }
    }

    // ─── ADD NOTE ───
    async agregarNota(texto: string, autor: 'familiar' | 'cuidadora', prioridad: 'normal' | 'urgente' = 'normal'): Promise<void> {
        const nota: Nota = {
            id: Date.now().toString(),
            texto,
            autor,
            timestamp: new Date().toISOString(),
            leida: false,
            prioridad,
        };

        // Try API first
        try {
            await api.post('/notas', {
                texto,
                autor,
                prioridad,
                abueloId: 1,
            });
        } catch {
            // Silently fallback — save locally only
        }

        // Always save locally too (ensures it works in demo mode)
        const notas = await this.getNotasLocal();
        notas.unshift(nota);
        await AsyncStorage.setItem(NOTAS_KEY, JSON.stringify(notas));
    }

    // ─── GET PENDING NOTES (unread, from familiar) ───
    async getNotasPendientes(): Promise<Nota[]> {
        try {
            const res = await api.get('/notas/pendientes');
            const backendNotas = this.mapBackendNotas(res.data);
            if (backendNotas.length > 0) return backendNotas;
        } catch {
            // Fallback to local
        }
        const notas = await this.getNotasLocal();
        return notas.filter(n => !n.leida && n.autor === 'familiar');
    }

    // ─── GET RECENT NOTES ───
    async getNotasRecientes(limit: number = 5): Promise<Nota[]> {
        const notas = await this.getNotas();
        return notas.slice(0, limit);
    }

    // ─── MARK AS READ ───
    async marcarLeida(id: string): Promise<void> {
        try { await api.put(`/notas/${id}/leida`); } catch { }
        const notas = await this.getNotasLocal();
        const nota = notas.find(n => n.id === id);
        if (nota) { nota.leida = true; }
        await AsyncStorage.setItem(NOTAS_KEY, JSON.stringify(notas));
    }

    // ─── MARK AS READ AND DELETE (notify familia) ───
    async marcarLeidaYEliminar(id: string): Promise<void> {
        notifyNotaLeida(id);
        try { await api.delete(`/notas/${id}`); } catch { }
        let notas = await this.getNotasLocal();
        notas = notas.filter(n => n.id !== id);
        await AsyncStorage.setItem(NOTAS_KEY, JSON.stringify(notas));
    }

    // ─── MARK ALL AS READ AND DELETE ───
    async marcarTodasLeidasYEliminar(): Promise<void> {
        const pendientes = await this.getNotasPendientes();
        pendientes.forEach(n => notifyNotaLeida(n.id));
        try { await api.delete('/notas/pendientes'); } catch { }
        let notas = await this.getNotasLocal();
        notas = notas.filter(n => n.leida || n.autor !== 'familiar');
        await AsyncStorage.setItem(NOTAS_KEY, JSON.stringify(notas));
    }

    // ─── DELETE NOTE ───
    async eliminarNota(id: string): Promise<void> {
        try { await api.delete(`/notas/${id}`); } catch { }
        let notas = await this.getNotasLocal();
        notas = notas.filter(n => n.id !== id);
        await AsyncStorage.setItem(NOTAS_KEY, JSON.stringify(notas));
    }

    // ─── HELPERS ───
    private async getNotasLocal(): Promise<Nota[]> {
        const data = await AsyncStorage.getItem(NOTAS_KEY);
        return data ? JSON.parse(data) : [];
    }

    private mapBackendNotas(data: any[]): Nota[] {
        return data.map(n => ({
            id: String(n.id),
            texto: n.texto,
            autor: n.autor,
            timestamp: n.timestamp,
            leida: n.leida,
            prioridad: n.prioridad || 'normal',
        }));
    }
}

export default new NotasService();
