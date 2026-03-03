import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import locationService, { LocationData } from '../services/locationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LocalizarScreenProps {
    abueloId?: number;
}

// Simulated home coords (Vigo area)
const HOME = { lat: 42.2406, lng: -8.7207 };
const ZONE_RADIUS = 100; // meters

const LocalizarScreen: React.FC<LocalizarScreenProps> = ({ abueloId = 1 }) => {
    const { colors, isDark } = useTheme();

    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [distance, setDistance] = useState(0);
    const [inZone, setInZone] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<string>('--:--');
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const fetchLocation = useCallback(async () => {
        try {
            const loc = await locationService.getCurrentLocation();
            if (loc) {
                setLocation(loc);
                const d = haversineMeters(loc.lat, loc.lng, HOME.lat, HOME.lng);
                setDistance(Math.round(d));
                setInZone(d <= ZONE_RADIUS);
                setLastUpdate(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
            }
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchLocation();
        const interval = setInterval(fetchLocation, 15000);
        return () => clearInterval(interval);
    }, [fetchLocation]);

    // Pulse when out of zone
    useEffect(() => {
        if (!inZone) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            );
            loop.start();
            return () => loop.stop();
        }
    }, [inZone]);

    const deviceLat = location?.lat ?? HOME.lat;
    const deviceLng = location?.lng ?? HOME.lng;

    const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            * { margin: 0; padding: 0; }
            #map { width: 100vw; height: 100vh; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', { zoomControl: false }).setView([${deviceLat}, ${deviceLng}], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);

            // Home marker
            var homeIcon = L.divIcon({
                html: '<div style="font-size:28px;text-align:center;">🏠</div>',
                className: '', iconSize: [32, 32], iconAnchor: [16, 16]
            });
            L.marker([${HOME.lat}, ${HOME.lng}], { icon: homeIcon }).addTo(map)
                .bindPopup('Domicilio');

            // Geofence circle
            L.circle([${HOME.lat}, ${HOME.lng}], {
                radius: ${ZONE_RADIUS},
                color: '${isDark ? '#42A5F5' : '#1565C0'}',
                fillColor: '${isDark ? '#42A5F5' : '#1565C0'}',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '6 4'
            }).addTo(map);

            // Device marker
            var deviceIcon = L.divIcon({
                html: '<div style="font-size:28px;text-align:center;">📍</div>',
                className: '', iconSize: [32, 32], iconAnchor: [16, 32]
            });
            L.marker([${deviceLat}, ${deviceLng}], { icon: deviceIcon }).addTo(map)
                .bindPopup('Posición actual');

            // Fit bounds
            var bounds = L.latLngBounds([[${HOME.lat}, ${HOME.lng}], [${deviceLat}, ${deviceLng}]]);
            map.fitBounds(bounds.pad(0.3));
        </script>
    </body>
    </html>`;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
                <Text style={styles.headerTitle}>📍 Localización</Text>
                <Text style={styles.headerSubtitle}>Seguimiento en tiempo real</Text>
            </View>

            {/* Status badge */}
            <Animated.View style={[
                styles.statusBadge,
                {
                    backgroundColor: inZone ? colors.success + '18' : colors.dangerBg,
                    borderColor: inZone ? colors.success : colors.danger,
                    transform: [{ scale: inZone ? 1 : pulseAnim }],
                },
            ]}>
                <View style={[styles.statusDot, { backgroundColor: inZone ? colors.success : colors.danger }]} />
                <Text style={[styles.statusText, { color: inZone ? colors.success : colors.danger }]}>
                    {inZone ? 'En zona segura' : '⚠️ Fuera de zona'}
                </Text>
            </Animated.View>

            {/* Map */}
            <View style={[styles.mapContainer, { backgroundColor: colors.card }]}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                            Obteniendo ubicación...
                        </Text>
                    </View>
                ) : (
                    <WebView
                        source={{ html: leafletHtml }}
                        style={styles.webview}
                        scrollEnabled={false}
                        javaScriptEnabled
                    />
                )}
            </View>

            {/* Info bar */}
            <View style={[styles.infoBar, { backgroundColor: colors.card, ...SHADOWS.medium }]}>
                <View style={styles.infoItem}>
                    <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Distancia</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                        {distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`}
                    </Text>
                </View>
                <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
                <View style={styles.infoItem}>
                    <Ionicons name="radio-outline" size={18} color={colors.primary} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Radio zona</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{ZONE_RADIUS} m</Text>
                </View>
                <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
                <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Última</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{lastUpdate}</Text>
                </View>
            </View>

            {/* Refresh button */}
            <TouchableOpacity
                style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
                onPress={() => { setLoading(true); fetchLocation(); }}
            >
                <Ionicons name="refresh" size={20} color="#FFF" />
                <Text style={styles.refreshText}>Actualizar</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 56,
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        marginTop: -14,
        zIndex: 10,
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '700',
    },
    mapContainer: {
        flex: 1,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.sm,
        borderRadius: 20,
        overflow: 'hidden',
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    infoBar: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: SPACING.sm,
    },
    infoItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    infoDivider: {
        width: 1,
        height: '80%',
        alignSelf: 'center',
    },
    refreshBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.lg,
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    refreshText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },
});

export default LocalizarScreen;
