import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS, CUIDADORA } from '../styles/theme';
import localEventStorage, { LocalEvento } from '../services/localEventStorage';
import ratingLocalService, { DayRating } from '../services/ratingLocalService';

const { width: SCREEN_W } = Dimensions.get('window');

const TIPO_LABELS: Record<string, string> = {
    LLEGADA: 'Llegadas', COMIDA: 'Comidas', PASTILLA: 'Medicamentos',
    PASEO: 'Paseos', SIESTA: 'Siestas',
};
const TIPO_ICONS: Record<string, string> = {
    LLEGADA: 'home', COMIDA: 'restaurant', PASTILLA: 'medical',
    PASEO: 'walk', SIESTA: 'bed',
};
const TIPO_COLORS: Record<string, string> = {
    LLEGADA: '#1565C0', COMIDA: '#E65100', PASTILLA: '#0277BD',
    PASEO: '#7B1FA2', SIESTA: '#5C6BC0',
};
const DAYS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const InformeScreen: React.FC = () => {
    const { colors, isDark } = useTheme();
    const [eventos, setEventos] = useState<LocalEvento[]>([]);
    const [promedio, setPromedio] = useState(0);
    const [ratings, setRatings] = useState<DayRating[]>([]);
    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        loadData();
    }, []);

    const loadData = async () => {
        const all = await localEventStorage.getEventos();
        setEventos(all);
        const prom = await ratingLocalService.getPromedioSemanal();
        setPromedio(prom);
        const allRatings = await ratingLocalService.getRatings();
        setRatings(allRatings);
    };

    const now = new Date();

    const weekStats = useMemo(() => {
        const hace7 = new Date(now); hace7.setDate(hace7.getDate() - 7);
        const hace14 = new Date(now); hace14.setDate(hace14.getDate() - 14);
        const thisWeek = eventos.filter(e => new Date(e.timestamp) >= hace7);
        const lastWeek = eventos.filter(e => { const d = new Date(e.timestamp); return d >= hace14 && d < hace7; });
        const thisCount = thisWeek.length, lastCount = lastWeek.length, diff = thisCount - lastCount;
        const pct = lastCount > 0 ? Math.round((diff / lastCount) * 100) : (thisCount > 0 ? 100 : 0);
        const diasActivos = new Set(thisWeek.map(e => new Date(e.timestamp).toDateString())).size;
        const diasActivosPrev = new Set(lastWeek.map(e => new Date(e.timestamp).toDateString())).size;
        const fotos = thisWeek.filter(e => e.fotoBase64).length;
        return { thisCount, lastCount, diff, pct, diasActivos, diasActivosPrev, fotos };
    }, [eventos]);

    const distribution = useMemo(() => {
        const hace7 = new Date(now); hace7.setDate(hace7.getDate() - 7);
        const semana = eventos.filter(e => new Date(e.timestamp) >= hace7);
        const byType: Record<string, number> = {};
        semana.forEach(e => { byType[e.tipo] = (byType[e.tipo] || 0) + 1; });
        const max = Math.max(...Object.values(byType), 1);
        return { byType, max, total: semana.length };
    }, [eventos]);

    const dailyHeatmap = useMemo(() => {
        const days: { label: string; count: number; date: string }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const count = eventos.filter(e => new Date(e.timestamp).toDateString() === d.toDateString()).length;
            days.push({ label: DAYS_ES[d.getDay()], count, date: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) });
        }
        return days;
    }, [eventos]);

    const maxDaily = useMemo(() => Math.max(...dailyHeatmap.map(d => d.count), 1), [dailyHeatmap]);

    const medAdherence = useMemo(() => {
        const hace7 = new Date(now); hace7.setDate(hace7.getDate() - 7);
        const meds = eventos.filter(e => e.tipo === 'PASTILLA' && new Date(e.timestamp) >= hace7).length;
        const expected = 14;
        return { count: meds, expected, pct: Math.min(Math.round((meds / expected) * 100), 100) };
    }, [eventos]);

    const ratingTrend = useMemo(() => {
        const days: { label: string; value: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const rating = ratings.find(r => r.fecha === dateKey);
            days.push({ label: DAYS_ES[d.getDay()], value: rating?.estrellas || 0 });
        }
        return days;
    }, [ratings]);

    const insights = useMemo(() => {
        const items: { icon: string; text: string; color: string }[] = [];
        if (weekStats.diff > 0) {
            items.push({ icon: 'trending-up', text: `Esta semana hay un ${weekStats.pct}% más de actividad que la anterior`, color: '#4CAF50' });
        } else if (weekStats.diff < 0) {
            items.push({ icon: 'trending-down', text: `La actividad ha bajado un ${Math.abs(weekStats.pct)}% respecto a la semana pasada`, color: '#FF9800' });
        }
        if (medAdherence.pct >= 80) {
            items.push({ icon: 'checkmark-circle', text: `Excelente adherencia a la medicación: ${medAdherence.pct}%`, color: '#4CAF50' });
        } else if (medAdherence.count > 0) {
            items.push({ icon: 'alert-circle', text: `La adherencia a medicamentos (${medAdherence.pct}%) puede mejorar`, color: '#FF9800' });
        }
        if (promedio >= 4) {
            items.push({ icon: 'happy', text: `Valoración media excelente: ${promedio.toFixed(1)}/5`, color: '#4CAF50' });
        } else if (promedio >= 2.5) {
            items.push({ icon: 'remove-circle', text: `Valoración media aceptable: ${promedio.toFixed(1)}/5`, color: '#FF9800' });
        } else if (promedio > 0) {
            items.push({ icon: 'sad', text: `Valoración baja: ${promedio.toFixed(1)}/5 — atención recomendada`, color: '#F44336' });
        }
        const bestDay = dailyHeatmap.reduce((a, b) => a.count > b.count ? a : b, dailyHeatmap[0]);
        if (bestDay && bestDay.count > 0) {
            items.push({ icon: 'star', text: `Día más activo: ${bestDay.label} (${bestDay.date}) con ${bestDay.count} actividades`, color: '#1565C0' });
        }
        return items;
    }, [weekStats, medAdherence, promedio, dailyHeatmap]);

    const exportPDF = async () => {
        const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7);
        const semana = eventos.filter(e => new Date(e.timestamp) >= hace7);
        const porTipo: Record<string, number> = {};
        semana.forEach(e => { porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1; });
        const hoy = eventos.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length;
        const diasActivos = new Set(eventos.map(e => new Date(e.timestamp).toDateString())).size;
        const actividadesHTML = Object.entries(TIPO_LABELS)
            .map(([tipo, label]) => `<tr><td>${label}</td><td style="text-align:center;font-weight:bold">${porTipo[tipo] || 0}</td></tr>`)
            .join('');
        const eventosHTML = eventos.slice(0, 20)
            .map(e => {
                const date = new Date(e.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                return `<tr><td>${TIPO_LABELS[e.tipo] || e.tipo}</td><td>${e.descripcion}</td><td>${date}</td></tr>`;
            }).join('');
        const maxCount = Math.max(...Object.keys(TIPO_LABELS).map(t => porTipo[t] || 0), 1);
        const distributionBarsHTML = Object.entries(TIPO_LABELS).map(([tipo, label]) => {
            const count = porTipo[tipo] || 0, width = Math.round((count / maxCount) * 100);
            return `<div style="margin: 6px 0; display: flex; align-items: center;">
                <span style="width: 110px; font-size: 13px;">${label}</span>
                <div style="flex: 1; background: #eee; border-radius: 6px; height: 24px; overflow: hidden;">
                    <div style="width: ${width}%; min-width: ${count > 0 ? '20px' : '0'}; background: ${TIPO_COLORS[tipo]}; height: 100%; border-radius: 6px;"></div>
                </div>
                <span style="width: 30px; text-align: right; font-weight: bold; margin-left: 8px;">${count}</span>
            </div>`;
        }).join('');
        const weeklyBarsArr: { label: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dayLabel = d.toLocaleDateString('es-ES', { weekday: 'short' }).substring(0, 3);
            const dayCount = eventos.filter(e => new Date(e.timestamp).toDateString() === d.toDateString()).length;
            weeklyBarsArr.push({ label: dayLabel, count: dayCount });
        }
        const maxWeekly = Math.max(...weeklyBarsArr.map(b => b.count), 1);
        const weeklyBarsHTML = `<div style="display: flex; align-items: flex-end; gap: 6px; height: 160px; border-bottom: 2px solid #ddd; padding: 0 10px;">
            ${weeklyBarsArr.map(b => {
                const h = Math.max(Math.round((b.count / maxWeekly) * 120), 4);
                return `<div style="flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                    <span style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">${b.count}</span>
                    <div style="width: 80%; height: ${h}px; background: ${CUIDADORA.accent}; border-radius: 4px 4px 0 0;"></div>
                </div>`;
            }).join('')}
        </div>
        <div style="display: flex; gap: 6px; padding: 0 10px;">
            ${weeklyBarsArr.map(b => `<div style="flex: 1; text-align: center; font-size: 11px; color: #555; margin-top: 4px; text-transform: capitalize;">${b.label}</div>`).join('')}
        </div>`;
        const insightsHTML = insights.length > 0 ? `
            <h2>💡 Observaciones destacadas</h2>
            <ul>${insights.map(i => `<li style="margin: 6px 0; color: ${i.color}; font-weight: 500;">${i.text}</li>`).join('')}</ul>
        ` : '';
        const html = `
            <html><head><meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
                h1 { color: ${CUIDADORA.accent}; border-bottom: 2px solid ${CUIDADORA.accent}; padding-bottom: 10px; }
                h2 { color: ${CUIDADORA.primary}; margin-top: 24px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
                th { background: #f5f5f5; font-weight: bold; }
                .summary { display: flex; gap: 20px; margin: 16px 0; }
                .stat { background: ${CUIDADORA.light}; padding: 16px; border-radius: 8px; text-align: center; flex: 1; }
                .stat-value { font-size: 28px; font-weight: bold; color: ${CUIDADORA.primary}; }
                .stat-label { font-size: 12px; color: #666; }
                .footer { margin-top: 30px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            </style></head><body>
                <h1>📋 CuidaLink — Informe Semanal</h1>
                <p>Fecha: ${fecha}</p>
                <div class="summary">
                    <div class="stat"><div class="stat-value">${semana.length}</div><div class="stat-label">Actividades (7 días)</div></div>
                    <div class="stat"><div class="stat-value">${hoy}</div><div class="stat-label">Hoy</div></div>
                    <div class="stat"><div class="stat-value">${diasActivos}</div><div class="stat-label">Días activos</div></div>
                    <div class="stat"><div class="stat-value">${promedio > 0 ? promedio.toFixed(1) : '-'}/5</div><div class="stat-label">Valoración media</div></div>
                </div>
                ${insightsHTML}
                <h2>📊 Distribución por actividad</h2>
                <table><tr><th>Tipo</th><th>Cantidad</th></tr>${actividadesHTML}</table>
                <div style="margin-top: 16px;">${distributionBarsHTML}</div>
                <h2>📈 Tendencia semanal</h2>
                ${weeklyBarsHTML}
                <h2>📋 Últimas actividades</h2>
                <table><tr><th>Tipo</th><th>Descripción</th><th>Fecha</th></tr>${eventosHTML}</table>
                <div class="footer">Generado automáticamente por CuidaLink — ${fecha}</div>
            </body></html>`;
        try {
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartir informe CuidaLink', UTI: 'com.adobe.pdf' });
            } else {
                Alert.alert('PDF generado', `Archivo guardado en: ${uri}`);
            }
        } catch (err) {
            console.error('Error exportando PDF:', err);
            Alert.alert('Error', 'No se pudo generar el PDF');
        }
    };

    const BAR_MAX_W = SCREEN_W - SPACING.lg * 2 - SPACING.lg * 2 - 100;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View style={[styles.header, { backgroundColor: colors.headerBg, opacity: headerAnim }]}>
                <View style={[styles.circle, styles.circle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                <View style={[styles.circle, styles.circle2, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                <View style={styles.headerContent}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Informe Semanal</Text>
                        <Text style={styles.headerSubtitle}>Resumen de actividad y bienestar</Text>
                    </View>
                    <TouchableOpacity style={styles.headerPdfBtn} onPress={exportPDF} activeOpacity={0.8}>
                        <Ionicons name="document-text" size={18} color="#FFF" />
                        <Text style={styles.headerPdfText}>PDF</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.comparisonRow}>
                    <View style={[styles.compareCard, { backgroundColor: colors.card }]}>
                        <View style={[styles.compareIconWrap, { backgroundColor: colors.primary + '12' }]}>
                            <Ionicons name="pulse" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.compareValue, { color: colors.text }]}>{weekStats.thisCount}</Text>
                        <Text style={[styles.compareLabel, { color: colors.textSecondary }]}>Actividades</Text>
                        <View style={[styles.compareTrend, { backgroundColor: weekStats.diff >= 0 ? '#4CAF5015' : '#FF980015' }]}>
                            <Ionicons name={weekStats.diff >= 0 ? 'arrow-up' : 'arrow-down'} size={12} color={weekStats.diff >= 0 ? '#4CAF50' : '#FF9800'} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: weekStats.diff >= 0 ? '#4CAF50' : '#FF9800' }}>
                                {weekStats.diff >= 0 ? '+' : ''}{weekStats.diff}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.compareCard, { backgroundColor: colors.card }]}>
                        <View style={[styles.compareIconWrap, { backgroundColor: '#FF980012' }]}>
                            <Ionicons name="calendar" size={20} color="#FF9800" />
                        </View>
                        <Text style={[styles.compareValue, { color: colors.text }]}>{weekStats.diasActivos}</Text>
                        <Text style={[styles.compareLabel, { color: colors.textSecondary }]}>Días activos</Text>
                        <View style={[styles.compareTrend, { backgroundColor: weekStats.diasActivos >= weekStats.diasActivosPrev ? '#4CAF5015' : '#FF980015' }]}>
                            <Ionicons name={weekStats.diasActivos >= weekStats.diasActivosPrev ? 'arrow-up' : 'arrow-down'} size={12} color={weekStats.diasActivos >= weekStats.diasActivosPrev ? '#4CAF50' : '#FF9800'} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: weekStats.diasActivos >= weekStats.diasActivosPrev ? '#4CAF50' : '#FF9800' }}>
                                {weekStats.diasActivos - weekStats.diasActivosPrev >= 0 ? '+' : ''}{weekStats.diasActivos - weekStats.diasActivosPrev}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.compareCard, { backgroundColor: colors.card }]}>
                        <View style={[styles.compareIconWrap, { backgroundColor: '#FFB30012' }]}>
                            <Ionicons name="star" size={20} color="#FFB300" />
                        </View>
                        <Text style={[styles.compareValue, { color: colors.text }]}>
                            {promedio > 0 ? promedio.toFixed(1) : '-'}
                        </Text>
                        <Text style={[styles.compareLabel, { color: colors.textSecondary }]}>Valoración</Text>
                        <Text style={{ fontSize: 14, color: '#FFB300', marginTop: 2 }}>
                            {'★'.repeat(Math.round(promedio))}{'☆'.repeat(5 - Math.round(promedio))}
                        </Text>
                    </View>
                </View>
                {insights.length > 0 && (
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: '#FFB30015' }]}>
                                <Ionicons name="bulb" size={18} color="#FFB300" />
                            </View>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Observaciones</Text>
                        </View>
                        {insights.map((item, idx) => (
                            <View key={idx} style={[styles.insightRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border + '40' }]}>
                                <View style={[styles.insightIcon, { backgroundColor: item.color + '12' }]}>
                                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                                </View>
                                <Text style={[styles.insightText, { color: colors.text }]}>{item.text}</Text>
                            </View>
                        ))}
                    </View>
                )}
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconWrap, { backgroundColor: colors.primary + '12' }]}>
                            <Ionicons name="bar-chart" size={18} color={colors.primary} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Actividad diaria</Text>
                        <Text style={[styles.cardBadge, { color: colors.textLight }]}>7 días</Text>
                    </View>
                    <View style={styles.chartContainer}>
                        {dailyHeatmap.map((day, idx) => {
                            const barH = Math.max(Math.round((day.count / maxDaily) * 100), 4), isToday = idx === 6;
                            return (
                                <View key={idx} style={styles.chartColumn}>
                                    <Text style={[styles.chartValue, { color: isToday ? colors.primary : colors.textSecondary }]}>{day.count}</Text>
                                    <View style={[styles.chartBarBg, { backgroundColor: colors.border + '30' }]}>
                                        <View style={[styles.chartBar, { height: barH, backgroundColor: isToday ? colors.primary : colors.primary + '60', borderRadius: 4 }]} />
                                    </View>
                                    <Text style={[styles.chartLabel, { color: isToday ? colors.primary : colors.textLight }, isToday && { fontWeight: '800' }]}>{day.label}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconWrap, { backgroundColor: '#7B1FA212' }]}>
                            <Ionicons name="pie-chart" size={18} color="#7B1FA2" />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Distribución</Text>
                        <Text style={[styles.cardBadge, { color: colors.textLight }]}>{distribution.total} total</Text>
                    </View>
                    {Object.entries(TIPO_LABELS).map(([tipo, label]) => {
                        const count = distribution.byType[tipo] || 0, width = Math.round((count / distribution.max) * 100);
                        return (
                            <View key={tipo} style={styles.distRow}>
                                <View style={[styles.distIconWrap, { backgroundColor: (TIPO_COLORS[tipo] || colors.primary) + '12' }]}>
                                    <Ionicons name={(TIPO_ICONS[tipo] || 'ellipse') as any} size={16} color={TIPO_COLORS[tipo] || colors.primary} />
                                </View>
                                <Text style={[styles.distLabel, { color: colors.text }]}>{label}</Text>
                                <View style={styles.distBarContainer}>
                                    <View style={[styles.distBarBg, { backgroundColor: colors.border + '25' }]}>
                                        <View style={[styles.distBarFill, { width: `${Math.max(width, count > 0 ? 8 : 0)}%`, backgroundColor: TIPO_COLORS[tipo] || colors.primary }]} />
                                    </View>
                                </View>
                                <Text style={[styles.distCount, { color: TIPO_COLORS[tipo] || colors.primary }]}>{count}</Text>
                            </View>
                        );
                    })}
                </View>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconWrap, { backgroundColor: '#0277BD12' }]}>
                            <Ionicons name="medical" size={18} color="#0277BD" />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Medicación</Text>
                    </View>
                    <View style={styles.adherenceRow}>
                        <View style={styles.adherenceRing}>
                            <View style={[styles.ringOuter, { borderColor: colors.border + '30' }]}>
                                <View style={[styles.ringProgress, {
                                    borderColor: medAdherence.pct >= 80 ? '#4CAF50' : medAdherence.pct >= 50 ? '#FF9800' : '#F44336',
                                    borderTopColor: 'transparent',
                                    transform: [{ rotate: `${(medAdherence.pct / 100) * 360}deg` }],
                                }]} />
                                <View style={[styles.ringInner, { backgroundColor: colors.card }]}>
                                    <Text style={[styles.ringValue, { color: colors.text }]}>{medAdherence.pct}%</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.adherenceInfo}>
                            <Text style={[styles.adherenceTitle, { color: colors.text }]}>Adherencia semanal</Text>
                            <Text style={[styles.adherenceDesc, { color: colors.textSecondary }]}>
                                {medAdherence.count} de {medAdherence.expected} tomas registradas
                            </Text>
                            <View style={[styles.adherenceStatusBadge, {
                                backgroundColor: medAdherence.pct >= 80 ? '#4CAF5015' : medAdherence.pct >= 50 ? '#FF980015' : '#F4433615',
                            }]}>
                                <Text style={{
                                    fontSize: 12, fontWeight: '700',
                                    color: medAdherence.pct >= 80 ? '#4CAF50' : medAdherence.pct >= 50 ? '#FF9800' : '#F44336',
                                }}>
                                    {medAdherence.pct >= 80 ? 'Excelente' : medAdherence.pct >= 50 ? 'Regular' : 'Baja'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconWrap, { backgroundColor: '#FFB30015' }]}>
                            <Ionicons name="heart" size={18} color="#FFB300" />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Valoración diaria</Text>
                    </View>
                    <View style={styles.ratingTrendRow}>
                        {ratingTrend.map((day, idx) => {
                            const isToday = idx === 6;
                            const emoji = day.value >= 4.5 ? '😄' : day.value >= 3.5 ? '🙂' : day.value >= 2.5 ? '😐' : day.value > 0 ? '😟' : '—';
                            return (
                                <View key={idx} style={styles.ratingTrendCol}>
                                    <Text style={{ fontSize: day.value > 0 ? 24 : 16, textAlign: 'center' }}>{emoji}</Text>
                                    {day.value > 0 ? (
                                        <Text style={[styles.ratingTrendVal, { color: isToday ? colors.primary : colors.textSecondary }]}>{day.value.toFixed(1)}</Text>
                                    ) : (
                                        <Text style={[styles.ratingTrendVal, { color: colors.textLight }]}>—</Text>
                                    )}
                                    <Text style={[styles.ratingTrendLabel, { color: isToday ? colors.primary : colors.textLight }, isToday && { fontWeight: '800' }]}>{day.label}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
                <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.primary }]} onPress={exportPDF} activeOpacity={0.85}>
                    <View style={styles.exportIconWrap}>
                        <Ionicons name="document-text" size={24} color="#FFFFFF" />
                    </View>
                    <View>
                        <Text style={styles.exportTitle}>Exportar informe PDF</Text>
                        <Text style={styles.exportSubtitle}>Genera y comparte el informe completo</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                <Text style={[styles.sourceHint, { color: colors.textLight }]}>
                    Datos obtenidos de la actividad registrada en la app
                </Text>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 56, paddingBottom: 20, paddingHorizontal: SPACING.lg,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden',
    },
    circle: { position: 'absolute', borderRadius: 999 },
    circle1: { width: 200, height: 200, top: -60, right: -40 },
    circle2: { width: 140, height: 140, bottom: -30, left: -20 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
    headerPdfBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    },
    headerPdfText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    comparisonRow: {
        flexDirection: 'row', paddingHorizontal: SPACING.lg,
        marginTop: SPACING.md, gap: SPACING.sm,
    },
    compareCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', ...SHADOWS.small },
    compareIconWrap: {
        width: 36, height: 36, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    compareValue: { fontSize: 26, fontWeight: '800' },
    compareLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    compareTrend: {
        flexDirection: 'row', alignItems: 'center', gap: 2,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 6,
    },
    card: {
        marginHorizontal: SPACING.lg, borderRadius: 20,
        padding: SPACING.lg, marginTop: SPACING.md, ...SHADOWS.small,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
    cardIconWrap: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    cardTitle: { fontSize: 16, fontWeight: '800', flex: 1, letterSpacing: -0.2 },
    cardBadge: { fontSize: 12, fontWeight: '600' },
    insightRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    insightIcon: {
        width: 30, height: 30, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    insightText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },
    chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4 },
    chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
    chartValue: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
    chartBarBg: {
        width: '80%', height: 100, borderRadius: 6,
        justifyContent: 'flex-end', overflow: 'hidden',
    },
    chartBar: { width: '100%' },
    chartLabel: { fontSize: 11, fontWeight: '600', marginTop: 6, textTransform: 'capitalize' },
    distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    distIconWrap: {
        width: 30, height: 30, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center', marginRight: 8,
    },
    distLabel: { width: 90, fontSize: 13, fontWeight: '600' },
    distBarContainer: { flex: 1, marginHorizontal: 8 },
    distBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
    distBarFill: { height: '100%', borderRadius: 5 },
    distCount: { width: 26, textAlign: 'right', fontSize: 14, fontWeight: '800' },
    adherenceRow: { flexDirection: 'row', alignItems: 'center' },
    adherenceRing: { marginRight: 16 },
    ringOuter: {
        width: 80, height: 80, borderRadius: 40, borderWidth: 6,
        alignItems: 'center', justifyContent: 'center',
    },
    ringProgress: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 6 },
    ringInner: {
        width: 64, height: 64, borderRadius: 32,
        alignItems: 'center', justifyContent: 'center',
    },
    ringValue: { fontSize: 20, fontWeight: '800' },
    adherenceInfo: { flex: 1 },
    adherenceTitle: { fontSize: 15, fontWeight: '700' },
    adherenceDesc: { fontSize: 13, marginTop: 3, lineHeight: 18 },
    adherenceStatusBadge: {
        alignSelf: 'flex-start', paddingHorizontal: 10,
        paddingVertical: 4, borderRadius: 8, marginTop: 8,
    },
    ratingTrendRow: { flexDirection: 'row', gap: 2 },
    ratingTrendCol: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    ratingTrendVal: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    ratingTrendLabel: { fontSize: 11, fontWeight: '600', marginTop: 4, textTransform: 'capitalize' },
    exportButton: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg,
        marginTop: SPACING.lg, padding: SPACING.md, borderRadius: 18, ...SHADOWS.medium,
    },
    exportIconWrap: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    exportTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    exportSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
    sourceHint: { textAlign: 'center', fontSize: 11, marginTop: SPACING.lg, marginBottom: SPACING.md },
});

export default React.memo(InformeScreen);
