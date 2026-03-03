/**
 * weeklyReportService.ts — Servicio de informes semanales.
 *
 * Genera un informe PDF con estadísticas de los últimos 7 días:
 * - Tabla de completitud: % de cada tipo de tarea cumplida
 * - Promedio de valoraciones diarias
 * - Incidencias (caídas, alertas)
 *
 * Métodos:
 * - generarInforme(): genera HTML → PDF con expo-print y lo comparte con expo-sharing
 * - programarNotificacionSemanal(): notificación cada domingo para generar informe
 * - getUltimoInforme(): recupera el último informe generado
 *
 * Usa: expo-print (HTML→PDF), expo-sharing (compartir), localEventStorage + ratingLocalService
 */
import * as Notifications from 'expo-notifications';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import localEventStorage from './localEventStorage';
import ratingLocalService from './ratingLocalService';

const REPORT_KEY = 'cuidalink_weekly_report';

const TIPO_LABELS: Record<string, string> = {
    LLEGADA: 'Llegadas',
    COMIDA: 'Comidas',
    PASTILLA: 'Medicamentos',
    PASEO: 'Paseos',
    SIESTA: 'Siestas',
};

/**
 * Weekly report service — schedules a Monday 9:00 notification
 * and generates a PDF report to share via WhatsApp.
 */
class WeeklyReportService {

    async scheduleWeeklyNotification(): Promise<void> {
        // Cancel existing weekly report notifications
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const notif of scheduled) {
            if (notif.content.data?.type === 'weekly_report') {
                await Notifications.cancelScheduledNotificationAsync(notif.identifier);
            }
        }

        // Schedule every Monday at 9:00
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📊 Informe semanal listo',
                body: 'Tu informe de CuidaLink de esta semana está disponible. Toca para compartir.',
                data: { type: 'weekly_report' },
                sound: 'default',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: 2, // Monday (1=Sunday, 2=Monday)
                hour: 9,
                minute: 0,
            },
        });

        console.log('📅 Informe semanal programado: lunes 9:00');
    }

    async generateAndShareReport(): Promise<void> {
        const eventos = await localEventStorage.getEventos();
        const promedio = await ratingLocalService.getPromedioSemanal();

        const ahora = new Date();
        const hace7dias = new Date(ahora);
        hace7dias.setDate(hace7dias.getDate() - 7);
        const semana = eventos.filter(e => new Date(e.timestamp) >= hace7dias);

        const porTipo: Record<string, number> = {};
        semana.forEach(e => {
            porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
        });

        const fecha = ahora.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        const dias = new Set(semana.map(e => new Date(e.timestamp).toDateString())).size;

        const actividadesHTML = Object.entries(TIPO_LABELS)
            .map(([tipo, label]) => {
                const count = porTipo[tipo] || 0;
                return `<tr><td>${label}</td><td style="text-align:center;font-weight:bold">${count}</td></tr>`;
            }).join('');

        const eventosHTML = semana.slice(0, 20)
            .map(e => {
                const date = new Date(e.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                return `<tr><td>${TIPO_LABELS[e.tipo] || e.tipo}</td><td>${e.descripcion}</td><td>${date}</td></tr>`;
            }).join('');

        const html = `
            <html><head><meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
                h1 { color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
                h2 { color: #1565C0; margin-top: 24px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
                th { background: #f5f5f5; font-weight: bold; }
                .summary { display: flex; gap: 20px; margin: 16px 0; }
                .stat { background: #f0f7ff; padding: 16px; border-radius: 8px; text-align: center; flex: 1; }
                .stat-value { font-size: 28px; font-weight: bold; color: #1565C0; }
                .stat-label { font-size: 12px; color: #666; }
                .footer { margin-top: 30px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            </style></head><body>
                <h1>📋 CuidaLink — Informe Semanal Automático</h1>
                <p>Período: ${fecha}</p>
                <div class="summary">
                    <div class="stat"><div class="stat-value">${semana.length}</div><div class="stat-label">Actividades</div></div>
                    <div class="stat"><div class="stat-value">${dias}</div><div class="stat-label">Días activos</div></div>
                    <div class="stat"><div class="stat-value">${promedio > 0 ? promedio.toFixed(1) : '-'}/5</div><div class="stat-label">Valoración</div></div>
                </div>
                <h2>Desglose por actividad</h2>
                <table><tr><th>Tipo</th><th>Cantidad</th></tr>${actividadesHTML}</table>
                <h2>Últimas actividades</h2>
                <table><tr><th>Tipo</th><th>Descripción</th><th>Fecha</th></tr>${eventosHTML}</table>
                <div class="footer">Generado automáticamente por CuidaLink — ${fecha}</div>
            </body></html>`;

        try {
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Compartir informe semanal CuidaLink',
                    UTI: 'com.adobe.pdf',
                });
            }
            await AsyncStorage.setItem(REPORT_KEY, JSON.stringify({ lastSent: new Date().toISOString() }));
        } catch (err) {
            console.error('Error generando informe semanal:', err);
        }
    }
}

export default new WeeklyReportService();
