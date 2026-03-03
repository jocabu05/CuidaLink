import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CALENDAR_REMINDERS_KEY = '@cuidalink_calendar_reminders';

export interface CalendarEventReminder {
    eventId: string;
    title: string;
    date: string;       // YYYY-MM-DD
    time: string;       // HH:mm
    type: string;
    notifDayBeforeId?: string;   // notification ID for day-before reminder
    notifSameDayId?: string;     // notification ID for same-day reminder
}

/**
 * Servicio de recordatorios para eventos del calendario.
 * Programa 2 notificaciones por evento:
 *   1) El día anterior a las 20:00 → "Mañana tienes: ..."
 *   2) El mismo día, 1h antes    → "Hoy a las HH:mm: ..."
 */
class CalendarReminderService {

    /** Request permissions (idempotent) */
    async init(): Promise<boolean> {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            return status === 'granted';
        } catch {
            return false;
        }
    }

    /**
     * Schedule both reminders for a calendar event.
     * - Day before at 20:00
     * - Same day 1 hour before the event (or at 08:00 if event is before 09:00)
     */
    async scheduleReminders(event: {
        id: string;
        title: string;
        date: string;
        time: string;
        type: string;
    }): Promise<void> {
        await this.init();

        // Remove existing reminders for this event first
        await this.cancelReminders(event.id);

        const [eventH, eventM] = event.time.split(':').map(Number);

        // Build the event datetime
        const eventDate = new Date(`${event.date}T${event.time}:00`);
        const now = new Date();

        // ── 1) Day-before reminder at 20:00 ──
        const dayBefore = new Date(eventDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        dayBefore.setHours(20, 0, 0, 0);

        let notifDayBeforeId: string | undefined;
        if (dayBefore > now) {
            const secondsUntilDayBefore = Math.floor((dayBefore.getTime() - now.getTime()) / 1000);
            notifDayBeforeId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '📅 Recordatorio para mañana',
                    body: `Mañana a las ${event.time}: ${event.title}`,
                    sound: 'default',
                    data: { eventId: event.id, type: 'calendar_day_before' },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: Math.max(secondsUntilDayBefore, 1),
                    repeats: false,
                },
            });
            console.log(`🔔 Day-before reminder scheduled for "${event.title}" (${secondsUntilDayBefore}s)`);
        }

        // ── 2) Same-day reminder 1h before (min 08:00) ──
        const sameDay = new Date(eventDate);
        const reminderH = eventH >= 9 ? eventH - 1 : 8;
        const reminderM = eventH >= 9 ? eventM : 0;
        sameDay.setHours(reminderH, reminderM, 0, 0);

        let notifSameDayId: string | undefined;
        if (sameDay > now) {
            const secondsUntilSameDay = Math.floor((sameDay.getTime() - now.getTime()) / 1000);
            notifSameDayId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '⏰ Recordatorio de hoy',
                    body: `Hoy a las ${event.time}: ${event.title}`,
                    sound: 'default',
                    data: { eventId: event.id, type: 'calendar_same_day' },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: Math.max(secondsUntilSameDay, 1),
                    repeats: false,
                },
            });
            console.log(`🔔 Same-day reminder scheduled for "${event.title}" (${secondsUntilSameDay}s)`);
        }

        // Persist the mapping
        const stored = await this.getStoredReminders();
        stored.push({
            eventId: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            type: event.type,
            notifDayBeforeId,
            notifSameDayId,
        });
        await AsyncStorage.setItem(CALENDAR_REMINDERS_KEY, JSON.stringify(stored));
    }

    /** Cancel both reminders for an event */
    async cancelReminders(eventId: string): Promise<void> {
        const stored = await this.getStoredReminders();
        const existing = stored.find(r => r.eventId === eventId);
        if (existing) {
            if (existing.notifDayBeforeId) {
                await Notifications.cancelScheduledNotificationAsync(existing.notifDayBeforeId).catch(() => {});
            }
            if (existing.notifSameDayId) {
                await Notifications.cancelScheduledNotificationAsync(existing.notifSameDayId).catch(() => {});
            }
            const filtered = stored.filter(r => r.eventId !== eventId);
            await AsyncStorage.setItem(CALENDAR_REMINDERS_KEY, JSON.stringify(filtered));
        }
    }

    /** Re-schedule reminders for all future events (call on app start) */
    async rescheduleAll(events: {
        id: string;
        title: string;
        date: string;
        time: string;
        type: string;
    }[]): Promise<void> {
        await this.init();

        // Clear all existing calendar reminders
        const stored = await this.getStoredReminders();
        for (const r of stored) {
            if (r.notifDayBeforeId) {
                await Notifications.cancelScheduledNotificationAsync(r.notifDayBeforeId).catch(() => {});
            }
            if (r.notifSameDayId) {
                await Notifications.cancelScheduledNotificationAsync(r.notifSameDayId).catch(() => {});
            }
        }
        await AsyncStorage.removeItem(CALENDAR_REMINDERS_KEY);

        // Only schedule for future events
        const now = new Date();
        const futureEvents = events.filter(e => new Date(`${e.date}T${e.time}:00`) > now);

        for (const event of futureEvents) {
            await this.scheduleReminders(event);
        }

        console.log(`📅 ${futureEvents.length} calendar reminders re-scheduled`);
    }

    /** Get all stored reminder mappings */
    async getStoredReminders(): Promise<CalendarEventReminder[]> {
        try {
            const data = await AsyncStorage.getItem(CALENDAR_REMINDERS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }
}

export default new CalendarReminderService();
