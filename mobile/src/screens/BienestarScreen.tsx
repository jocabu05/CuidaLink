import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../styles/theme';
import localEventStorage, { LocalEvento } from '../services/localEventStorage';
import ratingLocalService, { DayRating } from '../services/ratingLocalService';
import wearableService, { WearableData } from '../services/wearableService';
import eventosService from '../services/eventosService';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── HELPERS ───
const DAYS_ES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/** Map rating stars (1-5) to mood display */
const ratingToMood = (stars: number): { emoji: string; label: string; color: string } => {
    if (stars >= 5) return { emoji: '😊', label: 'Muy bien', color: '#4CAF50' };
    if (stars >= 4) return { emoji: '🙂', label: 'Bien', color: '#8BC34A' };
    if (stars >= 3) return { emoji: '😐', label: 'Regular', color: '#FF9800' };
    if (stars >= 2) return { emoji: '😟', label: 'Mal', color: '#FF5722' };
    return { emoji: '😢', label: 'Muy mal', color: '#F44336' };
};

/** Get start of N days ago */
const daysAgo = (n: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
};

/** Count local events of a given type within a date range */
const countEventsByType = (events: LocalEvento[], tipo: string, since: Date): number =>
    events.filter(e => e.tipo === tipo && new Date(e.timestamp) >= since).length;

// ─── COMPONENT ───
const BienestarScreen: React.FC = () => {
    const { isDark, colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<'semana' | 'mes'>('semana');

    // Real data state
    const [allEvents, setAllEvents] = useState<LocalEvento[]>([]);
    const [ratings, setRatings] = useState<DayRating[]>([]);
    const [weeklyAvg, setWeeklyAvg] = useState(0);
    const [wearable, setWearable] = useState<WearableData | null>(null);
    const [todayStats, setTodayStats] = useState<{ total: number; completadas: number; porcentaje: number } | null>(null);

    const today = new Date();
    const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    // ─── LOAD DATA ───
    const loadData = useCallback(async () => {
        try {
            const [evts, rats, avg, wear] = await Promise.all([
                localEventStorage.getEventos(),
                ratingLocalService.getRatings(),
                ratingLocalService.getPromedioSemanal(),
                wearableService.getLatestData(),
            ]);
            setAllEvents(evts);
            setRatings(rats);
            setWeeklyAvg(avg);
            setWearable(wear);

            // Try to get today's task stats from backend (gracefully fail)
            try {
                const dashboard = await eventosService.getDashboardHoy(1);
                setTodayStats({
                    total: dashboard.estadisticas.totalTareas,
                    completadas: dashboard.estadisticas.tareasCompletadas,
                    porcentaje: dashboard.estadisticas.porcentajeAvance,
                });
            } catch {
                // Fallback: compute from local events
                const todayEvts = evts.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString());
                const completadas = todayEvts.length;
                setTodayStats({ total: 5, completadas, porcentaje: Math.round((completadas / 5) * 100) });
            }
        } catch (err) {
            console.error('BienestarScreen loadData error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // ─── DERIVED DATA ───
    const periodDays = selectedPeriod === 'semana' ? 7 : 30;
    const since = useMemo(() => daysAgo(periodDays), [periodDays]);

    // Week mood from real ratings
    const weekMoods = useMemo(() => {
        const result: { day: string; emoji: string; label: string; color: string; date: string }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = DAYS_ES[d.getDay()];
            const found = ratings.find(r => r.fecha === dateStr);
            if (found) {
                const mood = ratingToMood(found.estrellas);
                result.push({ day: dayName, ...mood, date: dateStr });
            } else {
                result.push({ day: dayName, emoji: '·', label: 'Sin dato', color: '#9E9E9E', date: dateStr });
            }
        }
        return result;
    }, [ratings]);

    // Activity counts from real events
    const activityCounts = useMemo(() => {
        const pastillas = countEventsByType(allEvents, 'PASTILLA', since);
        const paseos = countEventsByType(allEvents, 'PASEO', since);
        const comidas = countEventsByType(allEvents, 'COMIDA', since);
        const siestas = countEventsByType(allEvents, 'SIESTA', since);
        const llegadas = countEventsByType(allEvents, 'LLEGADA', since);
        return { pastillas, paseos, comidas, siestas, llegadas };
    }, [allEvents, since]);

    // Medication adherence from real events
    const medAdherence = useMemo(() => {
        // Expected: 2 pastilla events/day (10:30 + 18:30 Sinemet) + 1 Aricept + 1 Memantina = simplify as total pastilla events
        const esperadas = selectedPeriod === 'semana' ? 7 * 3 : 30 * 3; // 3 meds per day
        const tomadas = countEventsByType(allEvents, 'PASTILLA', since);
        return { tomadas, esperadas, pct: esperadas > 0 ? Math.min(Math.round((tomadas / esperadas) * 100), 100) : 0 };
    }, [allEvents, since, selectedPeriod]);

    // Overall wellness score from real data
    const overallScore = useMemo(() => {
        let score = 0;
        let factors = 0;

        // Factor 1: Medication adherence (0-100)
        if (medAdherence.esperadas > 0) {
            score += medAdherence.pct;
            factors++;
        }

        // Factor 2: Weekly mood average (1-5 → 0-100)
        if (weeklyAvg > 0) {
            score += (weeklyAvg / 5) * 100;
            factors++;
        }

        // Factor 3: Today's task completion
        if (todayStats) {
            score += todayStats.porcentaje;
            factors++;
        }

        return factors > 0 ? Math.round(score / factors) : 0;
    }, [medAdherence, weeklyAvg, todayStats]);

    const statusColor = overallScore >= 80 ? colors.success : overallScore >= 60 ? colors.warning : overallScore > 0 ? colors.danger : colors.textSecondary;
    const statusLabel = overallScore >= 80 ? 'Muy bien' : overallScore >= 60 ? 'Aceptable' : overallScore > 0 ? 'Necesita atención' : 'Sin datos';

    // ─── LOADING ───
    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando datos…</Text>
            </View>
        );
    }

    const hasRatings = ratings.length > 0;
    const hasEvents = allEvents.length > 0;

    // ─── RENDER ───
    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            {/* ═══ HEADER ═══ */}
            <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
                <View style={[styles.headerCircle1, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                <View style={[styles.headerCircle2, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />

                <Text style={styles.headerTitle}>Bienestar</Text>
                <Text style={styles.headerDate}>{dateStr}</Text>

                {/* Overall score ring */}
                <View style={styles.scoreContainer}>
                    <View style={[styles.scoreRingOuter, { borderColor: 'rgba(255,255,255,0.15)' }]}>
                        <View style={[styles.scoreRingInner, { borderColor: statusColor, borderTopColor: statusColor, borderRightColor: statusColor }]}>
                            <Text style={styles.scoreNumber}>{overallScore}</Text>
                            <Text style={styles.scoreUnit}>/ 100</Text>
                        </View>
                    </View>
                    <View style={[styles.scoreLabelPill, { backgroundColor: statusColor + '30' }]}>
                        <View style={[styles.scoreLabelDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.scoreLabelText, { color: '#fff' }]}>{statusLabel}</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* ═══ PERIOD SELECTOR ═══ */}
                <View style={[styles.periodRow, { backgroundColor: colors.card }]}>
                    {(['semana', 'mes'] as const).map(p => (
                        <TouchableOpacity
                            key={p}
                            style={[styles.periodBtn, selectedPeriod === p && { backgroundColor: colors.primary }]}
                            onPress={() => setSelectedPeriod(p)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.periodBtnText, { color: selectedPeriod === p ? '#fff' : colors.textSecondary }]}>
                                {p === 'semana' ? 'Esta semana' : 'Este mes'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ═══ TODAY'S PROGRESS ═══ */}
                {todayStats && (
                    <>
                        <SectionTitle icon="today" title="Progreso de hoy" colors={colors} />
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <View style={styles.todayRow}>
                                <View style={styles.todayInfo}>
                                    <Text style={[styles.todayLabel, { color: colors.textSecondary }]}>Tareas completadas</Text>
                                    <Text style={[styles.todayFraction, { color: colors.text }]}>
                                        {todayStats.completadas} <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '400' }}>de {todayStats.total}</Text>
                                    </Text>
                                </View>
                                <View style={[styles.todayCircle, { borderColor: todayStats.porcentaje >= 80 ? colors.success : todayStats.porcentaje >= 50 ? colors.warning : colors.primary + '40' }]}>
                                    <Text style={[styles.todayPct, { color: todayStats.porcentaje >= 80 ? colors.success : todayStats.porcentaje >= 50 ? colors.warning : colors.text }]}>
                                        {todayStats.porcentaje}%
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.todayBar, { backgroundColor: isDark ? colors.surface : '#F0F0F0' }]}>
                                <View style={[styles.todayBarFill, {
                                    width: `${Math.min(todayStats.porcentaje, 100)}%`,
                                    backgroundColor: todayStats.porcentaje >= 80 ? colors.success : todayStats.porcentaje >= 50 ? colors.warning : colors.primary,
                                }]} />
                            </View>
                        </View>
                    </>
                )}

                {/* ═══ MOOD TRACKER ═══ */}
                <SectionTitle icon="happy" title="Estado de ánimo (valoraciones)" colors={colors} />
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    {hasRatings ? (
                        <>
                            <View style={styles.moodRow}>
                                {weekMoods.map((m, i) => {
                                    const isToday = i === weekMoods.length - 1;
                                    return (
                                        <View key={i} style={styles.moodItem}>
                                            <Text style={[styles.moodDay, { color: isToday ? colors.primary : colors.textSecondary }]}>{m.day}</Text>
                                            <View style={[styles.moodCircle, { backgroundColor: m.color + '18', borderColor: isToday ? colors.primary : 'transparent', borderWidth: isToday ? 2 : 0 }]}>
                                                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                                            </View>
                                            <Text style={[styles.moodLabel, { color: m.color }]}>{m.label}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                            <View style={[styles.moodAvgRow, { borderTopColor: colors.border }]}>
                                <Text style={[styles.moodAvgLabel, { color: colors.textSecondary }]}>Media semanal</Text>
                                <View style={styles.moodAvgStars}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Ionicons key={s} name={s <= Math.round(weeklyAvg) ? 'star' : 'star-outline'} size={16} color={s <= Math.round(weeklyAvg) ? '#FFB300' : colors.textLight} />
                                    ))}
                                    <Text style={[styles.moodAvgValue, { color: colors.text }]}>{weeklyAvg.toFixed(1)}</Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <EmptyState icon="happy-outline" message="Aún no hay valoraciones. La cuidadora puede valorar cada jornada desde su panel." colors={colors} />
                    )}
                    <Text style={[styles.sourceHint, { color: colors.textLight }]}>
                        <Ionicons name="information-circle-outline" size={11} color={colors.textLight} />{'  '}
                        Datos de las valoraciones diarias de la cuidadora
                    </Text>
                </View>

                {/* ═══ MEDICATION ADHERENCE ═══ */}
                <SectionTitle icon="medical" title="Adherencia a medicación" colors={colors} />
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    {hasEvents ? (
                        <>
                            <View style={styles.medSummaryRow}>
                                <View>
                                    <Text style={[styles.medSummaryValue, { color: colors.text }]}>{medAdherence.tomadas}</Text>
                                    <Text style={[styles.medSummaryLabel, { color: colors.textSecondary }]}>
                                        tomas registradas
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.medSummaryValue, { color: colors.text }]}>{medAdherence.esperadas}</Text>
                                    <Text style={[styles.medSummaryLabel, { color: colors.textSecondary }]}>
                                        esperadas ({selectedPeriod === 'semana' ? '7 días' : '30 días'})
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.barTrack, { backgroundColor: isDark ? colors.surface : '#F0F0F0' }]}>
                                <View style={[styles.barFill, {
                                    width: `${Math.min(medAdherence.pct, 100)}%`,
                                    backgroundColor: medAdherence.pct >= 90 ? colors.success : medAdherence.pct >= 70 ? colors.warning : colors.danger,
                                }]} />
                            </View>
                            <Text style={[styles.medPctText, {
                                color: medAdherence.pct >= 90 ? colors.success : medAdherence.pct >= 70 ? colors.warning : colors.danger,
                            }]}>
                                {medAdherence.pct}% de adherencia
                            </Text>
                        </>
                    ) : (
                        <EmptyState icon="medkit-outline" message="No hay registros de medicación todavía." colors={colors} />
                    )}
                    <Text style={[styles.sourceHint, { color: colors.textLight }]}>
                        <Ionicons name="information-circle-outline" size={11} color={colors.textLight} />{'  '}
                        Basado en los eventos de medicación registrados por la cuidadora
                    </Text>
                </View>

                {/* ═══ ACTIVITY GRID ═══ */}
                <SectionTitle icon="pulse" title={`Actividad (${selectedPeriod === 'semana' ? 'últimos 7 días' : 'últimos 30 días'})`} colors={colors} />
                {hasEvents ? (
                    <View style={styles.activityGrid}>
                        <ActivityCard icon="log-in" label="Llegadas" value={activityCounts.llegadas} sub="visitas" color="#1565C0" colors={colors} />
                        <ActivityCard icon="walk" label="Paseos" value={activityCounts.paseos} sub="realizados" color="#7C4DFF" colors={colors} />
                        <ActivityCard icon="restaurant" label="Comidas" value={activityCounts.comidas} sub="registradas" color="#FF9800" colors={colors} />
                        <ActivityCard icon="bed" label="Siestas" value={activityCounts.siestas} sub="registradas" color="#5C6BC0" colors={colors} />
                    </View>
                ) : (
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <EmptyState icon="pulse" message="Aún no se han registrado actividades. Los datos aparecerán cuando la cuidadora comience a registrar eventos." colors={colors} />
                    </View>
                )}
                {hasEvents && (
                    <Text style={[styles.sourceHintMargin, { color: colors.textLight }]}>
                        <Ionicons name="information-circle-outline" size={11} color={colors.textLight} />{'  '}
                        Datos de los registros reales de cada jornada
                    </Text>
                )}

                {/* ═══ STEPS (real pedometer when available) ═══ */}
                {wearable && (
                    <>
                        <SectionTitle icon="footsteps" title="Actividad física" colors={colors} />
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <View style={styles.stepsRow}>
                                <View style={[styles.stepsIconWrap, { backgroundColor: colors.primary + '14' }]}>
                                    <Ionicons name="footsteps" size={24} color={colors.primary} />
                                </View>
                                <View style={styles.stepsInfo}>
                                    <Text style={[styles.stepsValue, { color: colors.text }]}>{wearable.steps.toLocaleString()}</Text>
                                    <Text style={[styles.stepsLabel, { color: colors.textSecondary }]}>pasos hoy</Text>
                                </View>
                                <View style={[styles.stepsGoal, { backgroundColor: wearable.steps >= 3000 ? colors.success + '14' : colors.warning + '14' }]}>
                                    <Ionicons name={wearable.steps >= 3000 ? 'checkmark-circle' : 'alert-circle'} size={14} color={wearable.steps >= 3000 ? colors.success : colors.warning} />
                                    <Text style={[styles.stepsGoalText, { color: wearable.steps >= 3000 ? colors.success : colors.warning }]}>
                                        {wearable.steps >= 3000 ? 'Objetivo alcanzado' : `Faltan ${(3000 - wearable.steps).toLocaleString()}`}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.barTrack, { backgroundColor: isDark ? colors.surface : '#F0F0F0', marginTop: 12 }]}>
                                <View style={[styles.barFill, {
                                    width: `${Math.min((wearable.steps / 3000) * 100, 100)}%`,
                                    backgroundColor: wearable.steps >= 3000 ? colors.success : colors.primary,
                                }]} />
                            </View>
                            <Text style={[styles.sourceHint, { color: colors.textLight }]}>
                                <Ionicons name="information-circle-outline" size={11} color={colors.textLight} />{'  '}
                                Datos del podómetro del dispositivo (objetivo: 3.000 pasos)
                            </Text>
                        </View>
                    </>
                )}

                {/* ═══ SLEEP (from wearable — show with disclaimer) ═══ */}
                {wearable && (
                    <>
                        <SectionTitle icon="moon" title="Sueño (estimado)" colors={colors} />
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <View style={styles.sleepTop}>
                                <View style={styles.sleepMain}>
                                    <Text style={[styles.sleepHours, { color: colors.text }]}>{wearable.sleepHours}</Text>
                                    <Text style={[styles.sleepHoursUnit, { color: colors.textSecondary }]}>horas</Text>
                                </View>
                                <View style={[styles.sleepQualityPill, {
                                    backgroundColor: wearable.sleepQuality === 'buena' ? colors.success + '18' : wearable.sleepQuality === 'regular' ? colors.warning + '18' : colors.danger + '18',
                                }]}>
                                    <Ionicons
                                        name={wearable.sleepQuality === 'buena' ? 'checkmark-circle' : 'alert-circle'}
                                        size={14}
                                        color={wearable.sleepQuality === 'buena' ? colors.success : wearable.sleepQuality === 'regular' ? colors.warning : colors.danger}
                                    />
                                    <Text style={[styles.sleepQualityText, {
                                        color: wearable.sleepQuality === 'buena' ? colors.success : wearable.sleepQuality === 'regular' ? colors.warning : colors.danger,
                                    }]}>
                                        Calidad {wearable.sleepQuality}
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.sourceHint, { color: colors.textLight }]}>
                                <Ionicons name="information-circle-outline" size={11} color={colors.textLight} />{'  '}
                                Estimación del servicio wearable. En un entorno real se conectaría a dispositivos como pulseras de actividad.
                            </Text>
                        </View>
                    </>
                )}

                {/* ═══ SUMMARY CARD ═══ */}
                <SectionTitle icon="analytics" title="Resumen" colors={colors} />
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <SummaryRow icon="medical" label="Medicación" value={`${medAdherence.pct}%`} valueColor={medAdherence.pct >= 90 ? colors.success : medAdherence.pct >= 70 ? colors.warning : colors.danger} colors={colors} />
                    <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                    <SummaryRow icon="star" label="Valoración media" value={weeklyAvg > 0 ? `${weeklyAvg.toFixed(1)} / 5` : 'Sin datos'} valueColor={weeklyAvg >= 4 ? colors.success : weeklyAvg >= 3 ? colors.warning : colors.textSecondary} colors={colors} />
                    <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                    <SummaryRow icon="checkmark-done" label="Tareas hoy" value={todayStats ? `${todayStats.completadas}/${todayStats.total}` : '—'} valueColor={todayStats && todayStats.porcentaje >= 80 ? colors.success : colors.text} colors={colors} />
                    <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                    <SummaryRow icon="footsteps" label="Pasos hoy" value={wearable ? wearable.steps.toLocaleString() : '—'} valueColor={wearable && wearable.steps >= 3000 ? colors.success : colors.text} colors={colors} />
                </View>

                {/* ═══ NO DATA MESSAGE ═══ */}
                {!hasEvents && !hasRatings && (
                    <View style={[styles.noDataCard, { backgroundColor: isDark ? colors.roleLight : '#E3F2FD' }]}>
                        <View style={[styles.noDataIconWrap, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="information-circle" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.noDataContent}>
                            <Text style={[styles.noDataTitle, { color: colors.text }]}>Datos en camino</Text>
                            <Text style={[styles.noDataDesc, { color: colors.textSecondary }]}>
                                Esta pantalla se alimenta de los registros reales de la app. Cuando la cuidadora registre eventos (llegadas, medicamentos, paseos, comidas) y valore las jornadas, los datos aparecerán aquí automáticamente.
                            </Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
};

// ─── REUSABLE COMPONENTS ───
const SectionTitle = ({ icon, title, colors }: { icon: string; title: string; colors: any }) => (
    <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
);

const ActivityCard = ({ icon, label, value, sub, color, colors }: { icon: string; label: string; value: number; sub: string; color: string; colors: any }) => (
    <View style={[styles.activityCard, { backgroundColor: colors.card }]}>
        <View style={[styles.activityIconWrap, { backgroundColor: color + '14' }]}>
            <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={[styles.activityValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.activitySub, { color: colors.textLight }]}>{sub}</Text>
    </View>
);

const SummaryRow = ({ icon, label, value, valueColor, colors }: { icon: string; label: string; value: string; valueColor: string; colors: any }) => (
    <View style={styles.summaryRow}>
        <Ionicons name={icon as any} size={18} color={colors.textSecondary} />
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.summaryValue, { color: valueColor }]}>{value}</Text>
    </View>
);

const EmptyState = ({ icon, message, colors }: { icon: string; message: string; colors: any }) => (
    <View style={styles.emptyState}>
        <Ionicons name={icon as any} size={32} color={colors.textLight} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
);

// ─── STYLES ───
const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 20 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 12, fontSize: 15 },

    /* Header */
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 48,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        alignItems: 'center',
        overflow: 'hidden',
    },
    headerCircle1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -40, right: -30 },
    headerCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, bottom: -20, left: -20 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
    headerDate: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, textTransform: 'capitalize' },
    scoreContainer: { alignItems: 'center', marginTop: 18 },
    scoreRingOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
    scoreRingInner: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
    scoreNumber: { fontSize: 30, fontWeight: '800', color: '#fff' },
    scoreUnit: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: -2 },
    scoreLabelPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginTop: 10, gap: 6 },
    scoreLabelDot: { width: 8, height: 8, borderRadius: 4 },
    scoreLabelText: { fontSize: 13, fontWeight: '700' },

    /* Period */
    periodRow: {
        flexDirection: 'row', marginHorizontal: 20, marginTop: 16, borderRadius: 12, padding: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    },
    periodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    periodBtnText: { fontSize: 14, fontWeight: '600' },

    /* Section header */
    sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 10, gap: 8 },
    sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

    /* Generic card */
    card: {
        marginHorizontal: 20, borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    },

    /* Today's progress */
    todayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    todayInfo: {},
    todayLabel: { fontSize: 13, marginBottom: 4 },
    todayFraction: { fontSize: 28, fontWeight: '800' },
    todayCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    todayPct: { fontSize: 16, fontWeight: '700' },
    todayBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
    todayBarFill: { height: 8, borderRadius: 4 },

    /* Mood */
    moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
    moodItem: { alignItems: 'center', gap: 4 },
    moodDay: { fontSize: 12, fontWeight: '600' },
    moodCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    moodEmoji: { fontSize: 20 },
    moodLabel: { fontSize: 10, fontWeight: '600' },
    moodAvgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
    moodAvgLabel: { fontSize: 13 },
    moodAvgStars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    moodAvgValue: { fontSize: 14, fontWeight: '700', marginLeft: 6 },

    /* Medication adherence */
    medSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    medSummaryValue: { fontSize: 24, fontWeight: '800' },
    medSummaryLabel: { fontSize: 12, marginTop: 2 },
    barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4 },
    medPctText: { fontSize: 14, fontWeight: '700', marginTop: 8, textAlign: 'center' },

    /* Activity grid */
    activityGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
    activityCard: {
        width: (SCREEN_W - 52) / 2, borderRadius: 16, padding: 14, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    },
    activityIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    activityValue: { fontSize: 24, fontWeight: '800' },
    activityLabel: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    activitySub: { fontSize: 11, marginTop: 2 },

    /* Steps */
    stepsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
    stepsIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    stepsInfo: { flex: 1 },
    stepsValue: { fontSize: 28, fontWeight: '800' },
    stepsLabel: { fontSize: 13, marginTop: 2 },
    stepsGoal: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 4 },
    stepsGoalText: { fontSize: 12, fontWeight: '600' },

    /* Sleep */
    sleepTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sleepMain: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    sleepHours: { fontSize: 36, fontWeight: '800' },
    sleepHoursUnit: { fontSize: 16, fontWeight: '500' },
    sleepQualityPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 4 },
    sleepQualityText: { fontSize: 13, fontWeight: '700' },

    /* Summary */
    summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
    summaryLabel: { flex: 1, fontSize: 14 },
    summaryValue: { fontSize: 15, fontWeight: '700' },
    summaryDivider: { height: 1 },

    /* Source hint */
    sourceHint: { fontSize: 11, marginTop: 10, lineHeight: 16 },
    sourceHintMargin: { fontSize: 11, marginTop: 8, paddingHorizontal: 20, lineHeight: 16 },

    /* Empty state */
    emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
    emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 10 },

    /* No data card */
    noDataCard: { flexDirection: 'row', marginHorizontal: 20, marginTop: 24, borderRadius: 16, padding: 14 },
    noDataIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    noDataContent: { flex: 1 },
    noDataTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    noDataDesc: { fontSize: 13, lineHeight: 19 },
});

export default BienestarScreen;
