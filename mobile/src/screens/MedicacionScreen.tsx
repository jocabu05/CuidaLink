/**
 * MedicacionScreen.tsx — Gestión de medicación del paciente (rol Familiar).
 *
 * Funcionalidades:
 * - Lista de medicamentos con horarios
 * - Añadir/editar/eliminar medicamentos
 * - Programar recordatorios de notificación para cada medicamento
 * - Historial de tomas (cuáles se han verificado hoy)
 * - Vista de próxima toma con countdown
 *
 * Integra: reminderService (notificaciones), eventosService (historial)
 * ~818 líneas
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    Switch,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import localEventStorage, { LocalEvento } from '../services/localEventStorage';
import notificationService from '../services/notificationService';

const { width: SCREEN_W } = Dimensions.get('window');
const MEDS_KEY = '@cuidalink_medicamentos';

// ─── TYPES ───

interface Medicamento {
    id: string;
    nombre: string;
    principioActivo: string;
    dosis: string;
    frecuencia: string;
    horarios: string[];
    notas: string;
    color: string;
    recordatorio: boolean;
}

// ─── DEFAULT MEDICATIONS ───

const DEFAULT_MEDS: Medicamento[] = [
    {
        id: 'med_sinemet',
        nombre: 'Sinemet',
        principioActivo: 'Levodopa/Carbidopa',
        dosis: '10/100 mg',
        frecuencia: '2 veces al día',
        horarios: ['10:30', '18:30'],
        notas: 'Tomar con alimentos. No mezclar con proteínas.',
        color: '#0277BD',
        recordatorio: true,
    },
    {
        id: 'med_aricept',
        nombre: 'Aricept',
        principioActivo: 'Donepezilo',
        dosis: '5 mg',
        frecuencia: '1 vez al día',
        horarios: ['09:00'],
        notas: 'Tomar por la mañana en ayunas.',
        color: '#2E7D32',
        recordatorio: true,
    },
    {
        id: 'med_memantina',
        nombre: 'Memantina',
        principioActivo: '',
        dosis: '10 mg',
        frecuencia: '1 vez al día',
        horarios: ['21:00'],
        notas: 'Tomar antes de dormir.',
        color: '#6A1B9A',
        recordatorio: true,
    },
];

// ─── HELPERS ───

const generateId = () => `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

// ─── COMPONENT ───

const MedicacionScreen: React.FC = () => {
    const { colors, isDark } = useTheme();
    const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
    const [eventos, setEventos] = useState<LocalEvento[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingMed, setEditingMed] = useState<Medicamento | null>(null);
    const [expandedMed, setExpandedMed] = useState<string | null>(null);
    const headerAnim = useRef(new Animated.Value(0)).current;

    // Modal form state
    const [formNombre, setFormNombre] = useState('');
    const [formPrincipio, setFormPrincipio] = useState('');
    const [formDosis, setFormDosis] = useState('');
    const [formFrecuencia, setFormFrecuencia] = useState('');
    const [formHorarios, setFormHorarios] = useState('');
    const [formNotas, setFormNotas] = useState('');
    const [formColor, setFormColor] = useState('#0277BD');

    useEffect(() => {
        Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        loadData();
    }, []);

    // ─── DATA ───

    const loadData = useCallback(async () => {
        try {
            const [medsStr, evts] = await Promise.all([
                AsyncStorage.getItem(MEDS_KEY),
                localEventStorage.getEventos(),
            ]);

            if (medsStr) {
                setMedicamentos(JSON.parse(medsStr));
            } else {
                // First launch: use defaults and save
                setMedicamentos(DEFAULT_MEDS);
                await AsyncStorage.setItem(MEDS_KEY, JSON.stringify(DEFAULT_MEDS));
            }
            setEventos(evts);
        } catch (e) {
            console.error('MedicacionScreen loadData:', e);
            setMedicamentos(DEFAULT_MEDS);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const saveMeds = async (meds: Medicamento[]) => {
        setMedicamentos(meds);
        await AsyncStorage.setItem(MEDS_KEY, JSON.stringify(meds));
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
    }, [loadData]);

    // ─── COMPUTED ───

    const todayEvents = useMemo(() => {
        const today = new Date().toDateString();
        return eventos.filter(e => e.tipo === 'PASTILLA' && new Date(e.timestamp).toDateString() === today);
    }, [eventos]);

    const weekEvents = useMemo(() => {
        const hace7 = new Date();
        hace7.setDate(hace7.getDate() - 7);
        return eventos.filter(e => e.tipo === 'PASTILLA' && new Date(e.timestamp) >= hace7);
    }, [eventos]);

    // Build today's timeline
    const todayTimeline = useMemo(() => {
        const items: { hora: string; med: Medicamento; tomada: boolean }[] = [];
        medicamentos.forEach(med => {
            med.horarios.forEach(hora => {
                // Check if this specific dose was taken (match by time proximity + description)
                const taken = todayEvents.some(e => {
                    const desc = e.descripcion.toLowerCase();
                    return desc.includes(med.nombre.toLowerCase()) || desc.includes(med.dosis.toLowerCase());
                });
                items.push({ hora, med, tomada: taken });
            });
        });
        items.sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
        return items;
    }, [medicamentos, todayEvents]);

    // Weekly adherence
    const adherencia = useMemo(() => {
        const totalExpected = medicamentos.reduce((sum, m) => sum + m.horarios.length * 7, 0);
        const totalTaken = weekEvents.length;
        const pct = totalExpected > 0 ? Math.min(Math.round((totalTaken / totalExpected) * 100), 100) : 0;
        return { taken: totalTaken, expected: totalExpected, pct };
    }, [medicamentos, weekEvents]);

    const adherenceColor = adherencia.pct >= 80 ? colors.success : adherencia.pct >= 60 ? colors.warning : colors.danger;

    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    // ─── ACTIONS ───

    const openAddModal = () => {
        setEditingMed(null);
        setFormNombre('');
        setFormPrincipio('');
        setFormDosis('');
        setFormFrecuencia('1 vez al día');
        setFormHorarios('');
        setFormNotas('');
        setFormColor(FORM_COLORS[Math.floor(Math.random() * FORM_COLORS.length)]);
        setShowModal(true);
    };

    const openEditModal = (med: Medicamento) => {
        setEditingMed(med);
        setFormNombre(med.nombre);
        setFormPrincipio(med.principioActivo);
        setFormDosis(med.dosis);
        setFormFrecuencia(med.frecuencia);
        setFormHorarios(med.horarios.join(', '));
        setFormNotas(med.notas);
        setFormColor(med.color);
        setShowModal(true);
    };

    const handleSaveMed = async () => {
        if (!formNombre.trim() || !formDosis.trim() || !formHorarios.trim()) {
            Alert.alert('Campos obligatorios', 'Nombre, dosis y horarios son necesarios.');
            return;
        }

        const horarios = formHorarios.split(',').map(h => h.trim()).filter(h => /^\d{1,2}:\d{2}$/.test(h));
        if (horarios.length === 0) {
            Alert.alert('Horario inválido', 'Escribe al menos un horario en formato HH:MM (ej: 09:00, 18:30)');
            return;
        }

        const newMed: Medicamento = {
            id: editingMed?.id || generateId(),
            nombre: formNombre.trim(),
            principioActivo: formPrincipio.trim(),
            dosis: formDosis.trim(),
            frecuencia: formFrecuencia.trim() || `${horarios.length} vez${horarios.length > 1 ? 'es' : ''} al día`,
            horarios,
            notas: formNotas.trim(),
            color: formColor,
            recordatorio: editingMed?.recordatorio ?? true,
        };

        let updated: Medicamento[];
        if (editingMed) {
            updated = medicamentos.map(m => m.id === editingMed.id ? newMed : m);
        } else {
            updated = [...medicamentos, newMed];
        }

        await saveMeds(updated);

        // Schedule reminders if enabled
        if (newMed.recordatorio) {
            for (const hora of horarios) {
                try {
                    await notificationService.programarRecordatorio(hora, `${newMed.nombre} ${newMed.dosis}`);
                } catch { }
            }
        }

        setShowModal(false);
        Alert.alert('✅ Guardado', editingMed ? 'Medicamento actualizado' : 'Medicamento añadido');
    };

    const handleDeleteMed = (med: Medicamento) => {
        Alert.alert(
            'Eliminar medicamento',
            `¿Seguro que quieres eliminar ${med.nombre}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const updated = medicamentos.filter(m => m.id !== med.id);
                        await saveMeds(updated);
                    },
                },
            ]
        );
    };

    const toggleReminder = async (med: Medicamento) => {
        const updated = medicamentos.map(m => {
            if (m.id === med.id) return { ...m, recordatorio: !m.recordatorio };
            return m;
        });
        await saveMeds(updated);

        if (!med.recordatorio) {
            // Turning ON
            for (const hora of med.horarios) {
                try { await notificationService.programarRecordatorio(hora, `${med.nombre} ${med.dosis}`); } catch { }
            }
        }
    };

    // ─── RENDER ───

    if (loading) {
        return (
            <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
                <Ionicons name="medical" size={48} color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando medicación…</Text>
            </View>
        );
    }

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            {/* ═══ HEADER ═══ */}
            <Animated.View style={[styles.header, { backgroundColor: colors.headerBg, opacity: headerAnim }]}>
                <View style={[styles.headerDeco1, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                <View style={[styles.headerDeco2, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
                <Text style={styles.headerEmoji}>💊</Text>
                <Text style={styles.headerTitle}>Medicación</Text>
                <Text style={styles.headerSubtitle}>Gestión de medicamentos de Carmen</Text>
            </Animated.View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* ═══ ADHERENCE CARD ═══ */}
                <View style={[styles.adherenceCard, { backgroundColor: colors.card }]}>
                    <View style={styles.adherenceTop}>
                        <View style={[styles.adherenceIconWrap, { backgroundColor: adherenceColor + '18' }]}>
                            <Ionicons name="shield-checkmark" size={24} color={adherenceColor} />
                        </View>
                        <View style={styles.adherenceInfo}>
                            <Text style={[styles.adherenceLabel, { color: colors.textSecondary }]}>Adherencia semanal</Text>
                            <Text style={[styles.adherenceValue, { color: colors.text }]}>
                                {adherencia.taken} <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '400' }}>de {adherencia.expected} tomas</Text>
                            </Text>
                        </View>
                        <View style={[styles.adherencePctCircle, { borderColor: adherenceColor }]}>
                            <Text style={[styles.adherencePctText, { color: adherenceColor }]}>{adherencia.pct}%</Text>
                        </View>
                    </View>
                    <View style={[styles.adherenceBarBg, { backgroundColor: isDark ? colors.surface : '#F0F0F0' }]}>
                        <Animated.View style={[styles.adherenceBarFill, { width: `${adherencia.pct}%` as any, backgroundColor: adherenceColor }]} />
                    </View>
                    <Text style={[styles.adherenceHint, { color: colors.textLight }]}>
                        {adherencia.pct >= 80 ? '✅ Excelente seguimiento de la medicación'
                            : adherencia.pct >= 60 ? '⚠️ Se pueden mejorar algunas tomas'
                                : adherencia.pct > 0 ? '🔴 Atención: adherencia baja' : 'Sin datos esta semana'}
                    </Text>
                </View>

                {/* ═══ TODAY'S TIMELINE ═══ */}
                <SectionHeader title="Hoy" icon="today" colors={colors} />
                <View style={[styles.timelineCard, { backgroundColor: colors.card }]}>
                    {todayTimeline.length > 0 ? todayTimeline.map((item, i) => {
                        const isPast = timeToMinutes(item.hora) < nowMinutes;
                        const isNext = !item.tomada && timeToMinutes(item.hora) >= nowMinutes &&
                            (i === 0 || todayTimeline[i - 1].tomada || timeToMinutes(todayTimeline[i - 1].hora) < nowMinutes);
                        return (
                            <View key={`${item.med.id}_${item.hora}_${i}`} style={styles.timelineRow}>
                                {/* Timeline dot + line */}
                                <View style={styles.timelineDotCol}>
                                    <View style={[
                                        styles.timelineDot,
                                        {
                                            backgroundColor: item.tomada ? colors.success : isNext ? item.med.color : isDark ? '#444' : '#DDD',
                                            borderColor: item.tomada ? colors.success : isNext ? item.med.color : 'transparent',
                                        },
                                    ]}>
                                        {item.tomada && <Ionicons name="checkmark" size={12} color="#fff" />}
                                        {isNext && <Ionicons name="time" size={12} color="#fff" />}
                                    </View>
                                    {i < todayTimeline.length - 1 && (
                                        <View style={[styles.timelineLine, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                                    )}
                                </View>
                                {/* Content */}
                                <View style={[
                                    styles.timelineContent,
                                    isNext && { backgroundColor: isDark ? item.med.color + '15' : item.med.color + '08', borderColor: item.med.color + '30', borderWidth: 1 },
                                ]}>
                                    <Text style={[styles.timelineHora, { color: item.tomada ? colors.textLight : colors.text }]}>{item.hora}</Text>
                                    <View style={styles.timelineMedInfo}>
                                        <Text style={[
                                            styles.timelineMedName,
                                            { color: item.tomada ? colors.textLight : colors.text },
                                            item.tomada && { textDecorationLine: 'line-through' },
                                        ]}>{item.med.nombre} {item.med.dosis}</Text>
                                        {item.tomada && <View style={[styles.timelineBadge, { backgroundColor: colors.success + '18' }]}>
                                            <Text style={[styles.timelineBadgeText, { color: colors.success }]}>✓ Tomada</Text>
                                        </View>}
                                        {isNext && <View style={[styles.timelineBadge, { backgroundColor: item.med.color + '18' }]}>
                                            <Text style={[styles.timelineBadgeText, { color: item.med.color }]}>⏳ Siguiente</Text>
                                        </View>}
                                        {!item.tomada && isPast && !isNext && <View style={[styles.timelineBadge, { backgroundColor: colors.danger + '18' }]}>
                                            <Text style={[styles.timelineBadgeText, { color: colors.danger }]}>⚠️ Sin registrar</Text>
                                        </View>}
                                    </View>
                                </View>
                            </View>
                        );
                    }) : (
                        <View style={styles.emptyState}>
                            <Text style={{ fontSize: 32 }}>📋</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay medicamentos programados</Text>
                        </View>
                    )}
                </View>

                {/* ═══ MEDICATIONS LIST ═══ */}
                <SectionHeader title="Medicamentos" icon="medical" colors={colors} count={medicamentos.length} />
                {medicamentos.map(med => {
                    const isExpanded = expandedMed === med.id;
                    const weekCount = weekEvents.filter(e => {
                        const desc = e.descripcion.toLowerCase();
                        return desc.includes(med.nombre.toLowerCase()) || desc.includes(med.dosis.toLowerCase());
                    }).length;
                    const expectedWeek = med.horarios.length * 7;
                    const medPct = expectedWeek > 0 ? Math.min(Math.round((weekCount / expectedWeek) * 100), 100) : 0;

                    return (
                        <TouchableOpacity
                            key={med.id}
                            style={[styles.medCard, { backgroundColor: colors.card, borderLeftColor: med.color }]}
                            onPress={() => setExpandedMed(isExpanded ? null : med.id)}
                            activeOpacity={0.7}
                        >
                            {/* Header Row */}
                            <View style={styles.medCardHeader}>
                                <View style={[styles.medIconWrap, { backgroundColor: med.color + '18' }]}>
                                    <Text style={{ fontSize: 22 }}>💊</Text>
                                </View>
                                <View style={styles.medCardInfo}>
                                    <Text style={[styles.medName, { color: colors.text }]}>{med.nombre}</Text>
                                    {med.principioActivo ? <Text style={[styles.medPrincipio, { color: colors.textSecondary }]}>{med.principioActivo}</Text> : null}
                                </View>
                                <View style={styles.medCardRight}>
                                    <View style={[styles.medDoseBadge, { backgroundColor: med.color + '15' }]}>
                                        <Text style={[styles.medDoseText, { color: med.color }]}>{med.dosis}</Text>
                                    </View>
                                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textLight} />
                                </View>
                            </View>

                            {/* Schedule Pills */}
                            <View style={styles.medScheduleRow}>
                                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                <Text style={[styles.medScheduleText, { color: colors.textSecondary }]}>
                                    {med.horarios.join(' · ')} — {med.frecuencia}
                                </Text>
                                {med.recordatorio && <Ionicons name="notifications" size={14} color={colors.primary} />}
                            </View>

                            {/* Adherence mini bar */}
                            <View style={styles.medBarRow}>
                                <View style={[styles.medBarBg, { backgroundColor: isDark ? colors.surface : '#F0F0F0' }]}>
                                    <View style={[styles.medBarFill, {
                                        width: `${medPct}%` as any,
                                        backgroundColor: medPct >= 80 ? colors.success : medPct >= 60 ? colors.warning : colors.danger,
                                    }]} />
                                </View>
                                <Text style={[styles.medBarLabel, { color: colors.textSecondary }]}>{medPct}%</Text>
                            </View>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <View style={[styles.medExpanded, { borderTopColor: colors.border }]}>
                                    {med.notas ? (
                                        <View style={[styles.medNotaRow, { backgroundColor: isDark ? colors.infoBg : '#FFF8E1' }]}>
                                            <Text style={{ fontSize: 14 }}>📝</Text>
                                            <Text style={[styles.medNotaText, { color: isDark ? colors.infoText : '#E65100' }]}>{med.notas}</Text>
                                        </View>
                                    ) : null}
                                    <View style={styles.medActions}>
                                        <View style={styles.medReminderToggle}>
                                            <Text style={[styles.medReminderLabel, { color: colors.textSecondary }]}>🔔 Recordatorio</Text>
                                            <Switch
                                                value={med.recordatorio}
                                                onValueChange={() => toggleReminder(med)}
                                                trackColor={{ false: isDark ? '#555' : '#DDD', true: colors.primary + '50' }}
                                                thumbColor={med.recordatorio ? colors.primary : isDark ? '#888' : '#f4f3f4'}
                                            />
                                        </View>
                                        <View style={styles.medActionBtns}>
                                            <TouchableOpacity
                                                style={[styles.medActionBtn, { backgroundColor: colors.primary + '14' }]}
                                                onPress={() => openEditModal(med)}
                                            >
                                                <Ionicons name="create-outline" size={16} color={colors.primary} />
                                                <Text style={[styles.medActionBtnText, { color: colors.primary }]}>Editar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.medActionBtn, { backgroundColor: colors.danger + '14' }]}
                                                onPress={() => handleDeleteMed(med)}
                                            >
                                                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                                <Text style={[styles.medActionBtnText, { color: colors.danger }]}>Eliminar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}

                {/* Add button */}
                <TouchableOpacity
                    style={[styles.addBtn, { borderColor: colors.primary }]}
                    onPress={openAddModal}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                    <Text style={[styles.addBtnText, { color: colors.primary }]}>Añadir medicamento</Text>
                </TouchableOpacity>

                {/* Info hint */}
                <View style={[styles.infoHint, { backgroundColor: isDark ? colors.infoBg : '#E8F5E9' }]}>
                    <Ionicons name="information-circle" size={18} color={isDark ? colors.infoText : '#2E7D32'} />
                    <Text style={[styles.infoHintText, { color: isDark ? colors.infoText : '#2E7D32' }]}>
                        Los registros de toma los realiza la cuidadora desde su panel. Aquí puedes gestionar los
                        medicamentos y horarios del paciente.
                    </Text>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>

            {/* ═══ ADD / EDIT MODAL ═══ */}
            <Modal visible={showModal} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingMed ? '✏️ Editar' : '➕ Nuevo'} Medicamento</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close-circle" size={28} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                            {/* Color picks */}
                            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Color</Text>
                            <View style={styles.colorRow}>
                                {FORM_COLORS.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.colorPick, { backgroundColor: c, borderWidth: formColor === c ? 3 : 0, borderColor: '#fff' }]}
                                        onPress={() => setFormColor(c)}
                                    >
                                        {formColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Nombre *</Text>
                            <TextInput
                                style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                value={formNombre}
                                onChangeText={setFormNombre}
                                placeholder="Ej: Sinemet"
                                placeholderTextColor={colors.textLight}
                            />

                            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Principio activo</Text>
                            <TextInput
                                style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                value={formPrincipio}
                                onChangeText={setFormPrincipio}
                                placeholder="Ej: Levodopa/Carbidopa"
                                placeholderTextColor={colors.textLight}
                            />

                            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Dosis *</Text>
                            <TextInput
                                style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                value={formDosis}
                                onChangeText={setFormDosis}
                                placeholder="Ej: 10 mg"
                                placeholderTextColor={colors.textLight}
                            />

                            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Frecuencia</Text>
                            <TextInput
                                style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                value={formFrecuencia}
                                onChangeText={setFormFrecuencia}
                                placeholder="Ej: 2 veces al día"
                                placeholderTextColor={colors.textLight}
                            />

                            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Horarios * (separados por coma)</Text>
                            <TextInput
                                style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                value={formHorarios}
                                onChangeText={setFormHorarios}
                                placeholder="Ej: 09:00, 18:30"
                                placeholderTextColor={colors.textLight}
                            />

                            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Notas</Text>
                            <TextInput
                                style={[styles.formInput, styles.formInputMulti, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                value={formNotas}
                                onChangeText={setFormNotas}
                                placeholder="Indicaciones especiales..."
                                placeholderTextColor={colors.textLight}
                                multiline
                                numberOfLines={3}
                            />

                            <View style={{ height: 12 }} />
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                                onPress={() => setShowModal(false)}
                            >
                                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                                onPress={handleSaveMed}
                            >
                                <Ionicons name="checkmark" size={18} color="#fff" />
                                <Text style={styles.modalSaveText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

// ─── FORM COLOR OPTIONS ───
const FORM_COLORS = ['#0277BD', '#2E7D32', '#6A1B9A', '#E65100', '#C62828', '#00695C', '#4527A0', '#AD1457'];

// ─── SUBCOMPONENTS ───

const SectionHeader = ({ title, icon, colors, count }: { title: string; icon: string; colors: any; count?: number }) => (
    <View style={styles.sectionRow}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {count !== undefined && (
            <View style={[styles.sectionCount, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.sectionCountText, { color: colors.primary }]}>{count}</Text>
            </View>
        )}
    </View>
);

// ─── STYLES ───

const styles = StyleSheet.create({
    root: { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, fontWeight: '500' },

    // Header
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 52,
        paddingBottom: SPACING.lg,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
        ...SHADOWS.medium,
    },
    headerDeco1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -40, right: -40 },
    headerDeco2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, bottom: -20, left: -30 },
    headerEmoji: { fontSize: 36, marginBottom: 4 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '500' },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },

    // Adherence
    adherenceCard: {
        borderRadius: 18,
        padding: 16,
        ...SHADOWS.small,
    },
    adherenceTop: { flexDirection: 'row', alignItems: 'center' },
    adherenceIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    adherenceInfo: { flex: 1 },
    adherenceLabel: { fontSize: 12, fontWeight: '600' },
    adherenceValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },
    adherencePctCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    adherencePctText: { fontSize: 16, fontWeight: '800' },
    adherenceBarBg: { height: 8, borderRadius: 4, marginTop: 14, overflow: 'hidden' },
    adherenceBarFill: { height: '100%' as any, borderRadius: 4 },
    adherenceHint: { fontSize: 12, marginTop: 8, fontWeight: '500' },

    // Section
    sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10, gap: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
    sectionCount: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    sectionCountText: { fontSize: 12, fontWeight: '700' },

    // Timeline
    timelineCard: { borderRadius: 18, padding: 14, ...SHADOWS.small },
    timelineRow: { flexDirection: 'row', minHeight: 56 },
    timelineDotCol: { width: 28, alignItems: 'center' },
    timelineDot: {
        width: 24, height: 24, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2,
    },
    timelineLine: { width: 2, flex: 1, marginVertical: 4 },
    timelineContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
        marginBottom: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    timelineHora: { fontSize: 14, fontWeight: '800', width: 50 },
    timelineMedInfo: { flex: 1 },
    timelineMedName: { fontSize: 14, fontWeight: '600' },
    timelineBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
    timelineBadgeText: { fontSize: 11, fontWeight: '700' },

    // Medication card
    medCard: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        ...SHADOWS.small,
    },
    medCardHeader: { flexDirection: 'row', alignItems: 'center' },
    medIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    medCardInfo: { flex: 1 },
    medName: { fontSize: 16, fontWeight: '700' },
    medPrincipio: { fontSize: 12, marginTop: 2 },
    medCardRight: { alignItems: 'flex-end', gap: 6 },
    medDoseBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    medDoseText: { fontSize: 12, fontWeight: '700' },
    medScheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingLeft: 54 },
    medScheduleText: { fontSize: 13, fontWeight: '500', flex: 1 },
    medBarRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingLeft: 54, gap: 8 },
    medBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    medBarFill: { height: '100%' as any, borderRadius: 3 },
    medBarLabel: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

    // Expanded
    medExpanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    medNotaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, marginBottom: 12 },
    medNotaText: { fontSize: 13, fontWeight: '500', flex: 1 },
    medActions: {},
    medReminderToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    medReminderLabel: { fontSize: 14, fontWeight: '600' },
    medActionBtns: { flexDirection: 'row', gap: 10 },
    medActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    medActionBtnText: { fontSize: 13, fontWeight: '700' },

    // Add button
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        marginTop: 4,
    },
    addBtnText: { fontSize: 15, fontWeight: '700' },

    // Info
    infoHint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        padding: 14,
        borderRadius: 14,
        marginTop: 16,
    },
    infoHintText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

    // Empty
    emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: { fontSize: 14, fontWeight: '500' },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', ...SHADOWS.large },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingBottom: SPACING.md },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    modalScroll: { paddingHorizontal: SPACING.lg },
    formLabel: { fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    formInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },
    formInputMulti: { minHeight: 80, textAlignVertical: 'top' },
    colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
    colorPick: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    modalActions: { flexDirection: 'row', padding: SPACING.lg, gap: 12 },
    modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
    modalCancelText: { fontSize: 15, fontWeight: '700' },
    modalSaveBtn: { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
    modalSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default MedicacionScreen;
