import AsyncStorage from '@react-native-async-storage/async-storage';

const TAREAS_KEY = 'cuidalink_tareas_custom';

export interface TareaCustom {
    id: string;
    texto: string;
    hora: string;
    tipo: string;
    creadaPor: 'familiar';
    timestamp: string;
    activa: boolean;
}

const tareasService = {
    async getTareas(): Promise<TareaCustom[]> {
        try {
            const data = await AsyncStorage.getItem(TAREAS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    async getTareasActivas(): Promise<TareaCustom[]> {
        const tareas = await this.getTareas();
        return tareas.filter(t => t.activa);
    },

    async agregarTarea(texto: string, hora: string, tipo: string = 'CUSTOM'): Promise<TareaCustom> {
        const tareas = await this.getTareas();
        const nueva: TareaCustom = {
            id: Date.now().toString(),
            texto,
            hora,
            tipo,
            creadaPor: 'familiar',
            timestamp: new Date().toISOString(),
            activa: true,
        };
        tareas.push(nueva);
        await AsyncStorage.setItem(TAREAS_KEY, JSON.stringify(tareas));
        return nueva;
    },

    async eliminarTarea(id: string): Promise<void> {
        let tareas = await this.getTareas();
        tareas = tareas.filter(t => t.id !== id);
        await AsyncStorage.setItem(TAREAS_KEY, JSON.stringify(tareas));
    },

    async toggleTarea(id: string): Promise<void> {
        const tareas = await this.getTareas();
        const tarea = tareas.find(t => t.id === id);
        if (tarea) {
            tarea.activa = !tarea.activa;
            await AsyncStorage.setItem(TAREAS_KEY, JSON.stringify(tareas));
        }
    },
};

export default tareasService;
