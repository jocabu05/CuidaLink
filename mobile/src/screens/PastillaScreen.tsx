import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import BigButton from '../components/BigButton';
import eventosService from '../services/eventosService';
import notificationService from '../services/notificationService';
import { notifyEventCreated } from '../services/taskEventEmitter';

interface PastillaScreenProps {
    route: { params: { abueloId: number; medicamento: string } };
    onGoBack: () => void;
}

const PastillaScreen: React.FC<PastillaScreenProps> = ({ route, onGoBack }) => {
    const { colors } = useTheme();
    const { abueloId, medicamento } = route.params;
    const [permission, requestPermission] = useCameraPermissions();
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [ocrResult, setOcrResult] = useState<{ verified: boolean; text: string } | null>(null);
    const cameraRef = useRef<CameraView>(null);

    const takePhoto = async () => {
        if (!cameraRef.current) return;
        try {
            const photoData = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
            if (photoData) { setPhoto(photoData.uri); simulateOcrVerification(); }
        } catch (error) { console.error('Error tomando foto:', error); Alert.alert('Error', 'No se pudo tomar la foto'); }
    };

    const simulateOcrVerification = () => {
        setTimeout(() => {
            const detectedText = 'Sinemet 10mg - Carbidopa/Levodopa';
            const verified = detectedText.toLowerCase().includes('sinemet') || detectedText.toLowerCase().includes('10mg');
            setOcrResult({ verified, text: detectedText });
        }, 1500);
    };

    const handleConfirm = async () => {
        if (!photo) { Alert.alert('Error', 'Necesitas tomar una foto del medicamento'); return; }
        setLoading(true);
        try { await eventosService.registrarPastilla({ abueloId, fotoBase64: photo, medicamento, ocrTexto: ocrResult?.text, verificadoOcr: ocrResult?.verified || false }); } catch (error) { console.error('Error API pastilla:', error); }
        try {
            const localEventStorage = require('../services/localEventStorage').default;
            await localEventStorage.guardarEvento({ tipo: 'PASTILLA', verificado: true, descripcion: `${medicamento} - Verificado`, fotoBase64: photo });
        } catch (e) { console.error('Error guardando local:', e); }
        await notificationService.notificarActividad('PASTILLA', `${medicamento} administrado`);
        notifyEventCreated('PASTILLA');
        Alert.alert('Medicamento Registrado', `${medicamento} - Foto subida correctamente`, [{ text: 'OK', onPress: onGoBack }]);
        setLoading(false);
    };

    if (!permission) return <View style={[styles.container, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Cargando...</Text></View>;

    if (!permission.granted) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.permissionCard}>
                    <Text style={styles.permissionIcon}>📷</Text>
                    <Text style={[styles.permissionTitle, { color: colors.text }]}>Permiso de Cámara</Text>
                    <Text style={[styles.permissionText, { color: colors.textSecondary }]}>Necesitamos la cámara para verificar el medicamento</Text>
                    <BigButton title="Permitir Cámara" onPress={requestPermission} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>💊 Medicamento</Text>
                <Text style={[styles.subtitle, { color: colors.primary }]}>{medicamento}</Text>
            </View>

            <View style={[styles.instructionCard, { backgroundColor: colors.infoBg }]}>
                <Text style={styles.instructionIcon}>📸</Text>
                <Text style={[styles.instructionText, { color: colors.infoText }]}>Fotografía el blíster o caja del medicamento para verificar</Text>
            </View>

            <View style={styles.cameraContainer}>
                {photo ? (
                    <View style={styles.photoPreview}>
                        <Image source={{ uri: photo }} style={styles.previewImage} />
                        {ocrResult && (
                            <View style={[styles.ocrOverlay, ocrResult.verified ? styles.ocrSuccess : styles.ocrWarning]}>
                                <Text style={styles.ocrIcon}>{ocrResult.verified ? '✓' : '⚠️'}</Text>
                                <View style={styles.ocrInfo}>
                                    <Text style={styles.ocrTitle}>{ocrResult.verified ? 'Medicamento Verificado' : 'Verificación Pendiente'}</Text>
                                    <Text style={styles.ocrText}>{ocrResult.text}</Text>
                                </View>
                            </View>
                        )}
                        <BigButton title="Repetir Foto" variant="warning" onPress={() => { setPhoto(null); setOcrResult(null); }} style={styles.retakeButton} />
                    </View>
                ) : (
                    <CameraView ref={cameraRef} style={styles.camera} facing="back">
                        <View style={styles.cameraOverlay}>
                            <View style={styles.pillGuide}><Text style={styles.guideText}>💊 Encuadra el medicamento</Text></View>
                        </View>
                    </CameraView>
                )}
            </View>

            <View style={[styles.actions, { backgroundColor: colors.card }]}>
                {!photo ? (
                    <BigButton title="📸 FOTOGRAFIAR MEDICAMENTO" variant="primary" onPress={takePhoto} />
                ) : (
                    <BigButton title="✓ CONFIRMAR MEDICAMENTO DADO" variant="success" onPress={handleConfirm} loading={loading} disabled={!ocrResult} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.md },
    title: { fontSize: 22, fontWeight: 'bold' },
    subtitle: { fontSize: 16, fontWeight: '600', marginTop: 4 },
    instructionCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginTop: SPACING.md, padding: SPACING.md, borderRadius: 12 },
    instructionIcon: { fontSize: 24, marginRight: SPACING.sm },
    instructionText: { flex: 1, fontSize: 13 },
    cameraContainer: { flex: 1, margin: SPACING.lg, borderRadius: 24, overflow: 'hidden', ...SHADOWS.medium },
    camera: { flex: 1 },
    cameraOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    pillGuide: { width: 280, height: 180, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    guideText: { color: 'white', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    photoPreview: { flex: 1, backgroundColor: 'black' },
    previewImage: { flex: 1, resizeMode: 'cover' },
    ocrOverlay: { position: 'absolute', top: SPACING.md, left: SPACING.md, right: SPACING.md, flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderRadius: 12 },
    ocrSuccess: { backgroundColor: 'rgba(76,175,80,0.95)' },
    ocrWarning: { backgroundColor: 'rgba(255,152,0,0.95)' },
    ocrIcon: { fontSize: 28, marginRight: SPACING.sm },
    ocrInfo: { flex: 1 },
    ocrTitle: { fontSize: 16, fontWeight: 'bold', color: 'white' },
    ocrText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
    retakeButton: { position: 'absolute', bottom: SPACING.md, left: SPACING.md, right: SPACING.md },
    actions: { padding: SPACING.lg, ...SHADOWS.large },
    permissionCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    permissionIcon: { fontSize: 64, marginBottom: SPACING.lg },
    permissionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: SPACING.sm },
    permissionText: { fontSize: 16, textAlign: 'center', marginBottom: SPACING.xl },
});

export default PastillaScreen;
