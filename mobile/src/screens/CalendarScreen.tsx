/**
 * CalendarScreen.tsx — Calendario compartido de citas y eventos.
 *
 * Funcionalidades:
 * - Vista mensual con días marcados que tienen citas
 * - Lista de citas del día seleccionado con iconos por tipo
 * - Crear/editar/eliminar citas (modal con formulario)
 * - Tipos de cita: Médica, Medicamento, Actividad, Visita, Otro
 * - Recordatorios automáticos vía notificaciones locales
 * - Ambos roles (cuidadora/familiar) pueden gestionar citas
 *
 * Integra: calendarReminderService, backend /api/citas
 * ~1115 líneas
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    Platform,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import calendarReminderService from '../services/calendarReminderService';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── TYPES ───

interface CalendarEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    type: 'cita_medica' | 'medicamento' | 'actividad' | 'visita' | 'otro';
    notes?: string;
    createdBy: 'cuidadora' | 'familiar';
}

interface CalendarScreenProps {
    role: 'cuidadora' | 'familiar';
}

// ─── CONSTANTS ───

const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const EVENT_TYPES: { value: CalendarEvent['type']; label: string; icon: string; color: string }[] = [
    { value: 'cita_medica', label: 'Cita médica', icon: 'medical', color: '#EF5350' },
    { value: 'medicamento', label: 'Medicamento', icon: 'fitness', color: '#66BB6A' },
    { value: 'actividad', label: 'Actividad', icon: 'walk', color: '#42A5F5' },
    { value: 'visita', label: 'Visita familiar', icon: 'people', color: '#AB47BC' },
    { value: 'otro', label: 'Otro', icon: 'calendar', color: '#FFA726' },
];

// ─── DEMO DATA ───
const DEMO_EVENTS: CalendarEvent[] = [
    {
        id: '1',
        title: 'Revisión neurológica',
        date: '2026-03-10',
        time: '10:00',
        type: 'cita_medica',
        notes: 'Dr. Alejandro Vidal - Hospital La Fe',
        createdBy: 'familiar',
    },
    {
        id: '2',
        title: 'Análisis de sangre',
        date: '2026-03-05',
        time: '09:00',
        type: 'cita_medica',
        notes: 'Centro de salud - Ayunas',
        createdBy: 'cuidadora',
    },
    {
        id: '3',
        title: 'Visita de Laura',
        date: '2026-03-08',
        time: '17:00',
        type: 'visita',
        notes: 'Viene con los nietos',
        createdBy: 'familiar',
    },
    {
        id: '4',
        title: 'Revisión medicación',
        date: '2026-03-15',
        time: '11:30',
        type: 'medicamento',
        notes: 'Ajustar dosis de Memantina',
        createdBy: 'cuidadora',
    },
    {
        id: '5',
        title: 'Taller de estimulación',
        date: '2026-03-03',
        time: '10:00',
        type: 'actividad',
        notes: 'Centro de día',
        createdBy: 'cuidadora',
    },
    {
        id: '6',
        title: 'Fisioterapia',
        date: '2026-03-12',
        time: '16:00',
        type: 'actividad',
        createdBy: 'cuidadora',
    },
    {
        id: '7',
        title: 'Podólogo',
        date: '2026-02-28',
        time: '12:00',
        type: 'cita_medica',
        notes: 'Clínica podológica Alzira',
        createdBy: 'familiar',
    },
];

// ─── HELPERS ───

function getMonthDays(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
}

function formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getEventTypeInfo(type: CalendarEvent['type']) {
    return EVENT_TYPES.find(e => e.value === type) || EVENT_TYPES[4];
}

// ─── COMPONENT ───

const CalendarScreen: React.FC<CalendarScreenProps> = ({ role }) => {
    const { colors, isDark } = useTheme();
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string>(
        formatDate(today.getFullYear(), today.getMonth(), today.getDate())
    );
    const [events, setEvents] = useState<CalendarEvent[]>(DEMO_EVENTS);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
        type: 'otro',
        time: '10:00',
    });

    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(headerAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    // ─── PERSISTENCE ───
    const STORAGE_KEY = `@cuidalink_calendar_events_${role}`;

    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored) as CalendarEvent[];
                    if (parsed.length > 0) setEvents(parsed);
                }
            } catch (e) {
                console.warn('Error loading calendar events:', e);
            }
        })();
    }, []);

    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events)).catch(e =>
            console.warn('Error saving calendar events:', e)
        );
    }, [events]);

    useEffect(() => {
        calendarReminderService.rescheduleAll(events).catch(e =>
            console.warn('Error scheduling calendar reminders:', e)
        );
    }, [events]);

    // Month navigation
    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(y => y - 1);
        } else {
            setCurrentMonth(m => m - 1);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(y => y + 1);
        } else {
            setCurrentMonth(m => m + 1);
        }
    };

    const goToToday = () => {
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
        setSelectedDate(formatDate(today.getFullYear(), today.getMonth(), today.getDate()));
    };

    const calendarGrid = useMemo(() => {
        const daysInMonth = getMonthDays(currentYear, currentMonth);
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [currentYear, currentMonth]);

    const selectedEvents = useMemo(
        () => events.filter(e => e.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
        [events, selectedDate]
    );

    const eventDates = useMemo(() => {
        const map: Record<string, CalendarEvent['type'][]> = {};
        events.forEach(e => {
            if (!map[e.date]) map[e.date] = [];
            if (!map[e.date].includes(e.type)) map[e.date].push(e.type);
        });
        return map;
    }, [events]);

    const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

    // Count events this month
    const monthEventCount = useMemo(() => {
        const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        return events.filter(e => e.date.startsWith(prefix)).length;
    }, [events, currentYear, currentMonth]);

    // Upcoming events (next 5 from today)
    const upcomingEvents = useMemo(
        () =>
            events
                .filter(e => e.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                .slice(0, 5),
        [events, todayStr]
    );

    // Add event
    const handleAddEvent = () => {
        if (!newEvent.title?.trim()) {
            Alert.alert('Error', 'Escribe un título para el evento');
            return;
        }
        const event: CalendarEvent = {
            id: Date.now().toString(),
            title: newEvent.title!.trim(),
            date: selectedDate,
            time: newEvent.time || '10:00',
            type: newEvent.type || 'otro',
            notes: newEvent.notes?.trim(),
            createdBy: role,
        };
        setEvents(prev => [...prev, event]);
        setShowAddModal(false);
        setNewEvent({ type: 'otro', time: '10:00' });

        calendarReminderService.scheduleReminders(event).then(() => {
            Alert.alert(
                '🔔 Recordatorios activados',
                `Se notificará el día anterior y el mismo día del evento "${event.title}".`
            );
        }).catch(e => console.warn('Error scheduling reminder:', e));
    };

    const handleDeleteEvent = (id: string) => {
        Alert.alert('Eliminar evento', '¿Seguro que quieres eliminarlo?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () => {
                    setEvents(prev => prev.filter(e => e.id !== id));
                    calendarReminderService.cancelReminders(id).catch(() => {});
                },
            },
        ]);
    };

    // Test notification
    const handleTestNotification = async () => {
        try {
            await calendarReminderService.init();
            const Notif = require('expo-notifications');
            await Notif.scheduleNotificationAsync({
                content: {
                    title: '🔔 Prueba de recordatorio',
                    body: 'Las notificaciones del calendario funcionan correctamente.',
                    sound: 'default',
                },
                trigger: {
                    type: Notif.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: 3,
                    repeats: false,
                },
            });
            Alert.alert('✅ Notificación enviada', 'Recibirás una notificación de prueba en 3 segundos.');
        } catch (e: any) {
            Alert.alert('Error', 'No se pudo enviar la notificación: ' + (e.message || e));
        }
    };

    // ─── RENDER HELPERS ───

    const DAY_SIZE = (SCREEN_W - SPACING.lg * 2 - SPACING.md * 2) / 7;

    const renderDayCell = useCallback((day: number | null, index: number) => {
        if (day === null) return <View key={`e-${index}`} style={{ width: DAY_SIZE, height: DAY_SIZE + 10 }} />;

        const dateStr = formatDate(currentYear, currentMonth, day);
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedDate;
        const hasEvents = eventDates[dateStr];
        const isWeekend = index % 7 >= 5;

        return (
            <TouchableOpacity
                key={`d-${day}`}
                style={{ width: DAY_SIZE, height: DAY_SIZE + 10, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setSelectedDate(dateStr)}
                activeOpacity={0.5}
            >
                <View
                    style={[
                        {
                            width: DAY_SIZE - 6,
                            height: DAY_SIZE - 6,
                            borderRadius: (DAY_SIZE - 6) / 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                        },
                        isSelected && {
                            backgroundColor: colors.primary,
                            ...SHADOWS.medium,
                            shadowColor: colors.primary,
                        },
                        isToday && !isSelected && {
                            backgroundColor: colors.primary + '15',
                            borderWidth: 2,
                            borderColor: colors.primary,
                        },
                    ]}
                >
                    <Text
                        style={[
                            {
                                fontSize: 15,
                                fontWeight: '500',
                                color: isWeekend ? colors.textSecondary : colors.text,
                            },
                            isSelected && { color: '#FFFFFF', fontWeight: '700' },
                            isToday && !isSelected && { color: colors.primary, fontWeight: '800' },
                        ]}
                    >
                        {day}
                    </Text>
                </View>
                {/* Event dots */}
                {hasEvents ? (
                    <View style={{ flexDirection: 'row', gap: 3, marginTop: 2 }}>
                        {hasEvents.slice(0, 3).map((t, j) => (
                            <View
                                key={j}
                                style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: 2.5,
                                    backgroundColor: isSelected ? '#FFFFFF' : getEventTypeInfo(t).color,
                                }}
                            />
                        ))}
                    </View>
                ) : (
                    <View style={{ height: 7 }} />
                )}
            </TouchableOpacity>
        );
    }, [currentYear, currentMonth, todayStr, selectedDate, eventDates, colors, DAY_SIZE]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* ─── DECORATIVE HEADER ─── */}
            <Animated.View
                style={[
                    styles.header,
                    { backgroundColor: colors.headerBg, opacity: headerAnim },
                ]}
            >
                {/* Decorative circles */}
                <View style={[styles.circle, styles.circle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                <View style={[styles.circle, styles.circle2, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                <View style={[styles.circle, styles.circle3, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />

                <View style={styles.headerContent}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Calendario</Text>
                        <Text style={styles.headerSubtitle}>Citas y eventos compartidos</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={goToToday} style={styles.headerPill}>
                            <Ionicons name="today-outline" size={16} color="#FFF" />
                            <Text style={styles.headerPillText}>Hoy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleTestNotification} style={styles.headerIconBtn}>
                            <Ionicons name="notifications-outline" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Month summary strip */}
                <View style={styles.monthStrip}>
                    <View style={styles.monthStripItem}>
                        <Text style={styles.monthStripValue}>{monthEventCount}</Text>
                        <Text style={styles.monthStripLabel}>eventos</Text>
                    </View>
                    <View style={[styles.monthStripDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                    <View style={styles.monthStripItem}>
                        <Text style={styles.monthStripValue}>{selectedEvents.length}</Text>
                        <Text style={styles.monthStripLabel}>hoy</Text>
                    </View>
                    <View style={[styles.monthStripDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                    <View style={styles.monthStripItem}>
                        <Text style={styles.monthStripValue}>{upcomingEvents.length}</Text>
                        <Text style={styles.monthStripLabel}>próximos</Text>
                    </View>
                </View>
            </Animated.View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                {/* ─── MONTH NAVIGATOR ─── */}
                <View style={[styles.monthNav, { backgroundColor: colors.card }, SHADOWS.small]}>
                    <TouchableOpacity onPress={goToPrevMonth} style={styles.navArrow}>
                        <Ionicons name="chevron-back" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={goToToday} style={styles.navCenter}>
                        <Text style={[styles.monthTitle, { color: colors.text }]}>
                            {MONTHS[currentMonth]}
                        </Text>
                        <Text style={[styles.yearBadge, { color: colors.textSecondary }]}>{currentYear}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={goToNextMonth} style={styles.navArrow}>
                        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* ─── CALENDAR CARD ─── */}
                <View style={[styles.calendarCard, { backgroundColor: colors.card }, SHADOWS.small]}>
                    {/* Day headers */}
                    <View style={styles.dayHeaderRow}>
                        {DAYS_SHORT.map((d, i) => (
                            <View key={d} style={{ width: DAY_SIZE, alignItems: 'center' }}>
                                <Text
                                    style={[
                                        styles.dayHeaderText,
                                        { color: i >= 5 ? colors.primary + '80' : colors.textSecondary },
                                    ]}
                                >
                                    {d}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Separator */}
                    <View style={[styles.headerSeparator, { backgroundColor: colors.border + '60' }]} />

                    {/* Grid */}
                    <View style={styles.calendarGrid}>
                        {calendarGrid.map((day, i) => renderDayCell(day, i))}
                    </View>
                </View>

                {/* ─── EVENT TYPE LEGEND ─── */}
                <View style={styles.legendRow}>
                    {EVENT_TYPES.map(t => (
                        <View key={t.value} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: t.color }]} />
                            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.label}</Text>
                        </View>
                    ))}
                </View>

                {/* ─── SELECTED DATE EVENTS ─── */}
                <View style={styles.eventsSection}>
                    <View style={styles.eventsSectionHeader}>
                        <View>
                            <Text style={[styles.eventsSectionTitle, { color: colors.text }]}>
                                {selectedDate === todayStr
                                    ? 'Hoy'
                                    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                                          weekday: 'long',
                                          day: 'numeric',
                                          month: 'long',
                                      })}
                            </Text>
                            <Text style={[styles.eventsCount, { color: colors.textSecondary }]}>
                                {selectedEvents.length === 0
                                    ? 'Sin eventos'
                                    : `${selectedEvents.length} evento${selectedEvents.length > 1 ? 's' : ''}`}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: colors.primary }]}
                            onPress={() => setShowAddModal(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add" size={20} color="#FFFFFF" />
                            <Text style={styles.addButtonText}>Añadir</Text>
                        </TouchableOpacity>
                    </View>

                    {selectedEvents.length === 0 ? (
                        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name="calendar-outline" size={36} color={colors.primary + '60'} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                                Sin eventos este día
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textLight }]}>
                                Pulsa "Añadir" para crear uno
                            </Text>
                        </View>
                    ) : (
                        selectedEvents.map(event => {
                            const typeInfo = getEventTypeInfo(event.type);
                            return (
                                <TouchableOpacity
                                    key={event.id}
                                    style={[styles.eventCard, { backgroundColor: colors.card }]}
                                    onLongPress={() => handleDeleteEvent(event.id)}
                                    activeOpacity={0.8}
                                >
                                    {/* Color accent bar */}
                                    <View style={[styles.eventAccent, { backgroundColor: typeInfo.color }]} />

                                    {/* Time column */}
                                    <View style={[styles.eventTimeCol, { borderRightColor: colors.border + '40' }]}>
                                        <Text style={[styles.eventTimeHour, { color: typeInfo.color }]}>
                                            {event.time.split(':')[0]}
                                        </Text>
                                        <Text style={[styles.eventTimeMin, { color: typeInfo.color + 'CC' }]}>
                                            :{event.time.split(':')[1]}
                                        </Text>
                                    </View>

                                    {/* Content */}
                                    <View style={styles.eventContent}>
                                        <View style={styles.eventTopRow}>
                                            <View style={[styles.eventTypeBadge, { backgroundColor: typeInfo.color + '15' }]}>
                                                <Ionicons name={typeInfo.icon as any} size={12} color={typeInfo.color} />
                                                <Text style={[styles.eventTypeText, { color: typeInfo.color }]}>
                                                    {typeInfo.label}
                                                </Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.creatorBadge,
                                                    {
                                                        backgroundColor:
                                                            event.createdBy === 'cuidadora'
                                                                ? colors.primary + '12'
                                                                : '#AB47BC' + '12',
                                                    },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={event.createdBy === 'cuidadora' ? 'person' : 'people'}
                                                    size={10}
                                                    color={event.createdBy === 'cuidadora' ? colors.primary : '#AB47BC'}
                                                />
                                                <Text
                                                    style={[
                                                        styles.creatorText,
                                                        {
                                                            color:
                                                                event.createdBy === 'cuidadora'
                                                                    ? colors.primary
                                                                    : '#AB47BC',
                                                        },
                                                    ]}
                                                >
                                                    {event.createdBy === 'cuidadora' ? 'Cuidadora' : 'Familiar'}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.eventTitle, { color: colors.text }]}>
                                            {event.title}
                                        </Text>
                                        {event.notes ? (
                                            <Text
                                                style={[styles.eventNotes, { color: colors.textSecondary }]}
                                                numberOfLines={2}
                                            >
                                                {event.notes}
                                            </Text>
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                {/* ─── UPCOMING EVENTS  ─── */}
                {upcomingEvents.length > 0 && (
                    <View style={styles.upcomingSection}>
                        <View style={styles.upcomingSectionHeader}>
                            <Ionicons name="arrow-forward-circle" size={20} color={colors.primary} />
                            <Text style={[styles.upcomingSectionTitle, { color: colors.text }]}>
                                Próximos eventos
                            </Text>
                        </View>

                        {upcomingEvents.map(event => {
                            const typeInfo = getEventTypeInfo(event.type);
                            const eventDate = new Date(event.date + 'T00:00:00');
                            const isEventToday = event.date === todayStr;
                            return (
                                <TouchableOpacity
                                    key={event.id}
                                    style={[styles.upcomingCard, { backgroundColor: colors.card }]}
                                    onPress={() => {
                                        setSelectedDate(event.date);
                                        setCurrentMonth(eventDate.getMonth());
                                        setCurrentYear(eventDate.getFullYear());
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.upcomingIconWrap, { backgroundColor: typeInfo.color + '15' }]}>
                                        <Ionicons name={typeInfo.icon as any} size={22} color={typeInfo.color} />
                                    </View>
                                    <View style={styles.upcomingInfo}>
                                        <Text style={[styles.upcomingTitle, { color: colors.text }]} numberOfLines={1}>
                                            {event.title}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                            <Ionicons name="time-outline" size={12} color={colors.textLight} />
                                            <Text style={[styles.upcomingDate, { color: colors.textSecondary }]}>
                                                {isEventToday
                                                    ? `Hoy · ${event.time}`
                                                    : `${eventDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${event.time}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={[styles.upcomingChevron, { backgroundColor: colors.primary + '08' }]}>
                                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Long-press hint */}
                <Text style={[styles.hint, { color: colors.textLight }]}>
                    Mantén pulsado un evento para eliminarlo
                </Text>
            </ScrollView>

            {/* ─── ADD EVENT MODAL ─── */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        {/* Drag indicator */}
                        <View style={[styles.modalDrag, { backgroundColor: colors.border }]} />

                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo evento</Text>
                                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                    })}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowAddModal(false)}
                                style={[styles.modalClose, { backgroundColor: colors.inputBg }]}
                            >
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Título</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="Ej: Revisión neurológica"
                                placeholderTextColor={colors.textLight}
                                value={newEvent.title}
                                onChangeText={t => setNewEvent(prev => ({ ...prev, title: t }))}
                            />

                            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Hora</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="10:00"
                                placeholderTextColor={colors.textLight}
                                value={newEvent.time}
                                onChangeText={t => setNewEvent(prev => ({ ...prev, time: t }))}
                                keyboardType="numbers-and-punctuation"
                            />

                            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Tipo de evento</Text>
                            <View style={styles.typeGrid}>
                                {EVENT_TYPES.map(t => {
                                    const isActive = newEvent.type === t.value;
                                    return (
                                        <TouchableOpacity
                                            key={t.value}
                                            style={[
                                                styles.typeCard,
                                                {
                                                    borderColor: isActive ? t.color : colors.border + '60',
                                                    backgroundColor: isActive ? t.color + '12' : colors.inputBg,
                                                },
                                            ]}
                                            onPress={() => setNewEvent(prev => ({ ...prev, type: t.value }))}
                                        >
                                            <View
                                                style={[
                                                    styles.typeCardIcon,
                                                    { backgroundColor: isActive ? t.color + '20' : colors.border + '30' },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={t.icon as any}
                                                    size={18}
                                                    color={isActive ? t.color : colors.textLight}
                                                />
                                            </View>
                                            <Text
                                                style={[
                                                    styles.typeCardLabel,
                                                    { color: isActive ? t.color : colors.textSecondary },
                                                ]}
                                            >
                                                {t.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                                Notas (opcional)
                            </Text>
                            <TextInput
                                style={[
                                    styles.modalInput,
                                    styles.modalTextarea,
                                    { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
                                ]}
                                placeholder="Detalles adicionales..."
                                placeholderTextColor={colors.textLight}
                                value={newEvent.notes}
                                onChangeText={t => setNewEvent(prev => ({ ...prev, notes: t }))}
                                multiline
                                numberOfLines={3}
                            />

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                onPress={handleAddEvent}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>Guardar evento</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ─── STYLES ───

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        paddingTop: 56,
        paddingBottom: 16,
        paddingHorizontal: SPACING.lg,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    circle: { position: 'absolute', borderRadius: 999 },
    circle1: { width: 200, height: 200, top: -60, right: -40 },
    circle2: { width: 140, height: 140, bottom: -30, left: -20 },
    circle3: { width: 80, height: 80, top: 30, right: 80 },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
    headerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    headerPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    headerIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Month summary strip
    monthStrip: {
        flexDirection: 'row',
        marginTop: 16,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 4,
    },
    monthStripItem: { flex: 1, alignItems: 'center' },
    monthStripValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    monthStripLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    monthStripDivider: { width: 1, marginVertical: 4 },

    // Month nav
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 18,
    },
    navArrow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navCenter: { alignItems: 'center' },
    monthTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    yearBadge: { fontSize: 13, fontWeight: '600', marginTop: 1 },

    // Calendar card
    calendarCard: {
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.sm,
        borderRadius: 22,
        padding: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    dayHeaderRow: {
        flexDirection: 'row',
        paddingBottom: 6,
    },
    dayHeaderText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
    headerSeparator: { height: 1, marginBottom: 4 },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },

    // Legend
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, fontWeight: '500' },

    // Events section
    eventsSection: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
    eventsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    eventsSectionTitle: { fontSize: 20, fontWeight: '800', textTransform: 'capitalize', letterSpacing: -0.3 },
    eventsCount: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        ...SHADOWS.small,
    },
    addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

    // Empty state
    emptyCard: {
        alignItems: 'center',
        padding: SPACING.xl,
        borderRadius: 20,
        ...SHADOWS.small,
    },
    emptyIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700' },
    emptySubtitle: { fontSize: 13, marginTop: 4 },

    // Event card
    eventCard: {
        flexDirection: 'row',
        borderRadius: 18,
        marginBottom: SPACING.sm,
        overflow: 'hidden',
        ...SHADOWS.small,
    },
    eventAccent: { width: 4 },
    eventTimeCol: {
        width: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        paddingVertical: SPACING.md,
    },
    eventTimeHour: { fontSize: 22, fontWeight: '800' },
    eventTimeMin: { fontSize: 14, fontWeight: '600', marginTop: -2 },
    eventContent: { flex: 1, padding: SPACING.md, paddingLeft: 12 },
    eventTopRow: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
    eventTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    eventTypeText: { fontSize: 11, fontWeight: '700' },
    creatorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
    },
    creatorText: { fontSize: 10, fontWeight: '600' },
    eventTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    eventNotes: { fontSize: 13, marginTop: 4, lineHeight: 18 },

    // Upcoming
    upcomingSection: { paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
    upcomingSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: SPACING.md,
    },
    upcomingSectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
    upcomingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        marginBottom: SPACING.sm,
        ...SHADOWS.small,
    },
    upcomingIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    upcomingInfo: { flex: 1, marginLeft: 12 },
    upcomingTitle: { fontSize: 15, fontWeight: '700' },
    upcomingDate: { fontSize: 12, fontWeight: '500' },
    upcomingChevron: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Hint
    hint: { textAlign: 'center', fontSize: 11, marginTop: SPACING.lg, marginBottom: SPACING.md },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
        maxHeight: '88%',
    },
    modalDrag: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
        paddingTop: 4,
    },
    modalTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    modalSubtitle: { fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
    modalClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
    modalInput: {
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    modalTextarea: { minHeight: 80, textAlignVertical: 'top' },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    typeCardIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeCardLabel: { fontSize: 13, fontWeight: '700' },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: SPACING.lg,
        marginBottom: SPACING.md,
        ...SHADOWS.medium,
    },
    saveButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});

export default CalendarScreen;
