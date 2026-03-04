/**
 * ValorarScreen.tsx — Pantalla de valoración diaria.
 *
 * La cuidadora o familiar puntua el día con estrellas (1-5) y un comentario.
 * Se usa para generar estadísticas en los informes semanales.
 *
 * UI: Estrellas interactivas, campo de comentario, botón enviar.
 * Integra: ratingLocalService
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import ratingLocalService, { DayRating } from '../services/ratingLocalService';

const ValorarScreen: React.FC = () => {
    const { colors } = useTheme();
    const [estrellas, setEstrellas] = useState(0);
    const [comentario, setComentario] = useState('');
    const [ratingHoy, setRatingHoy] = useState<DayRating | null>(null);
    const [promedio, setPromedio] = useState(0);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const hoy = await ratingLocalService.getRatingHoy();
        const prom = await ratingLocalService.getPromedioSemanal();
        if (hoy) { setRatingHoy(hoy); setEstrellas(hoy.estrellas); setComentario(hoy.comentario); }
        setPromedio(prom);
    };

    const enviarValoracion = async () => {
        if (estrellas === 0) { Alert.alert('Error', 'Selecciona al menos 1 estrella'); return; }
        setEnviando(true);
        try {
            await ratingLocalService.valorarDia(estrellas, comentario);
            Alert.alert('Valoración Enviada', 'Gracias por tu valoración');
            await loadData();
        } catch { Alert.alert('Error', 'No se pudo guardar'); }
        setEnviando(false);
    };

    const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>Valorar Jornada</Text>
                <Text style={[styles.fecha, { color: colors.textSecondary }]}>{fecha}</Text>
            </View>

            {/* Promedio semanal */}
            <View style={[styles.promedioCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.promedioLabel, { color: colors.textSecondary }]}>Promedio semanal</Text>
                <View style={styles.promedioRow}>
                    <Text style={styles.promedioValue}>{promedio > 0 ? promedio.toFixed(1) : '-'}</Text>
                    <Text style={styles.promedioStars}>
                        {promedio > 0 ? '★'.repeat(Math.round(promedio)) + '☆'.repeat(5 - Math.round(promedio)) : '☆☆☆☆☆'}
                    </Text>
                </View>
            </View>

            {/* Stars */}
            <View style={[styles.starsCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.starsTitle, { color: colors.text }]}>
                    {ratingHoy ? 'Tu valoración de hoy' : '¿Cómo fue la jornada?'}
                </Text>
                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <TouchableOpacity key={n} onPress={() => setEstrellas(n)} activeOpacity={0.7}>
                            <Text style={[styles.star, n <= estrellas && styles.starActive]}>
                                {n <= estrellas ? '★' : '☆'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={[styles.starsHint, { color: colors.textSecondary }]}>
                    {estrellas === 0 ? 'Toca para valorar' :
                        estrellas <= 2 ? 'Necesita mejorar' :
                        estrellas <= 3 ? 'Normal' :
                        estrellas <= 4 ? 'Bien' : 'Excelente'}
                </Text>
            </View>

            {/* Comentario */}
            <View style={[styles.commentCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.commentLabel, { color: colors.text }]}>Comentario (opcional)</Text>
                <TextInput
                    style={[styles.commentInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                    value={comentario}
                    onChangeText={setComentario}
                    placeholder="Escribe un comentario sobre la jornada..."
                    placeholderTextColor={colors.textLight}
                    multiline
                    maxLength={200}
                    textAlignVertical="top"
                />
                <Text style={[styles.charCount, { color: colors.textLight }]}>{comentario.length}/200</Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: estrellas === 0 ? colors.border : colors.primary }]}
                onPress={enviarValoracion}
                disabled={estrellas === 0 || enviando}
                activeOpacity={0.8}
            >
                <Text style={styles.submitText}>
                    {ratingHoy ? 'Actualizar Valoración' : 'Enviar Valoración'}
                </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingBottom: 40 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.md },
    title: { fontSize: 22, fontWeight: '700' },
    fecha: { fontSize: 14, marginTop: 3, textTransform: 'capitalize' },
    promedioCard: { margin: SPACING.lg, borderRadius: 16, padding: SPACING.lg, ...SHADOWS.small },
    promedioLabel: { fontSize: 13, fontWeight: '600' },
    promedioRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
    promedioValue: { fontSize: 36, fontWeight: '800', color: '#FF8F00' },
    promedioStars: { fontSize: 22, color: '#FF8F00' },
    starsCard: { marginHorizontal: SPACING.lg, borderRadius: 16, padding: SPACING.lg, alignItems: 'center', ...SHADOWS.small },
    starsTitle: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.md },
    starsRow: { flexDirection: 'row', gap: 12 },
    star: { fontSize: 44, color: '#E0E0E0' },
    starActive: { color: '#FFB300' },
    starsHint: { fontSize: 14, marginTop: 12, fontWeight: '500' },
    commentCard: { margin: SPACING.lg, borderRadius: 16, padding: SPACING.lg, ...SHADOWS.small },
    commentLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    commentInput: { borderRadius: 12, padding: 12, fontSize: 15, minHeight: 80 },
    charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
    submitButton: { marginHorizontal: SPACING.lg, borderRadius: 16, padding: 16, alignItems: 'center', ...SHADOWS.medium },
    submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

export default React.memo(ValorarScreen);
