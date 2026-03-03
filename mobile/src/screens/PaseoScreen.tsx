/**
 * PaseoScreen.tsx — Pantalla de tracking GPS de paseos.
 *
 * Flujo:
 * 1. Botón "Iniciar Paseo" → comienza tracking GPS continuo
 * 2. Muestra mapa en tiempo real con la ruta dibujada
 * 3. Contador de distancia (km) y duración (minutos)
 * 4. Botón "Finalizar" → envía ruta GeoJSON al backend
 *
 * Integra: locationService (GPS), paseoService (backend)
 * Usa MapView de react-native-maps para visualizar la ruta.
 * ~509 líneas
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Animated,
    Dimensions,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import locationService, { LocationData } from '../services/locationService';
import eventosService from '../services/eventosService';
import localEventStorage from '../services/localEventStorage';
import { notifyEventCreated } from '../services/taskEventEmitter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PaseoScreenProps {
    route: { params: { abueloId: number } };
    onGoBack: () => void;
}

const PaseoScreen: React.FC<PaseoScreenProps> = ({ route, onGoBack }) => {
    const { colors, isDark } = useTheme();
    const abueloId = route?.params?.abueloId ?? 1;

    const [tracking, setTracking] = useState(false);
    const [paused, setPaused] = useState(false);
    const [routePoints, setRoutePoints] = useState<LocationData[]>([]);
    const [distance, setDistance] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

    const mapRef = useRef<MapView>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const pausedElapsedRef = useRef<number>(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Entry animation
    useEffect(() => {
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50 }).start();
    }, []);

    // Pulse animation while tracking
    useEffect(() => {
        if (tracking && !paused) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            );
            loop.start();
            return () => loop.stop();
        }
    }, [tracking, paused]);

    // Timer
    useEffect(() => {
        if (tracking && !paused) {
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                const now = Date.now();
                setElapsed(pausedElapsedRef.current + Math.floor((now - startTimeRef.current) / 1000));
            }, 1000);
        } else if (paused && timerRef.current) {
            pausedElapsedRef.current = elapsed;
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [tracking, paused]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const calculatePoints = () => {
        if (distance >= 2) return 100;
        if (distance >= 1) return 60;
        if (distance >= 0.5) return 30;
        if (distance >= 0.2) return 15;
        return 5;
    };

    // Get initial location
    useEffect(() => {
        (async () => {
            const loc = await locationService.getCurrentLocation();
            if (loc) setCurrentLocation(loc);
        })();
    }, []);

    const handleStart = async () => {
        setLoading(true);
        try {
            await locationService.startRouteTracking((loc) => {
                setCurrentLocation(loc);
                setRoutePoints(prev => {
                    const next = [...prev, loc];
                    // Calculate distance
                    if (next.length >= 2) {
                        let total = 0;
                        for (let i = 1; i < next.length; i++) {
                            const p1 = next[i - 1];
                            const p2 = next[i];
                            const R = 6371;
                            const dLat = (p2.lat - p1.lat) * Math.PI / 180;
                            const dLng = (p2.lng - p1.lng) * Math.PI / 180;
                            const a = Math.sin(dLat / 2) ** 2 +
                                Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
                                Math.sin(dLng / 2) ** 2;
                            total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        }
                        setDistance(Math.round(total * 100) / 100);
                    }
                    return next;
                });

                // Center map
                mapRef.current?.animateToRegion({
                    latitude: loc.lat,
                    longitude: loc.lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }, 500);
            });

            setTracking(true);
            setPaused(false);
            pausedElapsedRef.current = 0;
            setElapsed(0);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'No se pudo iniciar el tracking GPS');
        }
        setLoading(false);
    };

    const handlePause = () => {
        setPaused(!paused);
    };

    const handleStop = async () => {
        Alert.alert('Finalizar paseo', '¿Quieres guardar este paseo?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Guardar',
                onPress: async () => {
                    setLoading(true);
                    const result = locationService.stopRouteTracking();
                    if (timerRef.current) clearInterval(timerRef.current);

                    try {
                        await eventosService.finalizarPaseo({
                            abueloId,
                            ruta: routePoints.map(p => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp })),
                            distanciaKm: distance,
                        });
                    } catch { }

                    // Save local event
                    await localEventStorage.guardarEvento({
                        tipo: 'PASEO',
                        descripcion: `Paseo de ${distance.toFixed(2)} km en ${formatTime(elapsed)}`,
                        verificado: true,
                    });
                    notifyEventCreated('PASEO');

                    setTracking(false);
                    setPaused(false);
                    setCompleted(true);
                    setLoading(false);
                },
            },
        ]);
    };

    const region = currentLocation ? {
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
    } : {
        latitude: 40.4168,
        longitude: -3.7038,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Map */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={region}
                    showsUserLocation
                    showsMyLocationButton={false}
                    userInterfaceStyle={isDark ? 'dark' : 'light'}
                >
                    {routePoints.length >= 2 && (
                        <Polyline
                            coordinates={routePoints.map(p => ({ latitude: p.lat, longitude: p.lng }))}
                            strokeColor={colors.primary}
                            strokeWidth={4}
                        />
                    )}
                    {routePoints.length > 0 && (
                        <Marker
                            coordinate={{
                                latitude: routePoints[0].lat,
                                longitude: routePoints[0].lng,
                            }}
                            title="Inicio"
                            pinColor={colors.success}
                        />
                    )}
                </MapView>

                {/* Tracking badge */}
                {tracking && (
                    <Animated.View style={[
                        styles.trackingBadge,
                        {
                            backgroundColor: paused ? colors.warningBg : colors.success + '20',
                            borderColor: paused ? colors.warning : colors.success,
                            transform: [{ scale: paused ? 1 : pulseAnim }],
                        },
                    ]}>
                        <View style={[styles.trackingDot, { backgroundColor: paused ? colors.warning : colors.success }]} />
                        <Text style={[styles.trackingText, { color: paused ? colors.warningText : colors.success }]}>
                            {paused ? 'PAUSADO' : 'RASTREANDO'}
                        </Text>
                    </Animated.View>
                )}
            </View>

            {/* Stats Panel */}
            <Animated.View style={[
                styles.statsPanel,
                {
                    backgroundColor: colors.card,
                    ...SHADOWS.medium,
                    transform: [{ translateY: slideAnim }],
                },
            ]}>
                {completed ? (
                    /* Completed view */
                    <View style={styles.completedContainer}>
                        <Text style={{ fontSize: 48, textAlign: 'center' }}>🎉</Text>
                        <Text style={[styles.completedTitle, { color: colors.text }]}>¡Paseo completado!</Text>
                        <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
                            {distance.toFixed(2)} km en {formatTime(elapsed)}
                        </Text>
                        <View style={[styles.pointsBadge, { backgroundColor: colors.success + '20' }]}>
                            <Text style={[styles.pointsText, { color: colors.success }]}>+{calculatePoints()} puntos</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                            onPress={onGoBack}
                        >
                            <Text style={styles.doneBtnText}>Volver al inicio</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Stat cards */}
                        <View style={styles.statsRow}>
                            <View style={[styles.statCard, { backgroundColor: colors.infoBg }]}>
                                <Ionicons name="walk-outline" size={20} color={colors.infoText} />
                                <Text style={[styles.statValue, { color: colors.infoText }]}>
                                    {distance.toFixed(2)}
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.infoText + '99' }]}>km</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: colors.warningBg }]}>
                                <Ionicons name="time-outline" size={20} color={colors.warningText} />
                                <Text style={[styles.statValue, { color: colors.warningText }]}>
                                    {formatTime(elapsed)}
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.warningText + '99' }]}>tiempo</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: colors.success + '15' }]}>
                                <Ionicons name="star-outline" size={20} color={colors.success} />
                                <Text style={[styles.statValue, { color: colors.success }]}>
                                    {calculatePoints()}
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.success + '99' }]}>puntos</Text>
                            </View>
                        </View>

                        {/* Control buttons */}
                        <View style={styles.controlsRow}>
                            {!tracking ? (
                                <TouchableOpacity
                                    style={[styles.startBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleStart}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="play" size={24} color="#FFF" />
                                            <Text style={styles.startBtnText}>Iniciar Paseo</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.controlBtn, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}
                                        onPress={handlePause}
                                    >
                                        <Ionicons name={paused ? 'play' : 'pause'} size={22} color={colors.warning} />
                                        <Text style={[styles.controlBtnText, { color: colors.warning }]}>
                                            {paused ? 'Reanudar' : 'Pausar'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.controlBtn, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}
                                        onPress={handleStop}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color={colors.danger} />
                                        ) : (
                                            <>
                                                <Ionicons name="stop" size={22} color={colors.danger} />
                                                <Text style={[styles.controlBtnText, { color: colors.danger }]}>Finalizar</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {/* Info tip */}
                        {!tracking && (
                            <View style={[styles.tipCard, { backgroundColor: colors.infoBg }]}>
                                <Text style={[styles.tipText, { color: colors.infoText }]}>
                                    💡 Mantén el teléfono encendido durante el paseo para registrar la ruta completa.
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mapContainer: {
        flex: 1,
        minHeight: 280,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    trackingBadge: {
        position: 'absolute',
        top: 16,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        gap: 8,
    },
    trackingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    trackingText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    statsPanel: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.xl,
        marginTop: -20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: SPACING.lg,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    startBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
    },
    startBtnText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFF',
    },
    controlBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        gap: 8,
    },
    controlBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    tipCard: {
        marginTop: SPACING.md,
        borderRadius: 12,
        padding: SPACING.md,
    },
    tipText: {
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
    },
    completedContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    completedTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginTop: 8,
    },
    completedSubtitle: {
        fontSize: 15,
        marginTop: 4,
    },
    pointsBadge: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 12,
    },
    pointsText: {
        fontSize: 16,
        fontWeight: '700',
    },
    doneBtn: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 20,
    },
    doneBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },
});

export default PaseoScreen;
