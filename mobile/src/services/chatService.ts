import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CHAT_KEY = '@cuidalink_chat';

export interface ChatMessage {
    id: string;
    from: 'cuidadora' | 'familiar';
    text: string;
    timestamp: string;
    leido: boolean;
    type?: 'text' | 'audio' | 'image';
    audioBase64?: string;
    audioDuration?: number;
    imageBase64?: string;
}

class ChatService {
    async enviarMensaje(
        from: 'cuidadora' | 'familiar',
        text: string,
        options?: {
            type?: 'audio' | 'image';
            audioBase64?: string;
            audioDuration?: number;
            imageBase64?: string;
        }
    ): Promise<ChatMessage> {
        const type = options?.type || 'text';
        const nuevo: ChatMessage = {
            id: Date.now().toString(),
            from,
            text,
            timestamp: new Date().toISOString(),
            leido: false,
            type,
            audioBase64: options?.audioBase64,
            audioDuration: options?.audioDuration,
            imageBase64: options?.imageBase64,
        };
        
        // Intentar enviar al servidor
        try {
            const res = await api.post('/chat/send', {
                from,
                text,
                abueloId: 1,
                type,
                audioBase64: options?.audioBase64,
                audioDuration: options?.audioDuration,
                imageBase64: options?.imageBase64,
            });
            if (res.data?.id) {
                nuevo.id = res.data.id;
            }
        } catch (error) {
            console.log('Chat offline, guardando localmente');
        }
        
        // Guardar siempre localmente
        const mensajes = await this.getLocalMensajes();
        mensajes.push(nuevo);
        const trimmed = mensajes.slice(-100);
        await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(trimmed));
        return nuevo;
    }

    async eliminarMensaje(id: string): Promise<boolean> {
        // Intentar eliminar del servidor
        try {
            await api.delete(`/chat/${id}`);
        } catch {
            console.log('No se pudo eliminar del servidor, eliminando localmente');
        }
        
        // Eliminar localmente siempre
        const mensajes = await this.getLocalMensajes();
        const filtered = mensajes.filter(m => m.id !== id);
        await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(filtered));
        return true;
    }

    async getMensajes(): Promise<ChatMessage[]> {
        try {
            const response = await api.get('/chat/messages', { params: { abueloId: 1 }, timeout: 2000 });
            if (response.data && Array.isArray(response.data)) {
                const serverMsgs: ChatMessage[] = response.data;
                const localMsgs = await this.getLocalMensajes();
                const allIds = new Set(serverMsgs.map(m => m.id));
                const merged = [...serverMsgs, ...localMsgs.filter(m => !allIds.has(m.id))];
                merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                return merged.slice(-100);
            }
        } catch {
            // Fallback al almacenamiento local
        }
        return this.getLocalMensajes();
    }
    
    private async getLocalMensajes(): Promise<ChatMessage[]> {
        try {
            const data = await AsyncStorage.getItem(CHAT_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    async marcarLeidos(role: 'cuidadora' | 'familiar'): Promise<void> {
        const mensajes = await this.getLocalMensajes();
        const opuesto = role === 'cuidadora' ? 'familiar' : 'cuidadora';
        mensajes.forEach(m => {
            if (m.from === opuesto) m.leido = true;
        });
        await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(mensajes));
    }

    async getNoLeidos(role: 'cuidadora' | 'familiar'): Promise<number> {
        const mensajes = await this.getLocalMensajes();
        const opuesto = role === 'cuidadora' ? 'familiar' : 'cuidadora';
        return mensajes.filter(m => m.from === opuesto && !m.leido).length;
    }
}

export default new ChatService();
