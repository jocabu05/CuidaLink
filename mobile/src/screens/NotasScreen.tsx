import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import notasService, { Nota } from '../services/notasService';
import notificationService from '../services/notificationService';
import { notifyNuevaNotaCreated, onNotaLeida } from '../services/taskEventEmitter';

interface NotasScreenProps {
    role: 'cuidadora' | 'familiar';
}

const NotasScreen: React.FC<NotasScreenProps> = ({ role }) => {
    const { colors } = useTheme();
    const [notas, setNotas] = useState<Nota[]>([]);
    const [texto, setTexto] = useState('');
    const [prioridad, setPrioridad] = useState<'normal' | 'urgente'>('normal');
    const [refreshing, setRefreshing] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [viendoTodas, setViendoTodas] = useState(false);

    const cargarNotas = useCallback(async () => {
        const data = await notasService.getNotasRecientes(20);
        setNotas(data);
        setRefreshing(false);
    }, []);

    useEffect(() => { cargarNotas(); }, [cargarNotas]);

    useEffect(() => {
        if (role !== 'familiar') return;
        const unsubscribe = onNotaLeida((notaId: string) => {
            setNotas(prev => prev.filter(n => n.id !== notaId));
            Alert.alert('✅ Nota leída', 'La cuidadora ha leído tu nota.');
        });
        return () => unsubscribe();
    }, [role]);

    const enviarNota = async () => {
        if (!texto.trim()) return;
        setEnviando(true);
        await notasService.agregarNota(texto.trim(), 'familiar', prioridad);
        const titulo = prioridad === 'urgente' ? '🔴 NOTA URGENTE de la familia' : '📝 Nueva nota del familiar';
        await notificationService.notificarActividad(titulo, texto.trim());
        setTexto('');
        setPrioridad('normal');
        await cargarNotas();
        setEnviando(false);
    };

    const eliminar = (id: string) => {
        Alert.alert('Eliminar nota', '¿Seguro?', [
            { text: 'No', style: 'cancel' },
            { text: 'Sí', style: 'destructive', onPress: async () => { await notasService.eliminarNota(id); cargarNotas(); } },
        ]);
    };

    const formatFecha = (ts: string) => {
        const d = new Date(ts);
        const esHoy = d.toDateString() === new Date().toDateString();
        const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        return esHoy ? `Hoy ${hora}` : `${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} ${hora}`;
    };

    const notasFamiliar = notas.filter(n => n.autor === 'familiar');

    if (role === 'familiar') {
        return (
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: colors.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
                    <Text style={styles.headerTitle}>📝 Notas para Cuidadora</Text>
                    <Text style={styles.headerSubtitle}>Escribe instrucciones o avisos importantes</Text>
                </View>
                <View style={[styles.inputCard, { backgroundColor: colors.card, ...SHADOWS.medium }]}>
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Ej: Hoy tiene cita médica a las 16:00..."
                        placeholderTextColor={colors.textLight}
                        value={texto}
                        onChangeText={setTexto}
                        multiline
                        maxLength={300}
                    />
                    <View style={[styles.inputActions, { borderTopColor: colors.border }]}>
                        <View style={styles.prioridadRow}>
                            <TouchableOpacity
                                style={[styles.prioridadBtn, { backgroundColor: colors.inputBg }, prioridad === 'normal' && { backgroundColor: colors.infoBg }]}
                                onPress={() => setPrioridad('normal')}
                            >
                                <Text style={[styles.prioridadText, { color: colors.textSecondary }, prioridad === 'normal' && { color: colors.primary }]}>Normal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.prioridadBtn, { backgroundColor: colors.inputBg }, prioridad === 'urgente' && { backgroundColor: colors.dangerBg }]}
                                onPress={() => setPrioridad('urgente')}
                            >
                                <Text style={[styles.prioridadText, { color: colors.textSecondary }, prioridad === 'urgente' && { color: colors.danger }]}>🔴 Urgente</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={[styles.enviarBtn, { backgroundColor: colors.primary }, (!texto.trim() || enviando) && styles.enviarDisabled]}
                            onPress={enviarNota}
                            disabled={!texto.trim() || enviando}
                        >
                            <Text style={styles.enviarText}>{enviando ? 'Enviando...' : 'Enviar'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <ScrollView
                    style={styles.lista}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargarNotas(); }} colors={[colors.primary]} />}
                >
                    <Text style={[styles.listaTitle, { color: colors.text }]}>Mis notas enviadas</Text>
                    {notasFamiliar.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>📋</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay notas todavía.{'\n'}Escribe la primera arriba.</Text>
                        </View>
                    ) : (
                        notasFamiliar.map((nota) => (
                            <TouchableOpacity
                                key={nota.id}
                                style={[styles.notaCard, { backgroundColor: colors.card, borderLeftColor: colors.primary, ...SHADOWS.small }, nota.prioridad === 'urgente' && { borderLeftColor: colors.danger, backgroundColor: colors.dangerBg }, nota.leida && { opacity: 0.7 }]}
                                onLongPress={() => eliminar(nota.id)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.notaHeader}>
                                    <Text style={[styles.notaAutor, { color: colors.primary }]}>📤 Enviada</Text>
                                    <Text style={[styles.notaFecha, { color: colors.textLight }]}>{formatFecha(nota.timestamp)}</Text>
                                </View>
                                <Text style={[styles.notaTexto, { color: colors.text }]}>{nota.texto}</Text>
                                <View style={styles.notaFooter}>
                                    {nota.prioridad === 'urgente' && (
                                        <View style={[styles.badge, { backgroundColor: colors.dangerBg }]}>
                                            <Text style={[styles.badgeText, { color: colors.danger }]}>Urgente</Text>
                                        </View>
                                    )}
                                    {nota.leida && (
                                        <View style={[styles.badge, { backgroundColor: colors.success + '18' }]}>
                                            <Text style={[styles.badgeText, { color: colors.success }]}>✓ Leída</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
                <Text style={styles.headerTitle}>📝 Notas del Familiar</Text>
                <Text style={styles.headerSubtitle}>Lee las instrucciones y avisos</Text>
            </View>
            {!viendoTodas ? (
                <ScrollView
                    style={styles.lista}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargarNotas(); }} colors={[colors.primary]} />}
                >
                    <Text style={[styles.listaTitle, { color: colors.text }]}>Nota más reciente</Text>
                    {notasFamiliar.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>📋</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay notas del familiar.{'\n'}Aparecerán aquí cuando las cree.</Text>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.notaCard, styles.notaCardPrincipal, { backgroundColor: colors.card, borderLeftColor: colors.primary, ...SHADOWS.small }, notasFamiliar[0].prioridad === 'urgente' && { borderLeftColor: colors.danger, backgroundColor: colors.dangerBg }, notasFamiliar[0].leida && { opacity: 0.7 }]}
                                onPress={async () => { if (!notasFamiliar[0].leida) { await notasService.marcarLeida(notasFamiliar[0].id); cargarNotas(); } }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.notaHeader}>
                                    <Text style={[styles.notaAutor, { color: colors.primary }]}>👨‍👩‍👧 Familia</Text>
                                    <Text style={[styles.notaFecha, { color: colors.textLight }]}>{formatFecha(notasFamiliar[0].timestamp)}</Text>
                                </View>
                                <Text style={[styles.notaTexto, { color: colors.text }]}>{notasFamiliar[0].texto}</Text>
                                <View style={styles.notaFooter}>
                                    {notasFamiliar[0].prioridad === 'urgente' && (
                                        <View style={[styles.badge, { backgroundColor: colors.dangerBg }]}>
                                            <Text style={[styles.badgeText, { color: colors.danger }]}>Urgente</Text>
                                        </View>
                                    )}
                                    {!notasFamiliar[0].leida && (
                                        <View style={[styles.badge, { backgroundColor: colors.warningBg }]}>
                                            <Text style={[styles.badgeText, { color: colors.warningText }]}>Sin leer</Text>
                                        </View>
                                    )}
                                    {notasFamiliar[0].leida && (
                                        <Text style={[styles.leidaText, { color: colors.textLight }]}>✓ Leída</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                            {notasFamiliar.length > 1 && (
                                <TouchableOpacity
                                    style={[styles.verMasBtn, { backgroundColor: colors.infoBg, borderColor: colors.primary }]}
                                    onPress={() => setViendoTodas(true)}
                                >
                                    <Text style={[styles.verMasText, { color: colors.primary }]}>👀 Ver todas ({notasFamiliar.length})</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            ) : (
                <ScrollView
                    style={styles.lista}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargarNotas(); }} colors={[colors.primary]} />}
                >
                    <View style={styles.allNotasHeader}>
                        <Text style={[styles.listaTitle, { color: colors.text }]}>Todas las notas ({notasFamiliar.length})</Text>
                        <TouchableOpacity style={[styles.volverBtn, { backgroundColor: colors.inputBg }]} onPress={() => setViendoTodas(false)}>
                            <Text style={[styles.volverText, { color: colors.text }]}>← Volver</Text>
                        </TouchableOpacity>
                    </View>
                    {notasFamiliar.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>📋</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay notas del familiar.</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.accionesRow}>
                                <TouchableOpacity
                                    style={[styles.accionBtn, { backgroundColor: colors.infoBg, borderColor: colors.primary }]}
                                    onPress={() => {
                                        Alert.alert('Marcar como leídas', '¿Marcar todas las notas como leídas?', [
                                            { text: 'Cancelar', style: 'cancel' },
                                            { text: 'Marcar', onPress: async () => { await notasService.marcarTodasLeidasYEliminar(); cargarNotas(); } },
                                        ]);
                                    }}
                                >
                                    <Text style={[styles.accionBtnText, { color: colors.primary }]}>✓ Marcar leídas</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.accionBtn, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}
                                    onPress={() => {
                                        Alert.alert('Limpiar notas', '¿Eliminar todas las notas?', [
                                            { text: 'Cancelar', style: 'cancel' },
                                            { text: 'Eliminar todo', style: 'destructive', onPress: async () => {
                                                const todasNotas = await notasService.getNotas();
                                                for (const nota of todasNotas) { await notasService.eliminarNota(nota.id); }
                                                cargarNotas();
                                                setViendoTodas(false);
                                            }},
                                        ]);
                                    }}
                                >
                                    <Text style={[styles.accionBtnText, { color: colors.danger }]}>🗑️ Limpiar todo</Text>
                                </TouchableOpacity>
                            </View>
                            {notasFamiliar.map((nota) => (
                                <View key={nota.id} style={styles.notaItemRow}>
                                    <TouchableOpacity
                                        style={[styles.notaCard, styles.notaCardEnLista, { backgroundColor: colors.card, borderLeftColor: colors.primary, ...SHADOWS.small }, nota.prioridad === 'urgente' && { borderLeftColor: colors.danger, backgroundColor: colors.dangerBg }, nota.leida && { opacity: 0.7 }]}
                                        onLongPress={() => eliminar(nota.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.notaHeader}>
                                            <Text style={[styles.notaAutor, { color: colors.primary }]}>👨‍👩‍👧 Familia</Text>
                                            <Text style={[styles.notaFecha, { color: colors.textLight }]}>{formatFecha(nota.timestamp)}</Text>
                                        </View>
                                        <Text style={[styles.notaTexto, { color: colors.text }]}>{nota.texto}</Text>
                                        <View style={styles.notaFooter}>
                                            {nota.prioridad === 'urgente' && (
                                                <View style={[styles.badge, { backgroundColor: colors.dangerBg }]}>
                                                    <Text style={[styles.badgeText, { color: colors.danger }]}>Urgente</Text>
                                                </View>
                                            )}
                                            {nota.leida && <Text style={[styles.leidaText, { color: colors.textLight }]}>✓ Leída</Text>}
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.marcarBtn, { backgroundColor: colors.infoBg }]}
                                        onPress={async () => { if (!nota.leida) { await notasService.marcarLeida(nota.id); cargarNotas(); } }}
                                    >
                                        <Text style={[styles.marcarBtnText, { color: colors.primary }]}>{nota.leida ? '✓' : '○'}</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.md },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    inputCard: { marginHorizontal: SPACING.lg, marginTop: -8, borderRadius: 20, padding: SPACING.md },
    input: { fontSize: 15, minHeight: 60, maxHeight: 100, textAlignVertical: 'top', lineHeight: 22 },
    inputActions: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 8, borderTopWidth: 1, paddingTop: 10,
    },
    prioridadRow: { flexDirection: 'row', gap: 8 },
    prioridadBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
    prioridadText: { fontSize: 12, fontWeight: '600' },
    enviarBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16 },
    enviarDisabled: { opacity: 0.4 },
    enviarText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
    lista: { flex: 1, paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
    listaTitle: { fontSize: 16, fontWeight: '700', marginBottom: SPACING.sm },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyEmoji: { fontSize: 40, marginBottom: 12 },
    emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    notaCard: { borderRadius: 16, padding: SPACING.md, marginBottom: 10, borderLeftWidth: 4 },
    notaCardEnLista: { flex: 1 },
    notaCardPrincipal: { minHeight: 150 },
    notaHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 6,
    },
    notaAutor: { fontSize: 12, fontWeight: '700' },
    notaFecha: { fontSize: 11 },
    notaTexto: { fontSize: 15, lineHeight: 22 },
    notaFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    leidaText: { fontSize: 11, fontWeight: '600' },
    verMasBtn: {
        borderRadius: 16, paddingVertical: 14, marginVertical: 16,
        alignItems: 'center', borderWidth: 2,
    },
    verMasText: { fontSize: 15, fontWeight: '700' },
    allNotasHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: SPACING.md,
    },
    volverBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    volverText: { fontSize: 13, fontWeight: '600' },
    accionesRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    accionBtn: {
        flex: 1, paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: 12, alignItems: 'center', borderWidth: 1.5,
    },
    accionBtnText: { fontSize: 12, fontWeight: '700' },
    notaItemRow: { flexDirection: 'row', marginBottom: 10, gap: 8, alignItems: 'flex-start' },
    marcarBtn: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', marginTop: 4,
    },
    marcarBtnText: { fontSize: 18, fontWeight: '700' },
});

export default NotasScreen;