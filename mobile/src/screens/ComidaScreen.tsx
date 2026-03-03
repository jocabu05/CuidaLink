/**
 * ComidaScreen.tsx — Pantalla de registro de comida.
 *
 * Flujo:
 * 1. Abre cámara trasera para fotografiar el plato
 * 2. Captura foto en Base64
 * 3. Envía al backend como evento COMIDA
 * 4. Confirma registro exitoso
 *
 * La foto sirve como verificación visual de que se ha preparado/servido la comida.
 */
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import BigButton from '../components/BigButton';
import eventosService from '../services/eventosService';
import notificationService from '../services/notificationService';
import { notifyEventCreated } from '../services/taskEventEmitter';

interface ComidaScreenProps {
    route: { params: { abueloId: number } };
    onGoBack: () => void;
}

const ComidaScreen: React.FC<ComidaScreenProps> = ({ route, onGoBack }) => {
    const { colors } = useTheme();
    const { abueloId } = route.params;
    const [permission, requestPermission] = useCameraPermissions();
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    const takePhoto = async () => {
        if (!cameraRef.current) return;
        try {
            const photoData = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
            if (photoData) setPhoto(photoData.uri);
        } catch (error) { console.error('Error tomando foto:', error); Alert.alert('Error', 'No se pudo tomar la foto'); }
    };

    const handleConfirm = async () => {
        setLoading(true);
        try { await eventosService.registrarComida({ abueloId, fotoBase64: photo || undefined }); } catch (error) { console.error('Error API comida:', error); }
        try {
            const localEventStorage = require('../services/localEventStorage').default;
            await localEventStorage.guardarEvento({ tipo: 'COMIDA', verificado: true, descripcion: 'Comida servida correctamente', fotoBase64: photo || undefined });
        } catch (e) { console.error('Error guardando local:', e); }
        await notificationService.notificarActividad('COMIDA', 'Comida servida correctamente');
        notifyEventCreated('COMIDA');
        Alert.alert('Comida Registrada', 'Foto subida correctamente', [{ text: 'OK', onPress: onGoBack }]);
        setLoading(false);
    };

    if (!permission) return <View style={[styles.container, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Cargando...</Text></View>;

    if (!permission.granted) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.permissionCard}>
                    <Text style={styles.permissionIcon}>📷</Text>
                    <Text style={[styles.permissionTitle, { color: colors.text }]}>Permiso de Cámara</Text>
                    <Text style={[styles.permissionText, { color: colors.textSecondary }]}>Necesitamos la cámara para fotografiar la comida servida</Text>
                    <BigButton title="Permitir Cámara" onPress={requestPermission} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>Comida</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Fotografía el plato para confirmar</Text>
            </View>

            <View style={[styles.instructionCard, { backgroundColor: colors.warningBg }]}>
                <Text style={styles.instructionIcon}>🍽️</Text>
                <Text style={[styles.instructionText, { color: colors.warningText }]}>Toma una foto del plato servido para registrar la comida</Text>
            </View>

            <View style={styles.cameraContainer}>
                {photo ? (
                    <View style={styles.photoPreview}>
                        <Image source={{ uri: photo }} style={styles.previewImage} />
                        <View style={styles.photoOverlay}>
                            <Text style={styles.photoCheck}>✓</Text>
                            <Text style={styles.photoLabel}>Foto lista</Text>
                        </View>
                        <BigButton title="Repetir Foto" variant="warning" onPress={() => setPhoto(null)} style={styles.retakeButton} />
                    </View>
                ) : (
                    <CameraView ref={cameraRef} style={styles.camera} facing="back">
                        <View style={styles.cameraOverlay}>
                            <View style={styles.plateGuide}><Text style={styles.guideText}>🍽️ Encuadra el plato</Text></View>
                        </View>
                    </CameraView>
                )}
            </View>

            <View style={[styles.actions, { backgroundColor: colors.card }]}>
                {!photo ? (
                    <BigButton title="📸 FOTOGRAFIAR COMIDA" variant="primary" onPress={takePhoto} />
                ) : (
                    <BigButton title="✓ CONFIRMAR COMIDA SERVIDA" variant="success" onPress={handleConfirm} loading={loading} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.md },
    title: { fontSize: 22, fontWeight: 'bold' },
    subtitle: { fontSize: 14, marginTop: 4 },
    instructionCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginTop: SPACING.md, padding: SPACING.md, borderRadius: 12 },
    instructionIcon: { fontSize: 24, marginRight: SPACING.sm },
    instructionText: { flex: 1, fontSize: 13 },
    cameraContainer: { flex: 1, margin: SPACING.lg, borderRadius: 24, overflow: 'hidden', ...SHADOWS.medium },
    camera: { flex: 1 },
    cameraOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    plateGuide: { width: 260, height: 260, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed', borderRadius: 130, alignItems: 'center', justifyContent: 'center' },
    guideText: { color: 'white', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    photoPreview: { flex: 1, backgroundColor: 'black' },
    previewImage: { flex: 1, resizeMode: 'cover' },
    photoOverlay: { position: 'absolute', top: SPACING.md, right: SPACING.md, backgroundColor: 'rgba(76,175,80,0.9)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
    photoCheck: { fontSize: 20, color: 'white', fontWeight: 'bold', marginRight: 6 },
    photoLabel: { fontSize: 14, color: 'white', fontWeight: '600' },
    retakeButton: { position: 'absolute', bottom: SPACING.md, left: SPACING.md, right: SPACING.md },
    actions: { padding: SPACING.lg, ...SHADOWS.large },
    permissionCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
    permissionIcon: { fontSize: 64, marginBottom: SPACING.lg },
    permissionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: SPACING.sm },
    permissionText: { fontSize: 16, textAlign: 'center', marginBottom: SPACING.xl },
});

export default ComidaScreen;
