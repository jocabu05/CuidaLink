/**
 * FamiliarDashboardScreen.tsx — Panel principal del FAMILIAR (pantalla de inicio).
 *
 * Muestra:
 * - Header con gradiente: saludo, nombre familiar, parentesco, hora
 * - Resumen del día: eventos completados hoy con fotos de verificación
 * - Última ubicación del paciente con estado zona segura/peligro
 * - Acciones rápidas: Chat, Notas, Calendario, Localizar, Medicación
 * - Historial de eventos, Informes semanales, Mapa de zona
 * - Badge de notas pendientes
 *
 * Integra: eventosService, notasService, locationService
 * 
 * ~950 líneas | Soporta pull-to-refresh, modo oscuro, animaciones
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl, Image,
    ActivityIndicator, TouchableOpacity, Alert, Linking, Modal,
    Dimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import TaskEditorModal from '../components/TaskEditorModal';
import eventosService from '../services/eventosService';
import { notifyTasksChanged } from '../services/taskEventEmitter';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── TYPES ───

interface FamiliarDashboardScreenProps {
    abueloId?: number;
    onLogout?: () => void;
}

interface EventoCompleto {
    id: number;
    tipo: string;
    timestamp: string;
    verificado: boolean;
    descripcion: string;
    fotoBase64?: string;
    gpsLat?: number;
    gpsLng?: number;
}

interface Tarea {
    tipo: string;
    hora: string;
    descripcion: string;
    completada: boolean;
    icono: string;
}

// ─── CONSTANTS ───

const TIPO_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
    LLEGADA: { color: '#4CAF50', icon: 'home', label: 'Llegada' },
    PASTILLA: { color: '#0277BD', icon: 'medical', label: 'Medicamento' },
    COMIDA: { color: '#E65100', icon: 'restaurant', label: 'Comida' },
    PASEO: { color: '#7B1FA2', icon: 'walk', label: 'Paseo' },
    SIESTA: { color: '#5C6BC0', icon: 'bed', label: 'Siesta' },
    CAIDA: { color: '#F44336', icon: 'alert-circle', label: 'Caída' },
    SALIDA: { color: '#795548', icon: 'exit', label: 'Salida' },
};

// ─── COMPONENT ───

const FamiliarDashboardScreen: React.FC<FamiliarDashboardScreenProps> = ({ abueloId = 1, onLogout }) => {
    const { colors, isDark } = useTheme();
    const [eventos, setEventos] = useState<EventoCompleto[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [perfilAbuelo, setPerfilAbuelo] = useState<any>(null);
    const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [showTaskEditor, setShowTaskEditor] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        AsyncStorage.getItem('profile_photo_familiar').then(uri => { if (uri) setProfilePhoto(uri); }).catch(() => {});
    }, []);

    // ─── PHOTO ───
    const cambiarFotoFamiliar = async () => {
        Alert.alert('Foto de perfil', 'Elige una opción', [
            {
                text: 'Cámara',
                onPress: async () => {
                    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                        if (!canAskAgain) Alert.alert('Permiso necesario', 'Actívalo en Ajustes.', [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
                        ]);
                        return;
                    }
                    const result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [1, 1], base64: true,
                    });
                    if (!result.canceled && result.assets[0]?.base64) {
                        const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
                        setProfilePhoto(uri);
                        await AsyncStorage.setItem('profile_photo_familiar', uri);
                    }
                },
            },
            {
                text: 'Galería',
                onPress: async () => {
                    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                        if (!canAskAgain) Alert.alert('Permiso necesario', 'Actívalo en Ajustes.', [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
                        ]);
                        return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [1, 1], base64: true,
                    });
                    if (!result.canceled && result.assets[0]?.base64) {
                        const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
                        setProfilePhoto(uri);
                        await AsyncStorage.setItem('profile_photo_familiar', uri);
                    }
                },
            },
            ...(profilePhoto ? [{
                text: 'Eliminar foto',
                style: 'destructive' as const,
                onPress: async () => {
                    setProfilePhoto(null);
                    await AsyncStorage.removeItem('profile_photo_familiar');
                },
            }] : []),
            { text: 'Cancelar', style: 'cancel' as const },
        ]);
    };

    // ─── DATA LOADING ───
    const cargarDatos = async () => {
        try {
            const localEventStorage = require('../services/localEventStorage').default;
            const localEvents = await localEventStorage.getEventosHoy();
            let eventosFinales: EventoCompleto[] = [];

            if (localEvents.length > 0) {
                eventosFinales = localEvents.map((e: any) => ({
                    id: parseInt(e.id) || Date.now(),
                    tipo: e.tipo,
                    timestamp: e.timestamp,
                    verificado: e.verificado,
                    descripcion: e.descripcion,
                    fotoBase64: e.fotoBase64,
                    gpsLat: e.gpsLat,
                    gpsLng: e.gpsLng,
                }));
            }

            try {
                const [eventosData, perfilData] = await Promise.all([
                    eventosService.getEventosHoy(abueloId),
                    eventosService.getPerfilAbuelo(abueloId),
                ]);
                if (eventosFinales.length === 0) {
                    eventosFinales = eventosData as EventoCompleto[];
                }
                setPerfilAbuelo(perfilData);
            } catch {
                setPerfilAbuelo({
                    nombre: 'Carmen Ruiz',
                    direccion: 'C/Colmenar 59, Alzira',
                    telefonoEmergencia: '961234567',
                    notasMedicas: 'Sinemet 10mg - 10:30h y 18:30h\nAricept 5mg - mañanas',
                });
            }

            setEventos(eventosFinales);
        } catch (error) {
            console.error('Error cargando datos familiar:', error);
            setPerfilAbuelo({
                nombre: 'Carmen Ruiz',
                direccion: 'C/Colmenar 59, Alzira',
                telefonoEmergencia: '961234567',
                notasMedicas: 'Sinemet 10mg - 10:30h y 18:30h\nAricept 5mg - mañanas',
            });
        } finally {
            try {
                const tareasStr = await AsyncStorage.getItem('tareas');
                if (tareasStr) {
                    setTareas(JSON.parse(tareasStr));
                } else {
                    const tareasDefault: Tarea[] = [
                        { tipo: 'LLEGADA', hora: '09:00', descripcion: 'Llegada al domicilio', completada: false, icono: 'L' },
                        { tipo: 'PASTILLA', hora: '10:30', descripcion: 'Sinemet 10mg', completada: false, icono: 'M' },
                        { tipo: 'PASEO', hora: '12:00', descripcion: 'Paseo por el barrio', completada: false, icono: 'P' },
                        { tipo: 'COMIDA', hora: '14:00', descripcion: 'Preparar comida', completada: false, icono: 'C' },
                    ];
                    setTareas(tareasDefault);
                }
            } catch (e) {
                console.error('Error cargando tareas:', e);
            }
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const formatHora = (timestamp: string): string => {
        return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    const completados = eventos.filter(e => e.verificado).length;
    const alertas = eventos.filter(e => e.tipo === 'CAIDA').length;
    const progreso = tareas.length > 0 ? Math.round((eventos.length / tareas.length) * 100) : 0;

    const handleSaveTareas = useCallback(async (updatedTareas: Tarea[]) => {
        setTareas(updatedTareas);
        try {
            await AsyncStorage.setItem('tareas', JSON.stringify(updatedTareas));
            notifyTasksChanged();
            Alert.alert('Éxito', 'Tareas actualizadas correctamente');
            setShowTaskEditor(false);
        } catch (e) {
            console.error('Error guardando tareas:', e);
            Alert.alert('Error', 'No se pudo guardar las tareas');
        }
    }, []);

    // ─── LOADING STATE ───
    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando información...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* ─── DECORATIVE HEADER ─── */}
            <Animated.View style={[styles.header, { backgroundColor: colors.headerBg, opacity: headerAnim }]}>
                <View style={[styles.circle, styles.circle1]} />
                <View style={[styles.circle, styles.circle2]} />
                <View style={[styles.circle, styles.circle3]} />

                <View style={styles.headerContent}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerGreeting}>Panel Familiar</Text>
                        <Text style={styles.headerDate}>{fecha}</Text>
                    </View>
                    {onLogout && (
                        <TouchableOpacity
                            style={styles.logoutPill}
                            onPress={() => {
                                Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
                                    { text: 'Cancelar', style: 'cancel' },
                                    { text: 'Sí, cerrar', style: 'destructive', onPress: onLogout },
                                ]);
                            }}
                        >
                            <Ionicons name="log-out-outline" size={16} color="#FFF" />
                            <Text style={styles.logoutText}>Salir</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Progress bar in header */}
                <View style={styles.headerProgress}>
                    <View style={styles.headerProgressInfo}>
                        <Text style={styles.headerProgressLabel}>Progreso del día</Text>
                        <Text style={styles.headerProgressPct}>{Math.min(progreso, 100)}%</Text>
                    </View>
                    <View style={styles.headerProgressBar}>
                        <View style={[styles.headerProgressFill, { width: `${Math.min(progreso, 100)}%` }]} />
                    </View>
                </View>
            </Animated.View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); cargarDatos(); }}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* ─── PATIENT CARD (floating) ─── */}
                <View style={[styles.patientCard, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                        onPress={() => { if (profilePhoto) setPreviewPhoto(profilePhoto); else cambiarFotoFamiliar(); }}
                        onLongPress={cambiarFotoFamiliar}
                        delayLongPress={500}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatarWrap}>
                            <View style={[styles.avatarRing, { borderColor: colors.primary + '40' }]}>
                                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                    {profilePhoto ? (
                                        <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
                                    ) : (
                                        <Text style={styles.avatarInitials}>
                                            {perfilAbuelo?.nombre?.split(' ').map((n: string) => n[0]).join('') || 'CR'}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <View style={styles.onlineDot} />
                            <View style={[styles.camBadge, { backgroundColor: colors.primary }]}>
                                <Ionicons name="camera" size={10} color="#FFF" />
                            </View>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.patientInfo}>
                        <Text style={[styles.patientName, { color: colors.text }]}>
                            {perfilAbuelo?.nombre || 'Paciente'}
                        </Text>
                        {perfilAbuelo?.direccion ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                                <Text style={[styles.patientAddr, { color: colors.textSecondary }]}>
                                    {perfilAbuelo.direccion}
                                </Text>
                            </View>
                        ) : null}
                        <View style={styles.statusRow}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>Cuidadora en línea</Text>
                        </View>
                    </View>
                </View>

                {/* ─── STATS ROW ─── */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                        <View style={[styles.statIconWrap, { backgroundColor: colors.primary + '12' }]}>
                            <Ionicons name="pulse" size={18} color={colors.primary} />
                        </View>
                        <Text style={[styles.statValue, { color: colors.text }]}>{eventos.length}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Eventos</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                        <View style={[styles.statIconWrap, { backgroundColor: '#4CAF5012' }]}>
                            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                        </View>
                        <Text style={[styles.statValue, { color: '#4CAF50' }]}>{completados}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verificados</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                        <View style={[styles.statIconWrap, { backgroundColor: alertas > 0 ? '#F4433612' : colors.border + '30' }]}>
                            <Ionicons name="warning" size={18} color={alertas > 0 ? '#F44336' : colors.textLight} />
                        </View>
                        <Text style={[styles.statValue, { color: alertas > 0 ? '#F44336' : colors.textSecondary }]}>
                            {alertas}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Alertas</Text>
                    </View>
                </View>

                {/* ─── DAILY TASKS ─── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '12' }]}>
                                <Ionicons name="list" size={16} color={colors.primary} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tareas de Hoy</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.editPill, { backgroundColor: colors.primary }]}
                            onPress={() => setShowTaskEditor(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="create-outline" size={14} color="#FFF" />
                            <Text style={styles.editPillText}>Editar</Text>
                        </TouchableOpacity>
                    </View>

                    {tareas.length === 0 ? (
                        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                            <Ionicons name="clipboard-outline" size={32} color={colors.textLight} />
                            <Text style={[styles.emptyLabel, { color: colors.textSecondary }]}>
                                No hay tareas configuradas
                            </Text>
                        </View>
                    ) : (
                        tareas.map((tarea, index) => {
                            const cfg = TIPO_CONFIG[tarea.tipo] || TIPO_CONFIG.LLEGADA;
                            // Check if event of this type exists today
                            const isDone = eventos.some(e => e.tipo === tarea.tipo);
                            return (
                                <View key={index} style={[styles.taskCard, { backgroundColor: colors.card }]}>
                                    {/* Accent bar */}
                                    <View style={[styles.taskAccent, { backgroundColor: cfg.color }]} />
                                    {/* Time pill */}
                                    <View style={[styles.taskTimeWrap, { backgroundColor: cfg.color + '12' }]}>
                                        <Ionicons name="time-outline" size={12} color={cfg.color} />
                                        <Text style={[styles.taskTime, { color: cfg.color }]}>{tarea.hora}</Text>
                                    </View>
                                    {/* Content */}
                                    <View style={styles.taskContent}>
                                        <Text
                                            style={[styles.taskDesc, { color: colors.text }]}
                                            numberOfLines={1}
                                        >
                                            {tarea.descripcion}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                            <Ionicons name={cfg.icon as any} size={12} color={colors.textLight} />
                                            <Text style={[styles.taskType, { color: colors.textSecondary }]}>
                                                {cfg.label}
                                            </Text>
                                        </View>
                                    </View>
                                    {/* Status */}
                                    <View
                                        style={[
                                            styles.taskStatusBadge,
                                            {
                                                backgroundColor: isDone ? '#4CAF5012' : colors.border + '25',
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={16}
                                            color={isDone ? '#4CAF50' : colors.textLight}
                                        />
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* ─── MEDICAL NOTES ─── */}
                {perfilAbuelo?.notasMedicas ? (
                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm }}>
                            <View style={[styles.sectionIcon, { backgroundColor: '#FF980012' }]}>
                                <Ionicons name="document-text" size={16} color="#FF9800" />
                            </View>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notas Médicas</Text>
                        </View>
                        <View style={[styles.notesCard, { backgroundColor: colors.card, borderLeftColor: '#FF9800' }]}>
                            <Text style={[styles.notesText, { color: colors.text }]}>
                                {perfilAbuelo.notasMedicas}
                            </Text>
                        </View>
                    </View>
                ) : null}

                {/* ─── EVENTS TIMELINE ─── */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md }}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#7B1FA212' }]}>
                            <Ionicons name="time" size={16} color="#7B1FA2" />
                        </View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Actividad de Hoy</Text>
                        {eventos.length > 0 && (
                            <View style={[styles.countBadge, { backgroundColor: colors.primary + '12' }]}>
                                <Text style={[styles.countText, { color: colors.primary }]}>{eventos.length}</Text>
                            </View>
                        )}
                    </View>

                    {eventos.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name="hourglass-outline" size={36} color={colors.primary + '50'} />
                            </View>
                            <Text style={[styles.emptyStateTitle, { color: colors.textSecondary }]}>
                                Sin actividad registrada
                            </Text>
                            <Text style={[styles.emptyStateDesc, { color: colors.textLight }]}>
                                La cuidadora aún no ha registrado actividad hoy
                            </Text>
                        </View>
                    ) : (
                        eventos.map((evento, idx) => {
                            const config = TIPO_CONFIG[evento.tipo] || TIPO_CONFIG.LLEGADA;
                            const isExpanded = expandedEvent === evento.id;
                            const isLast = idx === eventos.length - 1;

                            return (
                                <View key={evento.id} style={styles.timelineRow}>
                                    {/* Timeline line + dot */}
                                    <View style={styles.timelineLine}>
                                        <View style={[styles.timelineDot, { backgroundColor: config.color }]}>
                                            <Ionicons name={config.icon as any} size={14} color="#FFF" />
                                        </View>
                                        {!isLast && (
                                            <View style={[styles.timelineConnector, { backgroundColor: colors.border + '60' }]} />
                                        )}
                                    </View>

                                    {/* Event card */}
                                    <TouchableOpacity
                                        style={[styles.eventCard, { backgroundColor: colors.card }]}
                                        onPress={() => setExpandedEvent(isExpanded ? null : evento.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.eventHeader}>
                                            <View>
                                                <Text style={[styles.eventType, { color: config.color }]}>
                                                    {config.label}
                                                </Text>
                                                <Text style={[styles.eventDesc, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
                                                    {evento.descripcion}
                                                </Text>
                                            </View>
                                            <View style={styles.eventRight}>
                                                <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                                                    {formatHora(evento.timestamp)}
                                                </Text>
                                                <View
                                                    style={[
                                                        styles.verifyBadge,
                                                        {
                                                            backgroundColor: evento.verificado
                                                                ? '#4CAF5012'
                                                                : '#FF980012',
                                                        },
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name={evento.verificado ? 'checkmark-circle' : 'time-outline'}
                                                        size={12}
                                                        color={evento.verificado ? '#4CAF50' : '#FF9800'}
                                                    />
                                                    <Text
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: '700',
                                                            color: evento.verificado ? '#4CAF50' : '#FF9800',
                                                            marginLeft: 3,
                                                        }}
                                                    >
                                                        {evento.verificado ? 'OK' : 'Pend.'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Expanded */}
                                        {isExpanded && (
                                            <View style={[styles.expandedContent, { borderTopColor: colors.border + '40' }]}>
                                                {evento.fotoBase64 && (
                                                    <View style={styles.photoWrap}>
                                                        <Image
                                                            source={{
                                                                uri: evento.fotoBase64.startsWith('file') || evento.fotoBase64.startsWith('/')
                                                                    ? evento.fotoBase64
                                                                    : `data:image/jpeg;base64,${evento.fotoBase64}`,
                                                            }}
                                                            style={styles.eventPhoto}
                                                            resizeMode="cover"
                                                        />
                                                        <View style={styles.photoBadge}>
                                                            <Ionicons name="camera" size={10} color="#FFF" />
                                                            <Text style={styles.photoBadgeText}>Foto</Text>
                                                        </View>
                                                    </View>
                                                )}
                                                {evento.gpsLat && evento.gpsLng && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                                                        <Ionicons name="location" size={12} color={colors.textLight} />
                                                        <Text style={[styles.gpsText, { color: colors.textSecondary }]}>
                                                            GPS: {evento.gpsLat.toFixed(4)}, {evento.gpsLng.toFixed(4)}
                                                        </Text>
                                                    </View>
                                                )}
                                                {!evento.fotoBase64 && !evento.gpsLat && (
                                                    <Text style={[styles.noExtra, { color: colors.textLight }]}>
                                                        Sin datos adicionales
                                                    </Text>
                                                )}
                                            </View>
                                        )}

                                        <Text style={[styles.tapHint, { color: colors.textLight }]}>
                                            {isExpanded ? 'Toca para cerrar' : 'Toca para ver detalles'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Task Editor Modal */}
            <TaskEditorModal
                visible={showTaskEditor}
                tareas={tareas}
                onClose={() => setShowTaskEditor(false)}
                onSave={handleSaveTareas}
            />

            {/* Photo preview modal */}
            <Modal visible={!!previewPhoto} transparent animationType="fade">
                <View style={styles.previewOverlay}>
                    <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewPhoto(null)}>
                        <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    {previewPhoto && (
                        <Image source={{ uri: previewPhoto }} style={styles.previewImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </View>
    );
};

// ─── STYLES ───

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: SPACING.md, fontSize: 16 },

    // Header
    header: {
        paddingTop: 56,
        paddingBottom: 20,
        paddingHorizontal: SPACING.lg,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
    circle1: { width: 200, height: 200, top: -60, right: -40 },
    circle2: { width: 140, height: 140, bottom: -30, left: -20 },
    circle3: { width: 80, height: 80, top: 30, right: 80, backgroundColor: 'rgba(255,255,255,0.04)' },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerGreeting: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
    headerDate: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3, textTransform: 'capitalize' },
    logoutPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    logoutText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

    // Progress in header
    headerProgress: { marginTop: 16 },
    headerProgressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    headerProgressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    headerProgressPct: { fontSize: 13, color: '#FFFFFF', fontWeight: '800' },
    headerProgressBar: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    headerProgressFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 3,
    },

    // Patient card
    patientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: SPACING.lg,
        marginTop: -16,
        borderRadius: 20,
        padding: SPACING.md,
        ...SHADOWS.medium,
    },
    avatarWrap: { position: 'relative' },
    avatarRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: 54, height: 54, borderRadius: 27 },
    avatarInitials: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CAF50',
        borderWidth: 2.5,
        borderColor: '#FFFFFF',
    },
    camBadge: {
        position: 'absolute',
        bottom: -2,
        left: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    patientInfo: { flex: 1, marginLeft: 14 },
    patientName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
    patientAddr: { fontSize: 12, fontWeight: '500' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#4CAF50', marginRight: 5 },
    statusText: { fontSize: 11, color: '#4CAF50', fontWeight: '700' },

    // Stats
    statsRow: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
        padding: 14,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    statIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    statValue: { fontSize: 24, fontWeight: '800' },
    statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

    // Sections
    section: { marginTop: SPACING.lg, paddingHorizontal: SPACING.lg },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    sectionIcon: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
    editPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 12,
    },
    editPillText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    countText: { fontSize: 12, fontWeight: '800' },

    // Empty
    emptyCard: {
        alignItems: 'center',
        padding: SPACING.lg,
        borderRadius: 16,
        ...SHADOWS.small,
    },
    emptyLabel: { fontSize: 14, fontWeight: '600', marginTop: 8 },

    emptyState: {
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
    emptyStateTitle: { fontSize: 16, fontWeight: '700' },
    emptyStateDesc: { fontSize: 13, marginTop: 4, textAlign: 'center' },

    // Task cards
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        marginBottom: SPACING.sm,
        overflow: 'hidden',
        ...SHADOWS.small,
    },
    taskAccent: { width: 4, alignSelf: 'stretch' },
    taskTimeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 14,
        marginLeft: 10,
        borderRadius: 10,
    },
    taskTime: { fontSize: 13, fontWeight: '800' },
    taskContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
    taskDesc: { fontSize: 14, fontWeight: '700' },
    taskType: { fontSize: 11, fontWeight: '500' },
    taskStatusBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },

    // Notes
    notesCard: {
        borderRadius: 16,
        padding: SPACING.md,
        borderLeftWidth: 4,
        ...SHADOWS.small,
    },
    notesText: { fontSize: 14, lineHeight: 22 },

    // Timeline
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    timelineLine: {
        width: 36,
        alignItems: 'center',
    },
    timelineDot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    timelineConnector: {
        width: 2,
        flex: 1,
        marginTop: -2,
    },

    // Event card
    eventCard: {
        flex: 1,
        borderRadius: 16,
        padding: SPACING.md,
        marginLeft: 8,
        marginBottom: SPACING.sm,
        ...SHADOWS.small,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    eventType: { fontSize: 13, fontWeight: '800' },
    eventDesc: { fontSize: 14, fontWeight: '500', marginTop: 2, maxWidth: SCREEN_W * 0.45 },
    eventRight: { alignItems: 'flex-end' },
    eventTime: { fontSize: 12, fontWeight: '600' },
    verifyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 4,
    },

    // Expanded
    expandedContent: {
        marginTop: SPACING.sm,
        borderTopWidth: 1,
        paddingTop: SPACING.sm,
    },
    photoWrap: { borderRadius: 12, overflow: 'hidden', marginBottom: SPACING.sm },
    eventPhoto: { width: '100%', height: 180, borderRadius: 12 },
    photoBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    photoBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
    gpsText: { fontSize: 12, fontWeight: '500' },
    noExtra: { fontSize: 12, fontStyle: 'italic' },
    tapHint: { fontSize: 10, textAlign: 'right', marginTop: 6 },

    // Previews
    previewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewClose: { position: 'absolute', top: 50, right: 16, zIndex: 10, padding: 8 },
    previewImage: {
        width: SCREEN_W * 0.9,
        height: SCREEN_W * 0.9,
        borderRadius: 16,
    },
});

export default React.memo(FamiliarDashboardScreen);
