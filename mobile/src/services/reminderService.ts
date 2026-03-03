/**
 * reminderService.ts — Servicio de recordatorios de medicación.
 *
 * Programa notificaciones locales diarias para tomar pastillas.
 * Cada recordatorio se repite todos los días a la misma hora.
 *
 * Métodos:
 * - scheduleReminder(): programa recordatorio diario (hora, título, cuerpo)
 * - cancelReminder(): cancela un recordatorio por ID
 * - getReminders(): lista todos los recordatorios activos
 * - cancelAll(): cancela todos los recordatorios
 *
 * Usa expo-notifications + AsyncStorage para persistencia.
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScheduledReminder {
    id: string;
    hora: string;  // HH:mm
    titulo: string;
    cuerpo: string;
}

/**
 * Service to schedule daily local notifications for medication reminders.
 * Uses expo-notifications for local push notifications.
 */
class ReminderService {
    async init(): Promise<void> {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    }

    async scheduleDaily(hora: string, titulo: string, cuerpo: string): Promise<string> {
        const [hours, minutes] = hora.split(':').map(Number);

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: `💊 ${titulo}`,
                body: cuerpo,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: minutes,
            },
        });

        // Save for tracking
        const reminders = await this.getScheduled();
        reminders.push({ id, hora, titulo, cuerpo });
        await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));

        console.log(`⏰ Recordatorio programado: ${titulo} a las ${hora}`);
        return id;
    }

    async cancelAll(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await AsyncStorage.removeItem(REMINDERS_KEY);
        console.log('🗑️ Todos los recordatorios cancelados');
    }

    async getScheduled(): Promise<ScheduledReminder[]> {
        const data = await AsyncStorage.getItem(REMINDERS_KEY);
        return data ? JSON.parse(data) : [];
    }

    async scheduleMedicationReminders(): Promise<void> {
        // Cancel existing first
        await this.cancelAll();

        // Schedule default medication reminders
        await this.scheduleDaily('10:25', 'Hora del medicamento', 'Sinemet 10mg — Recuerda preparar la pastilla');
        await this.scheduleDaily('10:30', 'Medicamento AHORA', 'Es hora de administrar Sinemet 10mg');
    }
}

export default new ReminderService();
