import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Animated, Image, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, CUIDADORA } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
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
        try {
            const notas = await notasService.getNotasPendientes();
            console.log('📝 Notas pendientes cargadas:', notas.length, notas.map(n => n.texto));
            setNotasPendientes(notas);
        } catch (e) {
            console.error('Error cargando notas:', e);
        }
        const tareasBase: Tarea[] = [
            { tipo: 'LLEGADA', hora: '09:00', descripcion: 'Llegada al domicilio', completada: false, icono: 'L' },
            { tipo: 'PASTILLA', hora: '10:30', descripcion: 'Sinemet 10mg', completada: false, icono: 'M' },
            { tipo: 'PASEO', hora: '12:00', descripcion: 'Paseo por el barrio', completada: false, icono: 'P' },
            { tipo: 'COMIDA', hora: '14:00', descripcion: 'Preparar comida', completada: false, icono: 'C' },
            { tipo: 'SIESTA', hora: '15:30', descripcion: 'Siesta después de comer', completada: false, icono: 'S' },
        ];
        try {
            const localEventStorage = require('../services/localEventStorage').default;
            const eventosHoy = await localEventStorage.getEventosHoy();
            const tiposCompletados = new Set(eventosHoy.map((e: any) => e.tipo));
            tareasBase.forEach(t => { if (tiposCompletados.has(t.tipo)) t.completada = true; });
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
        reminderService.init().then(() => { reminderService.scheduleMedicationReminders(); });
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

    useEffect(() => {
        const interval = setInterval(async () => {
            const notas = await notasService.getNotasPendientes();
            setNotasPendientes(notas);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const reloadTareasAndEvents = async () => {
            try {
                const localEventStorage = require('../services/localEventStorage').default;
                const eventosHoy = await localEventStorage.getEventosHoy();
                const tiposCompletados = new Set(eventosHoy.map((e: any) => e.tipo));
                setTareas(prev => {
                    const updated = prev.map(t => ({ ...t, completada: tiposCompletados.has(t.tipo) }));
                    const completadasCount = updated.filter(t => t.completada).length;
                    setPorcentaje(Math.round((completadasCount / updated.length) * 100));
                    return updated;
                });
            } catch (e) {
                console.error('Error reloading tareas:', e);
            }
        };
        const unsubscribe = onTasksChanged(reloadTareasAndEvents);
        const intervalId = setInterval(reloadTareasAndEvents, 2000);
        return () => { unsubscribe(); clearInterval(intervalId); };
    }, []);

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
                allowsEditing: true, aspect: [1, 1], quality: 0.8,
            });
            if (!result.canceled) {
                const photo = result.assets[0];
                const base64 = await convertImageToBase64(photo.uri);
                if (user) {
                    const updatedUser = { ...user, fotoPerfil: base64 };
                    setUser(updatedUser);
                    try {
                        await authService.updateProfilePhoto(base64);
                        Alert.alert('Éxito', 'Foto de perfil actualizada');
                    } catch (apiError) {
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
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting to base64:', error);
            throw error;
        }
    };

    const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

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
            pendientes.forEach((t, i) => { text += `${i + 1}. ${t.descripcion} a las ${t.hora}\n`; });
        }
        return text;
    }, [tareas]);

    const handleShowSummary = useCallback(() => {
        Alert.alert('📋 Resumen de tareas', buildSummaryText());
    }, [buildSummaryText]);

    const completadas = useMemo(() => tareas.filter(t => t.completada).length, [tareas]);
    const total = tareas.length;
    const nextTask = useMemo(() => tareas.find(t => !t.completada) || null, [tareas]);
    const nextTaskIndex = useMemo(() => tareas.findIndex(t => !t.completada), [tareas]);

    const TASK_BUTTON_CONFIG: Record<string, { title: string; icon: string; variant: 'success' | 'primary' }> = {
        LLEGADA:  { title: 'REGISTRAR LLEGADA',   icon: '🏠', variant: 'success' },
        PASTILLA: { title: 'DAR MEDICAMENTO',      icon: '💊', variant: 'primary' },
        PASEO:    { title: 'INICIAR PASEO',         icon: '🚶', variant: 'success' },
        COMIDA:   { title: 'REGISTRAR COMIDA',      icon: '🍽️', variant: 'success' },
        SIESTA:   { title: 'REGISTRAR SIESTA',      icon: '😴', variant: 'primary' },
    };

    const initials = useMemo(() => abueloActual.nombre.split(' ').map(n => n[0]).join(''), [abueloActual.nombre]);

    const fecha = useMemo(() => new Date().toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long',
    }), []);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: 'Buenos días', emoji: '☀️' };
        if (hour < 20) return { text: 'Buenas tardes', emoji: '🌤️' };
        return { text: 'Buenas noches', emoji: '🌙' };
    }, []);

    useEffect(() => {
        if (porcentaje >= 100 && !showConfetti) {
            setShowConfetti(true);
            const anims = confettiAnims.map((c: any) =>
                Animated.timing(c.anim, { toValue: 1, duration: 2000 + Math.random() * 1000, useNativeDriver: true })
            );
            Animated.stagger(80, anims).start(() => { setTimeout(() => setShowConfetti(false), 500); });
        }
    }, [porcentaje]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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

            <ScrollView
                style={styles.tasksList}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
            >
                {/* Stepper horizontal de progreso */}
                <View style={[styles.stepperContainer, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                    <View style={styles.stepperRow}>
                        {tareas.map((t, i) => {
                            const cfg = TASK_COLORS[t.tipo] || TASK_COLORS.LLEGADA;
                            const isActive = i === nextTaskIndex;
                            return (
                                <React.Fragment key={i}>
                                    <View style={styles.stepperItem}>
                                        <View style={[
                                            styles.stepCircle,
                                            t.completada
                                                ? { backgroundColor: '#4CAF50' }
                                                : isActive
                                                    ? { backgroundColor: cfg.text, ...SHADOWS.small }
                                                    : { backgroundColor: isDark ? '#333' : '#E0E0E0' },
                                        ]}>
                                            {t.completada
                                                ? <Ionicons name="checkmark" size={14} color="#fff" />
                                                : <Text style={{ fontSize: 12 }}>{cfg.emoji}</Text>
                                            }
                                        </View>
                                        <Text style={[
                                            styles.stepLabel,
                                            { color: t.completada ? '#4CAF50' : isActive ? cfg.text : colors.textSecondary },
                                            isActive && { fontWeight: '800' },
                                        ]}>{t.hora}</Text>
                                    </View>
                                    {i < tareas.length - 1 && (
                                        <View style={[
                                            styles.stepLine,
                                            { backgroundColor: t.completada ? '#4CAF50' : (isDark ? '#333' : '#E0E0E0') },
                                        ]} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </View>
                    <Text style={[styles.stepperSummary, { color: colors.textSecondary }]}>
                        {completadas === total
                            ? '🎉 ¡Todas las tareas completadas!'
                            : `${completadas}/${total} completadas · ${porcentaje}%`}
                    </Text>
                </View>

                {notasPendientes.length > 0 && (
                    <View style={styles.notasSection}>
                        <View style={styles.notasSectionHeader}>
                            <Text style={[styles.notasSectionTitle, { color: colors.primary }]}>📝 Notas del familiar</Text>
                            {notasPendientes.length > 1 && (
                                <TouchableOpacity onPress={() => setVerTodasNotas(!verTodasNotas)}>
                                    <Text style={[styles.verTodasToggle, { color: colors.primary }]}>
                                        {verTodasNotas ? '← Reciente' : `Ver todas (${notasPendientes.length})`}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {!verTodasNotas ? (
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
                            <View>
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
                    const isNext = index === nextTaskIndex;
                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.taskCard,
                                { borderLeftColor: config.text, backgroundColor: colors.surface },
                                tarea.completada && {
                                    backgroundColor: isDark ? '#1a2e1a' : '#F0FAF0',
                                    borderLeftColor: '#4CAF50',
                                    opacity: 0.75,
                                },
                                isNext && {
                                    borderLeftColor: config.text,
                                    borderLeftWidth: 5,
                                    backgroundColor: isDark ? `${config.text}15` : `${config.text}08`,
                                    ...SHADOWS.medium,
                                },
                            ]}
                            onPress={() => handleTaskPress(tarea)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.taskLeftCol}>
                                {tarea.completada ? (
                                    <View style={[styles.taskIconCircle, { backgroundColor: isDark ? '#1B3A1E' : '#E8F5E9' }]}>
                                        <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
                                    </View>
                                ) : (
                                    <View style={[styles.taskIconCircle, { backgroundColor: isDark ? config.darkBg : config.bg }, isNext && styles.nextTaskIcon]}>
                                        <Text style={styles.taskEmoji}>{config.emoji}</Text>
                                    </View>
                                )}
                                {!isLast && (
                                    <View style={[
                                        styles.taskTimeline,
                                        { backgroundColor: tarea.completada ? '#4CAF50' : colors.border },
                                        tarea.completada && { opacity: 0.5 },
                                    ]} />
                                )}
                            </View>
                            <View style={styles.taskInfo}>
                                <View style={styles.taskTopRow}>
                                    <Text style={[
                                        styles.taskDescription,
                                        { color: colors.text },
                                        tarea.completada && { textDecorationLine: 'line-through' as const, color: isDark ? '#666' : '#9E9E9E' },
                                    ]} numberOfLines={1}>{tarea.descripcion}</Text>
                                    <View style={[styles.taskHoraBadge, {
                                        backgroundColor: tarea.completada
                                            ? (isDark ? '#1B3A1E' : '#E8F5E9')
                                            : (isDark ? `${config.text}20` : `${config.text}12`),
                                    }]}>
                                        <Text style={[styles.taskHora, {
                                            color: tarea.completada ? '#4CAF50' : config.text,
                                        }]}>{tarea.hora}</Text>
                                    </View>
                                </View>
                                <View style={styles.taskMeta}>
                                    {tarea.completada ? (
                                        <View style={styles.checkBadge}>
                                            <Ionicons name="checkmark-done" size={14} color="#4CAF50" />
                                            <Text style={styles.checkText}>Completada</Text>
                                        </View>
                                    ) : isNext ? (
                                        <View style={[styles.nextBadge, { backgroundColor: `${config.text}18` }]}>
                                            <Ionicons name="arrow-forward-circle" size={14} color={config.text} />
                                            <Text style={[styles.nextBadgeText, { color: config.text }]}>Siguiente</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.taskTypeBadge, { backgroundColor: config.bg }]}>
                                            <Text style={[styles.taskTypeText, { color: config.text }]}>{config.label}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={[styles.bottomActions, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                {nextTask ? (
                    <View>
                        <View style={styles.bottomStepRow}>
                            <Text style={[styles.bottomStepLabel, { color: colors.textSecondary }]}>
                                Paso {nextTaskIndex + 1} de {total}
                            </Text>
                            <View style={styles.bottomDots}>
                                {tareas.map((t, i) => (
                                    <View key={i} style={[
                                        styles.bottomDot,
                                        { backgroundColor: t.completada ? '#4CAF50' : i === nextTaskIndex ? colors.primary : colors.border },
                                        i === nextTaskIndex && styles.bottomDotActive,
                                    ]} />
                                ))}
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.nextActionBtn,
                                { backgroundColor: TASK_COLORS[nextTask.tipo]?.text || colors.primary },
                            ]}
                            onPress={() => handleTaskPress(nextTask)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.nextActionEmoji}>{TASK_BUTTON_CONFIG[nextTask.tipo]?.icon || '▶️'}</Text>
                            <View style={styles.nextActionTextCol}>
                                <Text style={styles.nextActionTitle}>{TASK_BUTTON_CONFIG[nextTask.tipo]?.title || nextTask.descripcion}</Text>
                                <Text style={styles.nextActionSub}>{nextTask.hora} · {nextTask.descripcion}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.nextActionBtn, { backgroundColor: '#4CAF50' }]}
                        onPress={() => Alert.alert('🎉 ¡Enhorabuena!', 'Has completado todas las tareas de hoy.')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.nextActionEmoji}>🎉</Text>
                        <View style={styles.nextActionTextCol}>
                            <Text style={styles.nextActionTitle}>JORNADA COMPLETADA</Text>
                            <Text style={styles.nextActionSub}>Todas las tareas de hoy están hechas</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                )}
            </View>

            {showConfetti && (
                <View style={styles.confettiOverlay} pointerEvents="none">
                    {confettiAnims.map((c, i) => (
                        <Animated.View
                            key={i}
                            style={{
                                position: 'absolute', left: c.x, width: c.size, height: c.size,
                                borderRadius: c.size / 2, backgroundColor: c.color,
                                transform: [{ translateY: c.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 800] }) }],
                                opacity: c.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
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
    container: { flex: 1 },
    header: {
        paddingHorizontal: SPACING.lg, paddingTop: 52, paddingBottom: SPACING.lg,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28, ...SHADOWS.large,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTextCol: { flex: 1, marginRight: SPACING.md },
    greetingSmall: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
    greeting: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
    date: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4, textTransform: 'capitalize' },
    avatarCircle: {
        width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarImage: {
        width: 54, height: 54, borderRadius: 27, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
    careInfoRow: { marginTop: 14 },
    careInfoBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    },
    careInfoEmoji: { fontSize: 18, marginRight: 8 },
    careInfoText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    tasksList: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
    stepperContainer: {
        borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14, ...SHADOWS.small,
    },
    stepperRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
    stepperItem: { alignItems: 'center' },
    stepCircle: {
        width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    },
    stepLabel: { fontSize: 10, fontWeight: '600', marginTop: 4 },
    stepLine: { height: 2, flex: 1, marginHorizontal: 2, borderRadius: 1, marginBottom: 14 },
    stepperSummary: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },
    taskCard: {
        flexDirection: 'row', alignItems: 'flex-start', borderRadius: 18,
        padding: 14, marginBottom: 10, borderLeftWidth: 4, ...SHADOWS.small,
    },
    taskLeftCol: { alignItems: 'center', marginRight: 12 },
    taskIconCircle: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    taskEmoji: { fontSize: 24 },
    taskTimeline: { width: 2, height: 18, marginTop: 6, borderRadius: 1 },
    taskInfo: { flex: 1 },
    taskTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    taskDescription: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1, flex: 1, marginRight: 8 },
    taskMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    taskTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    taskTypeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    taskHoraBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    taskHora: { fontSize: 13, fontWeight: '800' },
    checkBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    },
    checkText: { fontSize: 11, fontWeight: '700', color: '#4CAF50' },
    nextTaskIcon: {
        borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
    },
    nextBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    },
    nextBadgeText: { fontSize: 11, fontWeight: '800' },
    bottomActions: {
        padding: SPACING.lg, paddingBottom: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...SHADOWS.large,
    },
    bottomStepRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2,
    },
    bottomStepLabel: { fontSize: 13, fontWeight: '700' },
    bottomDots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    bottomDot: { width: 8, height: 8, borderRadius: 4 },
    bottomDotActive: { width: 20, borderRadius: 10 },
    nextActionBtn: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 18,
        paddingVertical: 16, paddingHorizontal: 18, ...SHADOWS.medium,
    },
    nextActionEmoji: { fontSize: 28, marginRight: 14 },
    nextActionTextCol: { flex: 1 },
    nextActionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
    nextActionSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '500' },
    notasSection: { marginBottom: SPACING.md },
    notasSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    notasSectionTitle: { fontSize: 15, fontWeight: '700' },
    verTodasToggle: { fontSize: 13, fontWeight: '700' },
    notaCard: {
        borderRadius: 14, padding: 12, marginBottom: 8,
        flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, ...SHADOWS.small,
    },
    notaUrgente: { borderLeftColor: '#F44336' },
    notaContent: { flex: 1 },
    urgenteBadge: { marginBottom: 4 },
    urgenteBadgeText: { fontSize: 11, fontWeight: '700', color: '#F44336' },
    notaTexto: { fontSize: 14, lineHeight: 20 },
    notaHora: { fontSize: 11, marginTop: 4 },
    notaLeidaBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginLeft: 10 },
    notaLeidaText: { fontSize: 12, fontWeight: '700' },
    marcarTodasBtn: { borderRadius: 12, paddingVertical: 10, marginBottom: 8, alignItems: 'center', borderWidth: 1.5 },
    marcarTodasText: { fontSize: 13, fontWeight: '700' },
    confettiOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
    confettiBanner: {
        position: 'absolute', top: '40%', alignSelf: 'center',
        paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20, ...SHADOWS.large,
    },
    confettiText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
});

export default React.memo(DashboardScreen);
