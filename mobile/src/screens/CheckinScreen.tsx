import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import BigButton from '../components/BigButton';
import locationService, { LocationData } from '../services/locationService';
import eventosService from '../services/eventosService';
import notificationService from '../services/notificationService';
import { notifyEventCreated } from '../services/taskEventEmitter';

interface CheckinScreenProps {
    route: { params: { abueloId: number; abueloNombre: string } };
    onGoBack: () => void;
}

const CheckinScreen: React.FC<CheckinScreenProps> = ({ route, onGoBack }) => {
    const { colors } = useTheme();
    const { abueloId, abueloNombre } = route.params;
    const [permission, requestPermission] = useCameraPermissions();
    const [photo, setPhoto] = useState<string | null>(null);
    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isWithinGeofence, setIsWithinGeofence] = useState<boolean | null>(null);
    const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
    const cameraRef = useRef<CameraView>(null);

    const homeCoords = { lat: 39.4619, lng: -0.3778 };

    useEffect(() => { getLocation(); }, []);

    const getLocation = async () => {
        const loc = await locationService.getCurrentLocation();
        if (loc) {
            setLocation(loc);
            setIsWithinGeofence(locationService.isWithinGeofence(loc.lat, loc.lng, homeCoords.lat, homeCoords.lng));
        }
    };

    const takeSelfie = async () => {
        if (!cameraRef.current) return;
        try {
            const photoData = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
            if (photoData) setPhoto(photoData.uri);
        } catch (error) {
            console.error('Error tomando foto:', error);
            Alert.alert('Error', 'No se pudo tomar la foto');
        }
    };

    const handleConfirmCheckin = async () => {
        if (!photo || !location) { Alert.alert('Error', 'Necesitas tomar una selfie y tener ubicación'); return; }
        setLoading(true);
        try { await eventosService.registrarCheckin({ abueloId, selfieBase64: photo, lat: location.lat, lng: location.lng }); } catch (error) { console.error('Error API checkin:', error); }
        try {
            const localEventStorage = require('../services/localEventStorage').default;
            await localEventStorage.guardarEvento({ tipo: 'LLEGADA', verificado: true, descripcion: 'Llegada verificada al domicilio', fotoBase64: photo, gpsLat: location.lat, gpsLng: location.lng });
            notifyEventCreated('LLEGADA');
        } catch (e) { console.error('Error guardando local:', e); }
        await notificationService.notificarActividad('LLEGADA', 'La cuidadora ha llegado');
        Alert.alert('Llegada Registrada', 'Foto y ubicación subidas correctamente', [{ text: 'OK', onPress: onGoBack }]);
        setLoading(false);
    };

    if (!permission) return <View style={[styles.container, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Cargando permisos...</Text></View>;

    if (!permission.granted) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.permissionCard}>
                    <Text style={styles.permissionIcon}>📷</Text>
                    <Text style={[styles.permissionTitle, { color: colors.text }]}>Permiso de Cámara</Text>
                    <Text style={[styles.permissionText, { color: colors.textSecondary }]}>Necesitamos acceso a la cámara para tomar la selfie de llegada</Text>
                    <BigButton title="Permitir Cámara" onPress={requestPermission} variant="primary" />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>Registro de Llegada</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Casa de {abueloNombre}</Text>
            </View>

            <View style={styles.cameraContainer}>
                {photo ? (
                    <View style={styles.photoPreview}>
                        <Image source={{ uri: photo }} style={styles.previewImage} />
                    </View>
                ) : (
                    <CameraView ref={cameraRef} style={styles.camera} facing={cameraFacing}>
                        <View style={styles.cameraOverlay}><View style={styles.faceGuide} /></View>
                        <TouchableOpacity style={styles.flipButton} onPress={() => setCameraFacing(prev => prev === 'front' ? 'back' : 'front')}>
                            <Text style={styles.flipText}>🔄</Text>
                        </TouchableOpacity>
                    </CameraView>
                )}
            </View>

            <View style={[styles.locationCard, { backgroundColor: colors.card }]}>
                <Text style={styles.locationIcon}>{isWithinGeofence === null ? '📍' : isWithinGeofence ? '✅' : '⚠️'}</Text>
                <View style={styles.locationInfo}>
                    <Text style={[styles.locationTitle, { color: colors.text }]}>
                        {isWithinGeofence === null ? 'Verificando ubicación...' : isWithinGeofence ? 'Ubicación verificada' : 'Fuera de la zona'}
                    </Text>
                    <Text style={[styles.locationAddress, { color: colors.textSecondary }]}>
                        {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Obteniendo...'}
                    </Text>
                </View>
            </View>

            <View style={[styles.actions, { backgroundColor: colors.card }]}>
                {!photo ? (
                    <BigButton title="📸 TOMAR SELFIE" variant="primary" onPress={takeSelfie} />
                ) : (
                    <>
                        <BigButton title="Repetir Foto" variant="warning" onPress={() => setPhoto(null)} style={styles.halfButton} />
                        <BigButton title="✓ Confirmar" variant="success" onPress={handleConfirmCheckin} loading={loading} style={styles.halfButton} />
                    </>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.md },
    title: { fontSize: 22, fontWeight: '700', letterSpacing: 0.2 },
    subtitle: { fontSize: 14, marginTop: 4 },
    cameraContainer: { flex: 1, margin: SPACING.lg, borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium },
    camera: { flex: 1 },
    cameraOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    faceGuide: { width: 200, height: 260, borderRadius: 130, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', borderStyle: 'dashed' },
    photoPreview: { flex: 1, backgroundColor: 'black' },
    previewImage: { flex: 1, resizeMode: 'cover' },
    locationCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, padding: SPACING.md, borderRadius: 12, ...SHADOWS.small },
    locationIcon: { fontSize: 28, marginRight: SPACING.md },
    locationInfo: { flex: 1 },
    locationTitle: { fontSize: 14, fontWeight: '600' },
    locationAddress: { fontSize: 12, marginTop: 2 },
    actions: { flexDirection: 'row', padding: SPACING.lg, gap: SPACING.md, ...SHADOWS.large },
    halfButton: { flex: 1 },
    permissionCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    permissionIcon: { fontSize: 64, marginBottom: SPACING.lg },
    permissionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: SPACING.sm },
    permissionText: { fontSize: 16, textAlign: 'center', marginBottom: SPACING.xl },
    flipButton: { position: 'absolute', bottom: 16, right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    flipText: { fontSize: 24 },
});

export default CheckinScreen;
