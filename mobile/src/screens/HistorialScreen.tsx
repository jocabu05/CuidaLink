/**
 * HistorialScreen.tsx — Historial completo de eventos del paciente.
 *
 * Funcionalidades:
 * - Lista cronológica de todos los eventos registrados
 * - Filtros por tipo (Llegada, Pastilla, Comida, Paseo, Siesta, Caída)
 * - Búsqueda por texto en descripciones
 * - Agrupación por día con separadores visuales
 * - Indicador de verificado (geofence/OCR) en cada evento
 * - Fotos expandibles al pulsar
 *
 * Integra: localEventStorage (offline-first)
 * ~894 líneas
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    Animated,
    Dimensions,
    Platform,
    Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS, CUIDADORA } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HistorialScreenProps {
    abueloId?: number;
}

interface EventoInfo {
    id: number;
    tipo: string;
    timestamp: string;
    verificado: boolean;
    descripcion: string;
    fotoBase64?: string;
    gpsLat?: number;
    gpsLng?: number;
}

// ─── CONFIG ───

const TIPO_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
    LLEGADA:  { color: '#2E7D32', bg: '#E8F5E9', label: 'Llegada',     icon: 'log-in' },
    PASTILLA: { color: '#0277BD', bg: '#E3F2FD', label: 'Medicamento', icon: 'fitness' },
    COMIDA:   { color: '#E65100', bg: '#FFF3E0', label: 'Comida',      icon: 'restaurant' },
    PASEO:    { color: '#6A1B9A', bg: '#F3E5F5', label: 'Paseo',       icon: 'walk' },
    SIESTA:   { color: '#4527A0', bg: '#EDE7F6', label: 'Siesta',      icon: 'moon' },
    CAIDA:    { color: '#C62828', bg: '#FFEBEE', label: 'Caída',       icon: 'alert-circle' },
    SALIDA:   { color: '#37474F', bg: '#ECEFF1', label: 'Salida',      icon: 'exit' },
    FUGA:     { color: '#C62828', bg: '#FFEBEE', label: 'Alerta Fuga', icon: 'warning' },
};

const ALL_TYPES = ['TODOS', ...Object.keys(TIPO_CONFIG)];

// ─── WEEK HELPERS ───

function getWeekDays(centerDate: Date): Date[] {
    const start = new Date(centerDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // start Monday
    start.setDate(start.getDate() + diff);
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        week.push(d);
    }
    return week;
}

const DAY_NAMES_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ─── COMPONENT ───

const HistorialScreen: React.FC<HistorialScreenProps> = ({ abueloId = 1 }) => {
    const { colors } = useTheme();
    const [allEvents, setAllEvents] = useState<EventoInfo[]>([]);
    const [weekEventCounts, setWeekEventCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filterType, setFilterType] = useState('TODOS');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // ─── LOAD DATA ───

    const cargarEventos = useCallback(async (date: Date) => {
        try {
            const localEventStorage = require('../services/localEventStorage').default;
            const allEvts = await localEventStorage.getEventos();
            const targetDay = date.toDateString();

            const filtered = allEvts.filter((e: any) =>
                new Date(e.timestamp).toDateString() === targetDay
            );

            const mapped: EventoInfo[] = filtered.map((e: any) => ({
                id: parseInt(e.id) || Date.now(),
                tipo: e.tipo,
                timestamp: e.timestamp,
                verificado: e.verificado,
                descripcion: e.descripcion,
                fotoBase64: e.fotoBase64,
                gpsLat: e.gpsLat,
                gpsLng: e.gpsLng,
            }));

            setAllEvents(mapped);

            // Count events per day for the week strip
            const week = getWeekDays(date);
            const counts: Record<string, number> = {};
            for (const d of week) {
                const dayStr = d.toDateString();
                counts[dayStr] = allEvts.filter((e: any) =>
                    new Date(e.timestamp).toDateString() === dayStr
                ).length;
            }
            setWeekEventCounts(counts);
        } catch (error) {
            console.error('Error cargando historial:', error);
            setAllEvents([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { cargarEventos(selectedDate); }, [cargarEventos, selectedDate]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        cargarEventos(selectedDate);
    }, [cargarEventos, selectedDate]);

    // ─── NAVIGATION ───

    const cambiarDia = (delta: number) => {
        const nueva = new Date(selectedDate);
        nueva.setDate(nueva.getDate() + delta);
        if (nueva <= new Date()) {
            setSelectedDate(nueva);
            setLoading(true);
        }
    };

    const isHoy = selectedDate.toDateString() === new Date().toDateString();

    const fecha = useMemo(() => selectedDate.toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long',
    }), [selectedDate]);

    // ─── FILTERED EVENTS ───

    const eventos = useMemo(() => {
        const sorted = [...allEvents].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        if (filterType === 'TODOS') return sorted;
        return sorted.filter(e => e.tipo === filterType);
    }, [allEvents, filterType]);

    // ─── STATS ───

    const stats = useMemo(() => {
        const total = allEvents.length;
        const verificados = allEvents.filter(e => e.verificado).length;
        const alertas = allEvents.filter(e => e.tipo === 'CAIDA' || e.tipo === 'FUGA').length;

        // Jornada — first & last event times
        let jornadaInicio = '';
        let jornadaFin = '';
        let duracionMin = 0;
        if (allEvents.length >= 1) {
            const sorted = [...allEvents].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            const first = new Date(sorted[0].timestamp);
            const last = new Date(sorted[sorted.length - 1].timestamp);
            jornadaInicio = first.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            jornadaFin = last.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            duracionMin = Math.round((last.getTime() - first.getTime()) / 60000);
        }

        // Types breakdown
        const byType: Record<string, number> = {};
        allEvents.forEach(e => { byType[e.tipo] = (byType[e.tipo] || 0) + 1; });

        return { total, verificados, alertas, jornadaInicio, jornadaFin, duracionMin, byType };
    }, [allEvents]);

    const formatHora = (timestamp: string): string => {
        return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (mins: number): string => {
        if (mins < 60) return `${mins} min`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}min` : `${h}h`;
    };

    // ─── SHARE ───

    const handleShare = async () => {
        const lines = [
            `📋 Historial — ${fecha}`,
            `Eventos: ${stats.total} | Verificados: ${stats.verificados}`,
            stats.total > 0 ? `Jornada: ${stats.jornadaInicio} – ${stats.jornadaFin} (${formatDuration(stats.duracionMin)})` : '',
            '',
            ...eventos.map(e => {
                const cfg = TIPO_CONFIG[e.tipo] || TIPO_CONFIG.LLEGADA;
                return `${formatHora(e.timestamp)} — ${cfg.label}: ${e.descripcion}${e.verificado ? ' ✓' : ''}`;
            }),
        ].filter(Boolean);
        try {
            await Share.share({ message: lines.join('\n') });
        } catch { }
    };

    // ─── WEEK STRIP ───

    const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

    // ─── RENDER ───

    if (loading && allEvents.length === 0) {
        return (
            <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[s.loadingText, { color: colors.textSecondary }]}>Cargando historial...</Text>
            </View>
        );
    }

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            {/* ── HEADER ── */}
            <View style={[s.header, { backgroundColor: colors.headerBg }]}>
                <View style={s.headerTop}>
                    <View>
                        <Text style={s.headerTitle}>Historial</Text>
                        <Text style={s.headerSubtitle}>Registro de actividades</Text>
                    </View>
                    <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
                        <Ionicons name="share-outline" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── WEEK STRIP ── */}
            <View style={[s.weekStrip, { backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={() => cambiarDia(-7)} style={s.weekArrow}>
                    <Ionicons name="chevron-back" size={18} color={colors.primary} />
                </TouchableOpacity>
                {weekDays.map((d, i) => {
                    const dayStr = d.toDateString();
                    const isSelected = dayStr === selectedDate.toDateString();
                    const isToday = dayStr === new Date().toDateString();
                    const count = weekEventCounts[dayStr] || 0;
                    const isFuture = d > new Date();

                    return (
                        <TouchableOpacity
                            key={i}
                            style={[
                                s.weekDay,
                                isSelected && { backgroundColor: colors.primary },
                                isToday && !isSelected && { borderWidth: 2, borderColor: colors.primary },
                            ]}
                            onPress={() => {
                                if (!isFuture) {
                                    setSelectedDate(d);
                                    setLoading(true);
                                }
                            }}
                            disabled={isFuture}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                s.weekDayName,
                                { color: colors.textLight },
                                isSelected && { color: '#FFF' },
                            ]}>
                                {DAY_NAMES_SHORT[i]}
                            </Text>
                            <Text style={[
                                s.weekDayNum,
                                { color: colors.text },
                                isSelected && { color: '#FFF' },
                                isFuture && { color: colors.textLight, opacity: 0.4 },
                            ]}>
                                {d.getDate()}
                            </Text>
                            {count > 0 && (
                                <View style={[
                                    s.weekDot,
                                    { backgroundColor: isSelected ? '#FFF' : colors.primary },
                                ]}>
                                    <Text style={[s.weekDotText, { color: isSelected ? colors.primary : '#FFF' }]}>
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
                <TouchableOpacity onPress={() => cambiarDia(7)} style={[s.weekArrow, isHoy && { opacity: 0.3 }]} disabled={isHoy}>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* ── DATE LABEL ── */}
            <View style={s.dateLabelRow}>
                <Text style={[s.dateLabel, { color: colors.text }]}>{fecha}</Text>
                {isHoy && (
                    <View style={[s.hoyBadge, { backgroundColor: colors.primary }]}>
                        <Text style={s.hoyText}>Hoy</Text>
                    </View>
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 24 }}
            >
                {/* ── JORNADA SUMMARY ── */}
                {stats.total > 0 && (
                    <View style={[s.jornadaCard, { backgroundColor: colors.card }]}>
                        <View style={s.jornadaRow}>
                            <View style={s.jornadaItem}>
                                <Ionicons name="sunny-outline" size={18} color={colors.primary} />
                                <Text style={[s.jornadaTime, { color: colors.text }]}>{stats.jornadaInicio}</Text>
                                <Text style={[s.jornadaLabel, { color: colors.textSecondary }]}>Inicio</Text>
                            </View>
                            <View style={[s.jornadaDivider, { backgroundColor: colors.border }]} />
                            <View style={s.jornadaItem}>
                                <Ionicons name="time-outline" size={18} color="#FF9800" />
                                <Text style={[s.jornadaTime, { color: colors.text }]}>{formatDuration(stats.duracionMin)}</Text>
                                <Text style={[s.jornadaLabel, { color: colors.textSecondary }]}>Duración</Text>
                            </View>
                            <View style={[s.jornadaDivider, { backgroundColor: colors.border }]} />
                            <View style={s.jornadaItem}>
                                <Ionicons name="moon-outline" size={18} color="#7E57C2" />
                                <Text style={[s.jornadaTime, { color: colors.text }]}>{stats.jornadaFin}</Text>
                                <Text style={[s.jornadaLabel, { color: colors.textSecondary }]}>Fin</Text>
                            </View>
                        </View>

                        {/* Type breakdown mini-pills */}
                        <View style={s.breakdownRow}>
                            {Object.entries(stats.byType).map(([tipo, count]) => {
                                const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.LLEGADA;
                                return (
                                    <View key={tipo} style={[s.breakdownPill, { backgroundColor: cfg.bg }]}>
                                        <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                                        <Text style={[s.breakdownText, { color: cfg.color }]}>{count}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* ── STATS ROW ── */}
                <View style={s.statsRow}>
                    <View style={[s.statCard, { backgroundColor: colors.card }]}>
                        <Ionicons name="layers-outline" size={20} color={colors.primary} />
                        <Text style={[s.statValue, { color: colors.primary }]}>{stats.total}</Text>
                        <Text style={[s.statLabel, { color: colors.textSecondary }]}>Eventos</Text>
                    </View>
                    <View style={[s.statCard, { backgroundColor: colors.card }]}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={CUIDADORA.primary} />
                        <Text style={[s.statValue, { color: CUIDADORA.primary }]}>{stats.verificados}</Text>
                        <Text style={[s.statLabel, { color: colors.textSecondary }]}>Verificados</Text>
                    </View>
                    <View style={[s.statCard, { backgroundColor: colors.card }]}>
                        <Ionicons name="alert-circle-outline" size={20} color={stats.alertas > 0 ? '#C62828' : colors.textLight} />
                        <Text style={[s.statValue, { color: stats.alertas > 0 ? '#C62828' : colors.textLight }]}>{stats.alertas}</Text>
                        <Text style={[s.statLabel, { color: colors.textSecondary }]}>Alertas</Text>
                    </View>
                </View>

                {/* ── FILTER CHIPS ── */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContainer}>
                    {ALL_TYPES.map(t => {
                        const isActive = filterType === t;
                        const cfg = TIPO_CONFIG[t];
                        const chipColor = isActive ? (cfg?.color || colors.primary) : colors.textLight;
                        const chipBg = isActive ? (cfg?.bg || colors.primary + '18') : colors.card;

                        return (
                            <TouchableOpacity
                                key={t}
                                style={[s.filterChip, { backgroundColor: chipBg, borderColor: chipColor + '40', borderWidth: isActive ? 1.5 : 0 }]}
                                onPress={() => setFilterType(t)}
                                activeOpacity={0.7}
                            >
                                {cfg && <Ionicons name={cfg.icon as any} size={14} color={chipColor} />}
                                <Text style={[s.filterChipText, { color: chipColor, fontWeight: isActive ? '700' : '500' }]}>
                                    {cfg?.label || 'Todos'}
                                </Text>
                                {t !== 'TODOS' && stats.byType[t] && (
                                    <View style={[s.filterCount, { backgroundColor: chipColor + '20' }]}>
                                        <Text style={[s.filterCountText, { color: chipColor }]}>{stats.byType[t]}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* ── TIMELINE ── */}
                <View style={s.timelineSection}>
                    {eventos.length === 0 ? (
                        <View style={s.emptyState}>
                            <Ionicons name="calendar-outline" size={52} color={colors.textLight} />
                            <Text style={[s.emptyTitle, { color: colors.text }]}>
                                {filterType === 'TODOS' ? 'Sin actividades' : `Sin ${TIPO_CONFIG[filterType]?.label || 'eventos'}`}
                            </Text>
                            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                                {filterType === 'TODOS'
                                    ? 'Las actividades aparecerán aquí cuando registres llegadas, comidas, medicamentos o paseos'
                                    : 'No hay registros de este tipo para este día'}
                            </Text>
                        </View>
                    ) : (
                        eventos.map((evento, index) => {
                            const config = TIPO_CONFIG[evento.tipo] || TIPO_CONFIG.LLEGADA;
                            const isLast = index === eventos.length - 1;
                            const isExpanded = expandedId === evento.id;

                            return (
                                <View key={evento.id} style={s.timelineItem}>
                                    {/* Timeline line */}
                                    <View style={s.timelineLine}>
                                        <View style={[s.timelineDot, { backgroundColor: config.color }]}>
                                            <Ionicons name={config.icon as any} size={16} color="#FFF" />
                                        </View>
                                        {!isLast && <View style={[s.timelineConnector, { backgroundColor: colors.border }]} />}
                                    </View>

                                    {/* Event Card */}
                                    <TouchableOpacity
                                        style={[s.eventCard, { backgroundColor: colors.card }]}
                                        onPress={() => setExpandedId(isExpanded ? null : evento.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={s.eventHeader}>
                                            <View style={[s.eventTypeBadge, { backgroundColor: config.bg }]}>
                                                <Ionicons name={config.icon as any} size={12} color={config.color} />
                                                <Text style={[s.eventTypeText, { color: config.color }]}>{config.label}</Text>
                                            </View>
                                            <View style={s.eventTimeRow}>
                                                <Text style={[s.eventTime, { color: colors.textSecondary }]}>{formatHora(evento.timestamp)}</Text>
                                                <Ionicons
                                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                    size={16}
                                                    color={colors.textLight}
                                                />
                                            </View>
                                        </View>

                                        <Text style={[s.eventDescription, { color: colors.text }]}>{evento.descripcion}</Text>

                                        {/* Badges row */}
                                        <View style={s.badgesRow}>
                                            {evento.verificado && (
                                                <View style={[s.badge, { backgroundColor: CUIDADORA.light }]}>
                                                    <Ionicons name="checkmark-circle" size={12} color={CUIDADORA.primary} />
                                                    <Text style={[s.badgeText, { color: CUIDADORA.primary }]}>Verificado</Text>
                                                </View>
                                            )}
                                            {evento.gpsLat && evento.gpsLng && (
                                                <View style={[s.badge, { backgroundColor: CUIDADORA.light }]}>
                                                    <Ionicons name="location" size={12} color={CUIDADORA.primary} />
                                                    <Text style={[s.badgeText, { color: CUIDADORA.primary }]}>GPS</Text>
                                                </View>
                                            )}
                                            {evento.fotoBase64 && (
                                                <View style={[s.badge, { backgroundColor: '#F3E5F5' }]}>
                                                    <Ionicons name="camera" size={12} color="#6A1B9A" />
                                                    <Text style={[s.badgeText, { color: '#6A1B9A' }]}>Foto</Text>
                                                </View>
                                            )}
                                            {(evento.tipo === 'CAIDA' || evento.tipo === 'FUGA') && (
                                                <View style={[s.badge, { backgroundColor: '#FFEBEE' }]}>
                                                    <Ionicons name="alert-circle" size={12} color="#C62828" />
                                                    <Text style={[s.badgeText, { color: '#C62828' }]}>Alerta</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <View style={[s.expandedSection, { borderTopColor: colors.border }]}>
                                                {evento.fotoBase64 && (
                                                    <Image
                                                        source={{ uri: evento.fotoBase64.startsWith('data:') ? evento.fotoBase64 : `data:image/jpeg;base64,${evento.fotoBase64}` }}
                                                        style={s.eventPhoto}
                                                        resizeMode="cover"
                                                    />
                                                )}
                                                {evento.gpsLat && evento.gpsLng && (
                                                    <View style={[s.gpsCard, { backgroundColor: colors.background }]}>
                                                        <Ionicons name="navigate" size={16} color={colors.primary} />
                                                        <View style={{ marginLeft: 8 }}>
                                                            <Text style={[s.gpsLabel, { color: colors.textSecondary }]}>Ubicación GPS</Text>
                                                            <Text style={[s.gpsCoords, { color: colors.text }]}>
                                                                {evento.gpsLat.toFixed(5)}, {evento.gpsLng.toFixed(5)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                )}
                                                <Text style={[s.expandedTimestamp, { color: colors.textLight }]}>
                                                    Registrado: {new Date(evento.timestamp).toLocaleString('es-ES')}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

// ─── STYLES ───

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: 15,
    },

    // ── Header
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    shareBtn: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Week Strip
    weekStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        marginHorizontal: SPACING.lg,
        marginTop: -12,
        borderRadius: 18,
        ...SHADOWS.small,
    },
    weekArrow: {
        padding: 4,
    },
    weekDay: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
        borderRadius: 14,
        marginHorizontal: 1,
    },
    weekDayName: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    weekDayNum: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 2,
    },
    weekDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 3,
    },
    weekDotText: {
        fontSize: 9,
        fontWeight: '800',
    },

    // ── Date label
    dateLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: 14,
        paddingBottom: 4,
        gap: 8,
    },
    dateLabel: {
        fontSize: 15,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    hoyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    hoyText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFF',
    },

    // ── Jornada summary
    jornadaCard: {
        marginHorizontal: SPACING.lg,
        marginTop: 8,
        borderRadius: 16,
        padding: SPACING.md,
        ...SHADOWS.small,
    },
    jornadaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    jornadaItem: {
        alignItems: 'center',
        gap: 3,
    },
    jornadaTime: {
        fontSize: 17,
        fontWeight: '800',
    },
    jornadaLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    jornadaDivider: {
        width: 1,
        height: 36,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        flexWrap: 'wrap',
    },
    breakdownPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    breakdownText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // ── Stats
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
    },
    statCard: {
        flex: 1,
        borderRadius: 14,
        padding: SPACING.md,
        alignItems: 'center',
        gap: 4,
        ...SHADOWS.small,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
    },

    // ── Filter chips
    filterScroll: {
        maxHeight: 44,
        marginBottom: 4,
    },
    filterContainer: {
        paddingHorizontal: SPACING.lg,
        gap: 8,
        alignItems: 'center',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        gap: 5,
    },
    filterChipText: {
        fontSize: 12,
    },
    filterCount: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterCountText: {
        fontSize: 9,
        fontWeight: '800',
    },

    // ── Timeline
    timelineSection: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    timelineLine: {
        width: 40,
        alignItems: 'center',
    },
    timelineDot: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    timelineConnector: {
        width: 2,
        flex: 1,
        marginVertical: -2,
    },

    // ── Event card
    eventCard: {
        flex: 1,
        borderRadius: 16,
        padding: 14,
        marginLeft: SPACING.sm,
        marginBottom: SPACING.sm,
        ...SHADOWS.small,
    },
    eventHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    eventTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    eventTypeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    eventTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eventTime: {
        fontSize: 13,
        fontWeight: '600',
    },
    eventDescription: {
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.1,
    },

    // ── Badges
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // ── Expanded details
    expandedSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    eventPhoto: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        marginBottom: 10,
    },
    gpsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
    },
    gpsLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    gpsCoords: {
        fontSize: 13,
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    expandedTimestamp: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
    },

    // ── Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 20,
    },
});

export default React.memo(HistorialScreen);
