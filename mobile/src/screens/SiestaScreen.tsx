/**
 * SiestaScreen.tsx — Pantalla de registro de siesta/descanso.
 *
 * Flujo:
 * 1. Botón grande para registrar inicio de siesta
 * 2. Timer visual que muestra duración
 * 3. Registra evento SIESTA con la duración total
 *
 * No requiere foto ni GPS, solo el registro temporal.
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import BigButton from '../components/BigButton';
import notificationService from '../services/notificationService';
import { notifyEventCreated } from '../services/taskEventEmitter';

interface SiestaScreenProps {
    route: { params: { abueloId: number } };
    onGoBack: () => void;
}

const SiestaScreen: React.FC<SiestaScreenProps> = ({ route, onGoBack }) => {
    const { colors } = useTheme();
    const { abueloId } = route.params;
    const [enCurso, setEnCurso] = useState(false);
    const [segundos, setSegundos] = useState(0);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (enCurso) {
            intervalRef.current = setInterval(() => setSegundos(s => s + 1), 1000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [enCurso]);

    const formatTime = (totalSeg: number) => {
        const h = Math.floor(totalSeg / 3600);
        const m = Math.floor((totalSeg % 3600) / 60);
        const s = totalSeg % 60;
        if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const iniciarSiesta = () => { setEnCurso(true); setSegundos(0); };

    const finalizarSiesta = async () => {
        setEnCurso(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setLoading(true);
        const duracionMin = Math.round(segundos / 60);

        try {
            const localEventStorage = require('../services/localEventStorage').default;
            await localEventStorage.guardarEvento({
                tipo: 'SIESTA', verificado: true, descripcion: `Siesta de ${duracionMin} minutos`,
            });
        } catch (e) { console.error('Error guardando local:', e); }

        await notificationService.notificarActividad('SIESTA', `Siesta finalizada: ${duracionMin} minutos`);
        notifyEventCreated('SIESTA');
        Alert.alert('😴 Siesta Registrada', `Duración: ${formatTime(segundos)}`, [{ text: 'OK', onPress: onGoBack }]);
        setLoading(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>Siesta</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Registra el descanso del paciente</Text>
            </View>

            <View style={styles.timerContainer}>
                <View style={[styles.timerCircle, { backgroundColor: colors.success + '15', borderColor: colors.success + '60' }]}>
                    <Text style={styles.timerEmoji}>{enCurso ? '😴' : '🛏️'}</Text>
                    <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(segundos)}</Text>
                    <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
                        {enCurso ? 'Descansando...' : 'Listo para iniciar'}
                    </Text>
                </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.warningBg }]}>
                <Text style={styles.infoIcon}>💡</Text>
                <Text style={[styles.infoText, { color: colors.warningText }]}>
                    {enCurso ? 'La familia será notificada cuando finalice la siesta' : 'Pulsa iniciar cuando el paciente comience a descansar'}
                </Text>
            </View>

            <View style={[styles.actions, { backgroundColor: colors.card }]}>
                {!enCurso ? (
                    <BigButton title="INICIAR SIESTA" variant="primary" onPress={iniciarSiesta} />
                ) : (
                    <BigButton title="FINALIZAR SIESTA" variant="success" onPress={finalizarSiesta} loading={loading} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.md },
    title: { fontSize: 22, fontWeight: '700' },
    subtitle: { fontSize: 14, marginTop: 4 },
    timerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    timerCircle: {
        width: 240, height: 240, borderRadius: 120,
        alignItems: 'center', justifyContent: 'center', borderWidth: 4, ...SHADOWS.large,
    },
    timerEmoji: { fontSize: 48, marginBottom: 8 },
    timerText: { fontSize: 42, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
    timerLabel: { fontSize: 14, marginTop: 4 },
    infoCard: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: SPACING.lg, marginBottom: SPACING.md, padding: SPACING.md, borderRadius: 12,
    },
    infoIcon: { fontSize: 24, marginRight: SPACING.sm },
    infoText: { flex: 1, fontSize: 13 },
    actions: { padding: SPACING.lg, ...SHADOWS.large },
});

export default SiestaScreen;
