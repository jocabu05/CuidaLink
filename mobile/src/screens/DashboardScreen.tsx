/**
 * DashboardScreen.tsx — Panel principal de la CUIDADORA (pantalla de inicio).
 *
 * Muestra:
 * - Header con gradiente: saludo, nombre paciente, fecha, modo oscuro
 * - Barra de progreso circular con % de tareas completadas
 * - Grid de tareas del día (Llegada, Pastilla, Paseo, Comida, Siesta, Valorar)
 *   Cada tarea es un TaskCard con emoji, estado completada/pendiente y acción
 * - Widget wearable: pasos, frecuencia cardíaca, sueño
 * - Acceso rápido a: Chat, Perfil paciente, Calendario
 * - Botón de asistente de voz (TTS: lee tareas pendientes)
 *
 * Integra: eventosService, voiceService, wearableService, localEventStorage,
 *          notasService, tareasService, fallDetectionService
 *
 * ~960 líneas | Soporta pull-to-refresh, modo oscuro, animaciones
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
    ScrollView,
    RefreshControl,
    Alert,
    TouchableOpacity,
    Animated,
    Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, CUIDADORA } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import BigButton from '../components/BigButton';
import eventosService from '../services/eventosService';
import authService, { User } from '../services/authService';
import fallDetectionService from '../services/fallDetectionService';
import locationService from '../services/locationService';
import notificationService from '../services/notificationService';
import notasService, { Nota } from '../services/notasService';
import reminderService from '../services/reminderService';
import weeklyReportService from '../services/weeklyReportService';
import tareasService from '../services/tareasService';
import { onTasksChanged, onEventCreated } from '../services/taskEventEmitter';

interface DashboardScreenProps {
    onNavigate: (screen: string, params?: any) => void;
    onLogout: () => void;
}

interface Tarea {
    tipo: string;
    hora: string;
    descripcion: string;
    completada: boolean;
    icono: string;
}

const TASK_COLORS: Record<string, { bg: string; text: string; label: string; emoji: string; darkBg: string }> = {
    LLEGADA: { bg: '#E8F5E9', text: '#2E7D32', label: 'Llegada', emoji: '🏠', darkBg: '#1B3A1E' },
    PASTILLA: { bg: '#E3F2FD', text: '#0277BD', label: 'Medicamento', emoji: '💊', darkBg: '#1A2B3E' },
    PASEO: { bg: '#FFF3E0', text: '#E65100', label: 'Paseo', emoji: '🚶', darkBg: '#3E2A1A' },
    COMIDA: { bg: '#F3E5F5', text: '#6A1B9A', label: 'Comida', emoji: '🍽️', darkBg: '#2A1A3E' },
    SIESTA: { bg: '#EDE7F6', text: '#4527A0', label: 'Siesta', emoji: '😴', darkBg: '#1A1A3E' },
};

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate, onLogout }) => {
    const { colors, isDark } = useTheme();
    const [user, setUser] = useState<User | null>(null);
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [abueloActual] = useState({ id: 1, nombre: 'Carmen Ruiz' });
    const [porcentaje, setPorcentaje] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [notasPendientes, setNotasPendientes] = useState<Nota[]>([]);
    const [verTodasNotas, setVerTodasNotas] = useState(false);
    const confettiAnims = useRef(
        Array.from({ length: 20 }, () => ({
            x: Math.random() * 350,
            anim: new Animated.Value(0),
            color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A06CD5', '#2196F3', '#FF8F00'][Math.floor(Math.random() * 6)],
            size: 8 + Math.random() * 12,
        }))
    ).current;

    const loadData = useCallback(async () => {
        try {
            const userData = await authService.getCurrentUser();
            setUser(userData);
        } catch { }

        // Load pending notes from Familiar (independent of auth)
        try {
            const notas = await notasService.getNotasPendientes();
            console.log('📝 Notas pendientes cargadas:', notas.length, notas.map(n => n.texto));
            setNotasPendientes(notas);
        } catch (e) {
            console.error('Error cargando notas:', e);
        }

        // Fixed task list for the day
        const tareasBase: Tarea[] = [
            { tipo: 'LLEGADA', hora: '09:00', descripcion: 'Llegada al domicilio', completada: false, icono: 'L' },
            { tipo: 'PASTILLA', hora: '10:30', descripcion: 'Sinemet 10mg', completada: false, icono: 'M' },
            { tipo: 'PASEO', hora: '12:00', descripcion: 'Paseo por el barrio', completada: false, icono: 'P' },
            { tipo: 'COMIDA', hora: '14:00', descripcion: 'Preparar comida', completada: false, icono: 'C' },
            { tipo: 'SIESTA', hora: '15:30', descripcion: 'Siesta después de comer', completada: false, icono: 'S' },
        ];

        // Cross-reference with local events to mark as completed
        try {
            const localEventStorage = require('../services/localEventStorage').default;
            const eventosHoy = await localEventStorage.getEventosHoy();
            const tiposCompletados = new Set(eventosHoy.map((e: any) => e.tipo));

            tareasBase.forEach(t => {
                if (tiposCompletados.has(t.tipo)) {
                    t.completada = true;
                }
            });

            const completadasCount = tareasBase.filter(t => t.completada).length;
            setPorcentaje(Math.round((completadasCount / tareasBase.length) * 100));
        } catch (e) {
            console.error('Error leyendo eventos locales:', e);
            setPorcentaje(0);
        }

        setTareas(tareasBase);
        setLoading(false);
        setRefreshing(false);


    }, []);

    useEffect(() => {
        loadData();
        // Schedule medication reminders
        reminderService.init().then(() => {
            reminderService.scheduleMedicationReminders();
        });
        // Schedule weekly report notification
        weeklyReportService.scheduleWeeklyNotification();
        fallDetectionService.startMonitoring(async () => {
            Alert.alert(
                'Posible Caída Detectada',
                '¿Necesitas ayuda de emergencia?',
                [
                    { text: 'Estoy bien', style: 'cancel' },
                    {
                        text: 'SOS 112',
                        style: 'destructive',
                        onPress: async () => {
                            const location = await locationService.getCurrentLocation();
                            await eventosService.reportarCaida(abueloActual.id, location?.lat, location?.lng);
                            Alert.alert('Emergencia enviada', 'Se ha notificado a la familia');
                        },
                    },
                ]
            );
        });
        return () => { fallDetectionService.stopMonitoring(); };
    }, [loadData]);

    // Reload notes periodically
    useEffect(() => {
        const reloadNotes = async () => {
            const notas = await notasService.getNotasPendientes();
            setNotasPendientes(notas);
        };

        const interval = setInterval(reloadNotes, 3000); // Reload every 3 seconds
        return () => clearInterval(interval);
    }, []);

    // Listen for task changes from FamiliarDashboardScreen
    useEffect(() => {
        const reloadTareasAndEvents = async () => {
            try {
                const tareasStr = await AsyncStorage.getItem('tareas');
                let updatedTareas = tareasStr ? JSON.parse(tareasStr) as Tarea[] : tareas;

                // Mark tasks as completed based on events
                try {
                    const localEventStorage = require('../services/localEventStorage').default;
                    const eventosHoy = await localEventStorage.getEventosHoy();
                    const tiposCompletados = new Set(eventosHoy.map((e: any) => e.tipo));

                    updatedTareas.forEach(t => {
                        t.completada = tiposCompletados.has(t.tipo);
                    });

                    const completadasCount = updatedTareas.filter(t => t.completada).length;
                    setPorcentaje(Math.round((completadasCount / updatedTareas.length) * 100));
                } catch (e) {
                    console.error('Error leyendo eventos locales:', e);
                }

                setTareas(updatedTareas);
            } catch (e) {
                console.error('Error reloading tareas:', e);
            }
        };

        const unsubscribe = onTasksChanged(reloadTareasAndEvents);

        // Also check every 2 seconds for changes (fallback method)
        const intervalId = setInterval(reloadTareasAndEvents, 2000);

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
    }, [tareas]);

    const handleTaskPress = useCallback((tarea: Tarea) => {
        const routes: Record<string, () => void> = {
            LLEGADA: () => onNavigate('Checkin', { abueloId: abueloActual.id, abueloNombre: abueloActual.nombre }),
            PASTILLA: () => onNavigate('Pastilla', { abueloId: abueloActual.id, medicamento: tarea.descripcion }),
            PASEO: () => onNavigate('Paseo', { abueloId: abueloActual.id }),
            COMIDA: () => onNavigate('Comida', { abueloId: abueloActual.id }),
            SIESTA: () => onNavigate('Siesta', { abueloId: abueloActual.id }),
        };
        routes[tarea.tipo]?.();
    }, [onNavigate, abueloActual]);

    const handleChangeProfilePhoto = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                const photo = result.assets[0];
                const base64 = await convertImageToBase64(photo.uri);

                if (user) {
                    const updatedUser = { ...user, fotoPerfil: base64 };
                    setUser(updatedUser);

                    try {
                        // Intentar guardar en API
                        await authService.updateProfilePhoto(base64);
                        Alert.alert('Éxito', 'Foto de perfil actualizada');
                    } catch (apiError) {
                        // Si falla la API, al menos guardar en AsyncStorage
                        try {
                            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                            Alert.alert('Éxito', 'Foto guardada localmente (sincronizará en línea)');
                        } catch (e) {
                            console.error('Error guardando foto:', e);
                            Alert.alert('Error', 'No se pudo guardar la foto');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error seleccionando foto:', error);
            Alert.alert('Error', 'No se pudo seleccionar la foto');
        }
    }, [user]);

    const convertImageToBase64 = async (uri: string): Promise<string> => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting to base64:', error);
            throw error;
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);



    const buildSummaryText = useCallback(() => {
        const pendientes = tareas.filter(t => !t.completada);
        const completadasList = tareas.filter(t => t.completada);
        let text = '';
        if (completadasList.length > 0) {
            text += `Llevas ${completadasList.length} tarea${completadasList.length > 1 ? 's' : ''} completada${completadasList.length > 1 ? 's' : ''}.\n`;
        }
        if (pendientes.length === 0) {
            text += '¡Enhorabuena! Has completado todas las tareas de hoy.';
        } else {
            text += `Tienes ${pendientes.length} pendiente${pendientes.length > 1 ? 's' : ''}:\n`;
            pendientes.forEach((t, i) => {
                text += `${i + 1}. ${t.descripcion} a las ${t.hora}\n`;
            });
        }
        return text;
    }, [tareas]);

    const handleShowSummary = useCallback(() => {
        const summaryText = buildSummaryText();
        Alert.alert('📋 Resumen de tareas', summaryText);
    }, [buildSummaryText]);

    const completadas = useMemo(() => tareas.filter(t => t.completada).length, [tareas]);
    const total = tareas.length;

    const nextTask = useMemo(() => tareas.find(t => !t.completada) || null, [tareas]);

    const TASK_BUTTON_CONFIG: Record<string, { title: string; icon: string; variant: 'success' | 'primary' }> = {
        LLEGADA:  { title: 'REGISTRAR LLEGADA',   icon: '🏠', variant: 'success' },
        PASTILLA: { title: 'DAR MEDICAMENTO',      icon: '💊', variant: 'primary' },
        PASEO:    { title: 'INICIAR PASEO',         icon: '🚶', variant: 'success' },
        COMIDA:   { title: 'REGISTRAR COMIDA',      icon: '🍽️', variant: 'success' },
        SIESTA:   { title: 'REGISTRAR SIESTA',      icon: '😴', variant: 'primary' },
    };
    const initials = useMemo(() => abueloActual.nombre.split(' ').map(n => n[0]).join(''), [abueloActual.nombre]);

    const fecha = useMemo(() => {
        return new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    }, []);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: 'Buenos días', emoji: '☀️' };
        if (hour < 20) return { text: 'Buenas tardes', emoji: '🌤️' };
        return { text: 'Buenas noches', emoji: '🌙' };
    }, []);

    // Confetti when all tasks done
    useEffect(() => {
        if (porcentaje >= 100 && !showConfetti) {
            setShowConfetti(true);
            const anims = confettiAnims.map((c: any) =>
                Animated.timing(c.anim, {
                    toValue: 1,
                    duration: 2000 + Math.random() * 1000,
                    useNativeDriver: true,
                })
            );
            Animated.stagger(80, anims).start(() => {
                setTimeout(() => setShowConfetti(false), 500);
            });
        }
    }, [porcentaje]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTextCol}>
                        <Text style={styles.greetingSmall}>{greeting.emoji} {greeting.text}</Text>
                        <Text style={styles.greeting}>{user?.nombre || 'Cuidadora'}</Text>
                        <Text style={styles.date}>📅 {fecha}</Text>
                    </View>
                    <TouchableOpacity onPress={handleChangeProfilePhoto} activeOpacity={0.8}>
                        {user?.fotoPerfil ? (
                            <Image source={{ uri: user.fotoPerfil }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>{(user?.nombre || 'C')[0]}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                <View style={styles.careInfoRow}>
                    <View style={styles.careInfoBadge}>
                        <Text style={styles.careInfoEmoji}>👵</Text>
                        <Text style={styles.careInfoText}>Cuidando a {abueloActual.nombre}</Text>
                    </View>
                </View>
            </View>

            {/* Tasks */}
            <ScrollView
                style={styles.tasksList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
            >

        {/* Progress Card */}
        <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
            <View style={styles.progressCardTop}>
                <View style={styles.progressCardLeft}>
                    <Text style={styles.progressCardTitle}>📋 Tareas de hoy</Text>
                    <Text style={styles.progressCardSub}>
                        {completadas === total
                            ? '¡Todo completado! 🎉'
                            : `${total - completadas} pendiente${total - completadas !== 1 ? 's' : ''}`}
                    </Text>
                </View>
                <View style={styles.progressRing}>
                    <Text style={styles.progressRingNum}>{completadas}</Text>
                    <Text style={styles.progressRingDenom}>/{total}</Text>
                </View>
            </View>
            <View style={styles.progressBarRow}>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${porcentaje}%` as any }]} />
                </View>
                <Text style={styles.progressPercent}>{porcentaje}%</Text>
            </View>
        </View>

        {/* Pending Notes from Familiar */}
        {notasPendientes.length > 0 && (
            <View style={styles.notasSection}>
                <View style={styles.notasSectionHeader}>
                    <Text style={[styles.notasSectionTitle, { color: colors.primary }]}>📝 Notas del familiar</Text>
                    {notasPendientes.length > 1 && (
                        <TouchableOpacity
                            onPress={() => setVerTodasNotas(!verTodasNotas)}
                        >
                            <Text style={[styles.verTodasToggle, { color: colors.primary }]}>
                                {verTodasNotas ? '← Reciente' : `Ver todas (${notasPendientes.length})`}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {!verTodasNotas ? (
                    /* Vista compacta: solo la nota más reciente */
                    <View
                        style={[
                            styles.notaCard,
                            { backgroundColor: isDark ? colors.surfaceElevated : colors.infoBg, borderLeftColor: colors.primary },
                            notasPendientes[0].prioridad === 'urgente' && [styles.notaUrgente, { backgroundColor: isDark ? colors.dangerBg : '#FFF5F5' }],
                        ]}
                    >
                        <View style={styles.notaContent}>
                            {notasPendientes[0].prioridad === 'urgente' && (
                                <View style={styles.urgenteBadge}>
                                    <Text style={styles.urgenteBadgeText}>🔴 Urgente</Text>
                                </View>
                            )}
                            <Text style={[styles.notaTexto, { color: colors.text }]} numberOfLines={2}>{notasPendientes[0].texto}</Text>
                            <Text style={[styles.notaHora, { color: colors.textLight }]}>
                                {new Date(notasPendientes[0].timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.notaLeidaBtn, { backgroundColor: isDark ? '#1B3A1E' : '#C8E6C9' }]}
                            onPress={async () => {
                                await notasService.marcarLeidaYEliminar(notasPendientes[0].id);
                                const updated = await notasService.getNotasPendientes();
                                setNotasPendientes(updated);
                                if (updated.length === 0) setVerTodasNotas(false);
                            }}
                        >
                            <Text style={[styles.notaLeidaText, { color: isDark ? colors.success : colors.primary }]}>Leída ✓</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* Vista expandida: todas las notas */
                    <View>
                        {/* Botón marcar todas */}
                        <TouchableOpacity
                            style={[styles.marcarTodasBtn, { backgroundColor: isDark ? colors.infoBg : colors.roleLight, borderColor: colors.primary }]}
                            onPress={async () => {
                                Alert.alert('Marcar como leídas', '¿Marcar todas las notas como leídas?', [
                                    { text: 'Cancelar', style: 'cancel' },
                                    {
                                        text: 'Sí, marcar todas',
                                        onPress: async () => {
                                            await notasService.marcarTodasLeidasYEliminar();
                                            setNotasPendientes([]);
                                            setVerTodasNotas(false);
                                        },
                                    },
                                ]);
                            }}
                        >
                            <Text style={[styles.marcarTodasText, { color: colors.primary }]}>✓ Marcar todas como leídas</Text>
                        </TouchableOpacity>

                        {notasPendientes.map((nota) => (
                            <View
                                key={nota.id}
                                style={[
                                    styles.notaCard,
                                    { backgroundColor: isDark ? colors.surfaceElevated : colors.infoBg, borderLeftColor: colors.primary },
                                    nota.prioridad === 'urgente' && [styles.notaUrgente, { backgroundColor: isDark ? colors.dangerBg : '#FFF5F5' }],
                                ]}
                            >
                                <View style={styles.notaContent}>
                                    {nota.prioridad === 'urgente' && (
                                        <View style={styles.urgenteBadge}>
                                            <Text style={styles.urgenteBadgeText}>🔴 Urgente</Text>
                                        </View>
                                    )}
                                    <Text style={[styles.notaTexto, { color: colors.text }]}>{nota.texto}</Text>
                                    <Text style={[styles.notaHora, { color: colors.textLight }]}>
                                        {new Date(nota.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.notaLeidaBtn, { backgroundColor: isDark ? '#1B3A1E' : '#C8E6C9' }]}
                                    onPress={async () => {
                                        await notasService.marcarLeidaYEliminar(nota.id);
                                        const updated = await notasService.getNotasPendientes();
                                        setNotasPendientes(updated);
                                        if (updated.length === 0) setVerTodasNotas(false);
                                    }}
                                >
                                    <Text style={[styles.notaLeidaText, { color: isDark ? colors.success : colors.primary }]}>Leída ✓</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        )}

        {tareas.map((tarea, index) => {
            const config = TASK_COLORS[tarea.tipo] || TASK_COLORS.LLEGADA;
            const isLast = index === tareas.length - 1;
            return (
                <TouchableOpacity
                    key={index}
                    style={[
                        styles.taskCard,
                        { borderLeftColor: config.text, backgroundColor: colors.surface },
                        tarea.completada && { backgroundColor: isDark ? colors.surfaceElevated : '#F8FBF8', borderLeftColor: isDark ? '#555' : '#B0BEC5' },
                    ]}
                    onPress={() => handleTaskPress(tarea)}
                    activeOpacity={0.7}
                >
                    <View style={styles.taskLeftCol}>
                        <View style={[styles.taskIconCircle, { backgroundColor: isDark ? config.darkBg : config.bg }]}>
                            <Text style={styles.taskEmoji}>{config.emoji}</Text>
                        </View>
                        {!isLast && <View style={[styles.taskTimeline, { backgroundColor: colors.border }]} />}
                    </View>
                    <View style={styles.taskInfo}>
                        <View style={styles.taskTopRow}>
                            <Text style={[
                                styles.taskDescription,
                                { color: colors.text },
                                tarea.completada && { textDecorationLine: 'line-through' as const, color: isDark ? '#777' : '#B0BEC5' },
                            ]} numberOfLines={1}>{tarea.descripcion}</Text>
                            <View style={[styles.taskHoraBadge, { backgroundColor: isDark ? `${config.text}20` : `${config.text}12` }]}>
                                <Text style={[styles.taskHora, { color: config.text }]}>{tarea.hora}</Text>
                            </View>
                        </View>
                        <View style={styles.taskMeta}>
                            <View style={[styles.taskTypeBadge, { backgroundColor: config.bg }]}>
                                <Text style={[styles.taskTypeText, { color: config.text }]}>{config.label}</Text>
                            </View>
                            {tarea.completada && (
                                <View style={styles.checkBadge}>
                                    <Text style={styles.checkText}>✓ Hecho</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            );
        })}

            </ScrollView>

            {/* Bottom Actions */}
            <View style={[styles.bottomActions, { backgroundColor: colors.surface }]}>
                {nextTask ? (
                    <BigButton
                        title={`${TASK_BUTTON_CONFIG[nextTask.tipo]?.icon || '▶️'}  ${TASK_BUTTON_CONFIG[nextTask.tipo]?.title || nextTask.descripcion}`}
                        variant={TASK_BUTTON_CONFIG[nextTask.tipo]?.variant || 'success'}
                        onPress={() => handleTaskPress(nextTask)}
                    />
                ) : (
                    <BigButton
                        title="✅  JORNADA COMPLETADA"
                        variant="success"
                        onPress={() => Alert.alert('🎉 ¡Enhorabuena!', 'Has completado todas las tareas de hoy.')}
                    />
                )}
            </View>

            {/* Confetti Overlay */}
            {showConfetti && (
                <View style={styles.confettiOverlay} pointerEvents="none">
                    {confettiAnims.map((c, i) => (
                        <Animated.View
                            key={i}
                            style={{
                                position: 'absolute',
                                left: c.x,
                                width: c.size,
                                height: c.size,
                                borderRadius: c.size / 2,
                                backgroundColor: c.color,
                                transform: [{
                                    translateY: c.anim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-20, 800],
                                    }),
                                }],
                                opacity: c.anim.interpolate({
                                    inputRange: [0, 0.8, 1],
                                    outputRange: [1, 1, 0],
                                }),
                            }}
                        />
                    ))}
                    <View style={[styles.confettiBanner, { backgroundColor: colors.primary }]}>
                        <Text style={styles.confettiText}>Jornada Completada</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // ─── Header ───
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 52,
        paddingBottom: SPACING.lg,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        ...SHADOWS.large,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTextCol: {
        flex: 1,
        marginRight: SPACING.md,
    },
    greetingSmall: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 2,
    },
    greeting: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    date: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 4,
        textTransform: 'capitalize',
    },
    avatarCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarImage: {
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 2.5,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    careInfoRow: {
        marginTop: 14,
    },
    careInfoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    careInfoEmoji: {
        fontSize: 18,
        marginRight: 8,
    },
    careInfoText: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
    },
    // ─── Tasks List ───
    tasksList: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
    },
    // ─── Progress Card ───
    progressCard: {
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 18,
        marginBottom: 16,
        ...SHADOWS.medium,
    },
    progressCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    progressCardLeft: {
        flex: 1,
    },
    progressCardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    progressCardSub: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
        fontWeight: '500',
    },
    progressRing: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    progressRingNum: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    progressRingDenom: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
    },
    progressBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
    },
    progressBarBg: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%' as any,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.85)',
    },
    progressPercent: {
        fontSize: 13,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.9)',
        marginLeft: 10,
        minWidth: 36,
        textAlign: 'right',
    },
    // ─── Task Card ───
    taskCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 4,
        ...SHADOWS.small,
    },
    taskLeftCol: {
        alignItems: 'center',
        marginRight: 12,
    },
    taskIconCircle: {
        width: 46,
        height: 46,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskEmoji: {
        fontSize: 24,
    },
    taskTimeline: {
        width: 2,
        height: 18,
        marginTop: 6,
        borderRadius: 1,
    },
    taskInfo: {
        flex: 1,
    },
    taskTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    taskDescription: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.1,
        flex: 1,
        marginRight: 8,
    },
    taskMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    taskTypeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    taskTypeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    taskHoraBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    taskHora: {
        fontSize: 13,
        fontWeight: '800',
    },
    checkBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    checkText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2E7D32',
    },
    // ─── Bottom Actions ───
    bottomActions: {
        padding: SPACING.lg,
        paddingBottom: 14,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        ...SHADOWS.large,
    },
    // ─── Notes Section ───
    notasSection: {
        marginBottom: SPACING.md,
    },
    notasSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    notasSectionTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    verTodasToggle: {
        fontSize: 13,
        fontWeight: '700',
    },
    notaCard: {
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        ...SHADOWS.small,
    },
    notaUrgente: {
        borderLeftColor: '#F44336',
    },
    notaContent: {
        flex: 1,
    },
    urgenteBadge: {
        marginBottom: 4,
    },
    urgenteBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F44336',
    },
    notaTexto: {
        fontSize: 14,
        lineHeight: 20,
    },
    notaHora: {
        fontSize: 11,
        marginTop: 4,
    },
    notaLeidaBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        marginLeft: 10,
    },
    notaLeidaText: {
        fontSize: 12,
        fontWeight: '700',
    },
    marcarTodasBtn: {
        borderRadius: 12,
        paddingVertical: 10,
        marginBottom: 8,
        alignItems: 'center',
        borderWidth: 1.5,
    },
    marcarTodasText: {
        fontSize: 13,
        fontWeight: '700',
    },
    // ─── Confetti ───
    confettiOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
    },
    confettiBanner: {
        position: 'absolute',
        top: '40%',
        alignSelf: 'center',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 20,
        ...SHADOWS.large,
    },
    confettiText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
    },
});

export default React.memo(DashboardScreen);
