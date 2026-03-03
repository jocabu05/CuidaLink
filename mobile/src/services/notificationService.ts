/**
 * notificationService.ts — Servicio de notificaciones push locales.
 *
 * Funcionalidades:
 * - scheduleReminder(): programa notificación diaria a una hora fija
 * - cancelReminder(): cancela una notificación programada
 * - getScheduledReminders(): lista recordatorios activos
 * - requestPermissions(): solicita permiso de notificaciones al usuario
 *
 * Configura el handler global de notificaciones de Expo
 * (sonido, alerta, badge habilitados).
 * Los recordatorios se persisten en AsyncStorage.
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export interface Reminder {
    id: string;
    hora: string; // HH:MM
    medicamento: string;
    activo: boolean;
}

class NotificationService {
    private initialized = false;

    async init(): Promise<boolean> {
        if (this.initialized) return true;
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            this.initialized = status === 'granted';
            return this.initialized;
        } catch {
            return false;
        }
    }

    // Send instant notification (for Familiar when Cuidadora uploads)
    async notificarActividad(tipo: string, descripcion: string): Promise<void> {
        await this.init();
        const labels: Record<string, string> = {
            LLEGADA: 'Llegada registrada',
            COMIDA: 'Comida servida',
            PASTILLA: 'Medicamento administrado',
            PASEO: 'Paseo completado',
        };
        await Notifications.scheduleNotificationAsync({
            content: {
                title: labels[tipo] || 'Actividad registrada',
                body: descripcion,
                sound: 'default',
            },
            trigger: null, // instant
        });
    }

    // Schedule medication reminder
    async programarRecordatorio(hora: string, medicamento: string): Promise<string> {
        await this.init();
        const [h, m] = hora.split(':').map(Number);

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: `Hora del medicamento`,
                body: `Administrar ${medicamento}`,
                sound: 'default',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: h,
                minute: m,
            },
        });

        // Save to storage
        const reminders = await this.getRecordatorios();
        reminders.push({ id, hora, medicamento, activo: true });
        await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
        return id;
    }

    async getRecordatorios(): Promise<Reminder[]> {
        try {
            const data = await AsyncStorage.getItem(REMINDERS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    async cancelarRecordatorio(id: string): Promise<void> {
        await Notifications.cancelScheduledNotificationAsync(id);
        const reminders = await this.getRecordatorios();
        const filtered = reminders.filter(r => r.id !== id);
        await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(filtered));
    }

    async cancelarTodos(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await AsyncStorage.removeItem(REMINDERS_KEY);
    }
}

export default new NotificationService();
