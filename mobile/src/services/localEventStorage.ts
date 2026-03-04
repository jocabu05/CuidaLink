/**
 * localEventStorage.ts — Almacén local de eventos con sincronización offline-first.
 *
 * Funcionalidades:
 * - Guarda eventos localmente en AsyncStorage cuando no hay conexión
 * - Mantiene una cola de sincronización (sync queue) para enviar al servidor
 * - sincronizar(): envía la cola pendiente al backend cuando vuelve la conexión
 * - getEventos(): devuelve eventos locales del día
 * - getResumenSemanal(): agrupa eventos de los últimos 7 días por tipo
 *
 * Patrón offline-first: la app funciona sin conexión y sincroniza después.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const EVENTS_KEY = '@cuidalink_local_events';
const SYNC_QUEUE_KEY = '@cuidalink_sync_queue';

export interface LocalEvento {
    id: string;
    tipo: string;
    timestamp: string;
    verificado: boolean;
    descripcion: string;
    fotoBase64?: string;
    gpsLat?: number;
    gpsLng?: number;
    subido: boolean;
}

class LocalEventStorage {
    async guardarEvento(evento: Omit<LocalEvento, 'id' | 'timestamp' | 'subido'>, synced = false): Promise<LocalEvento> {
        const eventos = await this.getEventos();
        const nuevo: LocalEvento = {
            ...evento,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            subido: synced,
        };
        eventos.unshift(nuevo);
        const trimmed = eventos.slice(0, 50);
        await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
        
        if (!synced) {
            await this.addToSyncQueue(nuevo);
        }
        
        return nuevo;
    }

    async getEventos(): Promise<LocalEvento[]> {
        try {
            const data = await AsyncStorage.getItem(EVENTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    async getEventosHoy(): Promise<LocalEvento[]> {
        const all = await this.getEventos();
        const hoy = new Date().toDateString();
        return all.filter(e => new Date(e.timestamp).toDateString() === hoy);
    }
    
    /**
     * Cola de sincronización offline: guarda eventos pendientes de subir
     */
    private async addToSyncQueue(evento: LocalEvento): Promise<void> {
        try {
            const queue = await this.getSyncQueue();
            queue.push(evento);
            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
        } catch (e) {
            console.error('Error adding to sync queue:', e);
        }
    }
    
    async getSyncQueue(): Promise<LocalEvento[]> {
        try {
            const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }
    
    /**
     * Intenta sincronizar eventos pendientes con el servidor.
     * Retorna el número de eventos sincronizados con éxito.
     */
    async syncPendingEvents(): Promise<number> {
        const queue = await this.getSyncQueue();
        if (queue.length === 0) return 0;
        
        let synced = 0;
        const remaining: LocalEvento[] = [];
        
        for (const evento of queue) {
            try {
                await api.post(`/${evento.tipo.toLowerCase()}`, {
                    abueloId: 1,
                    tipo: evento.tipo,
                    descripcion: evento.descripcion,
                    fotoBase64: evento.fotoBase64,
                    lat: evento.gpsLat,
                    lng: evento.gpsLng,
                });
                
                // Marcar como subido en el storage local
                await this.markAsSynced(evento.id);
                synced++;
            } catch {
                remaining.push(evento);
            }
        }
        
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
        return synced;
    }
    
    private async markAsSynced(eventoId: string): Promise<void> {
        const eventos = await this.getEventos();
        const updated = eventos.map(e => 
            e.id === eventoId ? { ...e, subido: true } : e
        );
        await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
    }

    async limpiar(): Promise<void> {
        await AsyncStorage.removeItem(EVENTS_KEY);
        await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    }
}

export default new LocalEventStorage();
