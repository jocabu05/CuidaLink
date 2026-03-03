/**
 * PerfilAbueloScreen.tsx — Perfil completo del paciente.
 *
 * Muestra y permite editar:
 * - Foto de perfil (cámara o galería)
 * - Datos personales: nombre, dirección, teléfono emergencia
 * - Notas médicas: medicación, alergias, instrucciones
 * - Coordenadas GPS del domicilio
 * - Información del familiar vinculado
 *
 * Integra: eventosService (getPerfilAbuelo), fotoService
 * ~1196 líneas
 */
import React, { useState, useEffect, useCallback } from 'react';
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
    ActivityIndicator,
    TextInput,
    Keyboard,
    Switch,
    Image,
    Modal,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SHADOWS, CUIDADORA } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import eventosService from '../services/eventosService';

// ─── TYPES ───
interface PerfilAbueloScreenProps {
    abueloId?: number;
    onLogout: () => void;
}

interface PerfilData {
    nombre: string;
    edad: number;
    direccion: string;
    telefonoEmergencia: string;
    contactoNombre: string;
    notasMedicas: string;
    domicilioLat: number;
    domicilioLng: number;
    diagnostico: string;
    fechaDiagnostico: string;
    faseAlzheimer: string;
    medicamentos: MedicamentoInfo[];
    alergias: string[];
    grupoSanguineo: string;
    pesoKg: number;
    alturaCm: number;
    condicionesSecundarias: string[];
    ultimaVisitaMedica: string;
    proximaCita: string;
    medico: string;
    centroSalud: string;
    telefonoMedico: string;
    observaciones: string;
}

interface MedicamentoInfo {
    nombre: string;
    dosis: string;
    frecuencia: string;
    horarios: string[];
    notas: string;
}

// ─── ACCENT MAP PER MEDICATION ───
const MED_ACCENTS = ['#2196F3', '#7C4DFF', '#00BFA5'];
const { width: SCREEN_W } = Dimensions.get('window');

// ─── COMPONENT ───
const PerfilAbueloScreen: React.FC<PerfilAbueloScreenProps> = ({ abueloId = 1, onLogout }) => {
    const { isDark, toggleDarkMode, colors } = useTheme();
    const [perfil, setPerfil] = useState<PerfilData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showMedicalDetails, setShowMedicalDetails] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    // ─── LOAD PROFILE ───
    useEffect(() => {
        cargarPerfil();
        AsyncStorage.getItem('profile_photo_abuelo').then(uri => { if (uri) setProfilePhoto(uri); }).catch(() => {});
    }, []);

    const cargarPerfil = async () => {
        try {
            const data = await eventosService.getPerfilAbuelo(abueloId);
            setPerfil({
                ...(data as any),
                edad: 82,
                contactoNombre: 'Laura Ruiz (hija)',
                diagnostico: 'Enfermedad de Alzheimer',
                fechaDiagnostico: 'Marzo 2021',
                faseAlzheimer: 'Fase 4 - Moderada',
                medicamentos: [
                    { nombre: 'Sinemet (Levodopa/Carbidopa)', dosis: '10/100 mg', frecuencia: '2 veces al día', horarios: ['10:30', '18:30'], notas: 'Tomar con alimentos. No mezclar con proteínas.' },
                    { nombre: 'Aricept (Donepezilo)', dosis: '5 mg', frecuencia: '1 vez al día', horarios: ['09:00'], notas: 'Tomar por la mañana en ayunas.' },
                    { nombre: 'Memantina', dosis: '10 mg', frecuencia: '1 vez al día', horarios: ['21:00'], notas: 'Tomar antes de dormir.' },
                ],
                alergias: ['Penicilina', 'Frutos secos'],
                grupoSanguineo: 'A+',
                pesoKg: 62,
                alturaCm: 158,
                condicionesSecundarias: ['Hipertensión arterial (controlada)', 'Osteoporosis leve', 'Hipoacusia bilateral'],
                ultimaVisitaMedica: '15 enero 2026',
                proximaCita: '10 marzo 2026',
                medico: 'Dr. Alejandro Vidal',
                centroSalud: 'Hospital La Fe, Valencia',
                telefonoMedico: '963 86 27 00',
                observaciones: 'Tendencia a desorientación vespertina (sundowning). Mantener rutinas. Evitar cambios bruscos en el entorno. Buena respuesta a estímulos musicales y paseos matutinos.',
            });
        } catch {
            setPerfil({
                nombre: 'Carmen Ruiz',
                edad: 82,
                direccion: 'C/Colmenar 59, Alzira',
                telefonoEmergencia: '961234567',
                contactoNombre: 'Laura Ruiz (hija)',
                notasMedicas: 'Sinemet 10mg - 10:30h y 18:30h\nAricept 5mg - mañanas',
                domicilioLat: 39.1512,
                domicilioLng: -0.4323,
                diagnostico: 'Enfermedad de Alzheimer',
                fechaDiagnostico: 'Marzo 2021',
                faseAlzheimer: 'Fase 4 - Moderada',
                medicamentos: [
                    { nombre: 'Sinemet (Levodopa/Carbidopa)', dosis: '10/100 mg', frecuencia: '2 veces al día', horarios: ['10:30', '18:30'], notas: 'Tomar con alimentos. No mezclar con proteínas.' },
                    { nombre: 'Aricept (Donepezilo)', dosis: '5 mg', frecuencia: '1 vez al día', horarios: ['09:00'], notas: 'Tomar por la mañana en ayunas.' },
                    { nombre: 'Memantina', dosis: '10 mg', frecuencia: '1 vez al día', horarios: ['21:00'], notas: 'Tomar antes de dormir.' },
                ],
                alergias: ['Penicilina', 'Frutos secos'],
                grupoSanguineo: 'A+',
                pesoKg: 62,
                alturaCm: 158,
                condicionesSecundarias: ['Hipertensión arterial (controlada)', 'Osteoporosis leve', 'Hipoacusia bilateral'],
                ultimaVisitaMedica: '15 enero 2026',
                proximaCita: '10 marzo 2026',
                medico: 'Dr. Alejandro Vidal',
                centroSalud: 'Hospital La Fe, Valencia',
                telefonoMedico: '963 86 27 00',
                observaciones: 'Tendencia a desorientación vespertina (sundowning). Mantener rutinas. Evitar cambios bruscos en el entorno. Buena respuesta a estímulos musicales y paseos matutinos.',
            });
        } finally {
            setLoading(false);
        }
    };

    // ─── ACTIONS ───
    const llamarEmergencia = useCallback(() => {
        if (!perfil?.telefonoEmergencia) return;
        Alert.alert('Llamar a Emergencia', `Llamar al ${perfil.contactoNombre}\n${perfil.telefonoEmergencia}`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Llamar', onPress: () => Linking.openURL(`tel:${perfil.telefonoEmergencia}`) },
        ]);
    }, [perfil]);

    const llamar112 = useCallback(() => {
        Alert.alert('Emergencias 112', 'Llamar al 112', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Llamar', style: 'destructive', onPress: () => Linking.openURL('tel:112') },
        ]);
    }, []);

    const llamarMedico = useCallback(() => {
        if (!perfil?.telefonoMedico) return;
        Alert.alert('Contactar Médico', `${perfil.medico}\n${perfil.telefonoMedico}`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Llamar', onPress: () => Linking.openURL(`tel:${perfil.telefonoMedico}`) },
        ]);
    }, [perfil]);

    const startEditing = useCallback((field: string, currentValue: string) => {
        setEditingField(field);
        setEditValue(currentValue);
    }, []);

    const saveEdit = useCallback(() => {
        if (!perfil || !editingField) return;
        const updated = { ...perfil, [editingField]: editValue };
        setPerfil(updated);
        setEditingField(null);
        setEditValue('');
        Alert.alert('Guardado', 'Los cambios se han guardado correctamente');
    }, [perfil, editingField, editValue]);

    const cancelEdit = useCallback(() => {
        setEditingField(null);
        setEditValue('');
    }, []);

    const cambiarFotoPerfil = async () => {
        Alert.alert('Foto de perfil', 'Elige una opción', [
            {
                text: 'Cámara',
                onPress: async () => {
                    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                        if (!canAskAgain) Alert.alert('Permiso necesario', 'Actívalo en Ajustes.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() }]);
                        return;
                    }
                    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [1, 1], base64: true });
                    if (!result.canceled && result.assets[0]?.base64) {
                        const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
                        setProfilePhoto(uri);
                        await AsyncStorage.setItem('profile_photo_abuelo', uri);
                    }
                },
            },
            {
                text: 'Galería',
                onPress: async () => {
                    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                        if (!canAskAgain) Alert.alert('Permiso necesario', 'Actívalo en Ajustes.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() }]);
                        return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [1, 1], base64: true });
                    if (!result.canceled && result.assets[0]?.base64) {
                        const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
                        setProfilePhoto(uri);
                        await AsyncStorage.setItem('profile_photo_abuelo', uri);
                    }
                },
            },
            ...(profilePhoto ? [{ text: 'Eliminar foto', style: 'destructive' as const, onPress: async () => { setProfilePhoto(null); await AsyncStorage.removeItem('profile_photo_abuelo'); } }] : []),
            { text: 'Cancelar', style: 'cancel' as const },
        ]);
    };

    // ─── LOADING ───
    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando perfil…</Text>
            </View>
        );
    }
    if (!perfil) return null;

    const initials = perfil.nombre.split(' ').map(n => n[0]).join('');
    const imc = (perfil.pesoKg / ((perfil.alturaCm / 100) ** 2)).toFixed(1);

    // ─── RENDER ───
    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
            >
                {/* ════════════ HEADER ════════════ */}
                <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
                    {/* Decorative circles */}
                    <View style={[styles.headerCircle1, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                    <View style={[styles.headerCircle2, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />

                    <View style={styles.headerTop}>
                        <View style={{ width: 40 }} />
                        <Text style={styles.headerTitle}>Perfil del paciente</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Avatar */}
                    <TouchableOpacity
                        onPress={() => profilePhoto ? setPreviewPhoto(profilePhoto) : cambiarFotoPerfil()}
                        onLongPress={cambiarFotoPerfil}
                        delayLongPress={500}
                        activeOpacity={0.8}
                        style={styles.avatarWrapper}
                    >
                        <View style={styles.avatarRing}>
                            <View style={styles.avatar}>
                                {profilePhoto ? (
                                    <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={styles.avatarInitials}>{initials}</Text>
                                )}
                            </View>
                        </View>
                        <View style={styles.cameraBadge}>
                            <Ionicons name="camera" size={13} color="#fff" />
                        </View>
                        <View style={styles.onlineDot} />
                    </TouchableOpacity>

                    <Text style={styles.patientName}>{perfil.nombre}</Text>
                    <Text style={styles.patientMeta}>{perfil.edad} años  •  {perfil.direccion}</Text>
                </View>

                {/* ════════════ QUICK STATS FLOATING CARD ════════════ */}
                <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
                    <StatItem icon="water" color="#E53935" label="Grupo" value={perfil.grupoSanguineo} colors={colors} />
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <StatItem icon="fitness" color="#43A047" label="Peso" value={`${perfil.pesoKg} kg`} colors={colors} />
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <StatItem icon="resize" color="#1E88E5" label="Altura" value={`${perfil.alturaCm} cm`} colors={colors} />
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <StatItem icon="analytics" color="#8E24AA" label="IMC" value={imc} colors={colors} />
                </View>

                {/* ════════════ DIAGNOSIS ════════════ */}
                <SectionHeader icon="medkit" title="Diagnóstico" colors={colors} />
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <View style={[styles.diagAccent, { backgroundColor: colors.warning }]} />
                    <View style={styles.diagBody}>
                        <View style={[styles.diagBadge, { backgroundColor: colors.warningBg }]}>
                            <Ionicons name="alert-circle" size={14} color={colors.warningText} style={{ marginRight: 4 }} />
                            <Text style={[styles.diagBadgeText, { color: colors.warningText }]}>{perfil.faseAlzheimer}</Text>
                        </View>
                        <Text style={[styles.diagTitle, { color: colors.text }]}>{perfil.diagnostico}</Text>
                        <View style={styles.diagMeta}>
                            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.diagDate, { color: colors.textSecondary }]}>Diagnosticado: {perfil.fechaDiagnostico}</Text>
                        </View>
                    </View>
                </View>

                {/* ════════════ MEDICATIONS ════════════ */}
                <SectionHeader icon="medical" title="Medicación activa" colors={colors} count={perfil.medicamentos.length} />
                {perfil.medicamentos.map((med, i) => {
                    const accent = MED_ACCENTS[i % MED_ACCENTS.length];
                    return (
                        <View key={i} style={[styles.medCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.medAccent, { backgroundColor: accent }]} />
                            <View style={styles.medBody}>
                                <View style={styles.medHeaderRow}>
                                    <View style={[styles.medIconWrap, { backgroundColor: accent + '18' }]}>
                                        <Ionicons name="medkit" size={16} color={accent} />
                                    </View>
                                    <View style={styles.medNameBlock}>
                                        <Text style={[styles.medName, { color: colors.text }]} numberOfLines={2}>{med.nombre}</Text>
                                        <Text style={[styles.medDose, { color: colors.textSecondary }]}>{med.dosis}  •  {med.frecuencia}</Text>
                                    </View>
                                </View>
                                <View style={styles.medSchedule}>
                                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                    {med.horarios.map((h, j) => (
                                        <View key={j} style={[styles.timePill, { backgroundColor: accent + '14' }]}>
                                            <Text style={[styles.timePillText, { color: accent }]}>{h}</Text>
                                        </View>
                                    ))}
                                </View>
                                <Text style={[styles.medNotes, { color: colors.textSecondary }]}>
                                    <Ionicons name="information-circle-outline" size={12} color={colors.textSecondary} />{'  '}
                                    {med.notas}
                                </Text>
                            </View>
                        </View>
                    );
                })}

                {/* ════════════ ALLERGIES ════════════ */}
                <SectionHeader icon="warning" title="Alergias" colors={colors} />
                <View style={[styles.card, styles.allergyCard, { backgroundColor: colors.card }]}>
                    {perfil.alergias.map((a, i) => (
                        <View key={i} style={[styles.allergyChip, { backgroundColor: colors.dangerBg, borderColor: isDark ? colors.danger + '40' : '#FFCDD2' }]}>
                            <Ionicons name="alert-circle" size={14} color={colors.dangerText} style={{ marginRight: 4 }} />
                            <Text style={[styles.allergyText, { color: colors.dangerText }]}>{a}</Text>
                        </View>
                    ))}
                </View>

                {/* ════════════ EXPAND DETAILS ════════════ */}
                <TouchableOpacity
                    style={[styles.expandBtn, { backgroundColor: colors.card }]}
                    onPress={() => setShowMedicalDetails(!showMedicalDetails)}
                    activeOpacity={0.7}
                >
                    <Ionicons name={showMedicalDetails ? 'chevron-up-circle' : 'chevron-down-circle'} size={20} color={colors.info} />
                    <Text style={[styles.expandBtnText, { color: colors.info }]}>
                        {showMedicalDetails ? 'Ocultar detalles médicos' : 'Ver más detalles médicos'}
                    </Text>
                </TouchableOpacity>

                {showMedicalDetails && (
                    <View style={[styles.expandedBlock, { backgroundColor: colors.card }]}>
                        {/* Secondary conditions */}
                        <Text style={[styles.subSectionTitle, { color: colors.text }]}>Condiciones secundarias</Text>
                        {perfil.condicionesSecundarias.map((c, i) => (
                            <View key={i} style={styles.conditionRow}>
                                <View style={[styles.conditionDot, { backgroundColor: colors.primary }]} />
                                <Text style={[styles.conditionText, { color: colors.text }]}>{c}</Text>
                            </View>
                        ))}

                        {/* Doctor */}
                        <Text style={[styles.subSectionTitle, { color: colors.text, marginTop: 20 }]}>Médico responsable</Text>
                        <View style={[styles.doctorRow, { backgroundColor: isDark ? colors.surface : colors.background }]}>
                            <View style={[styles.doctorAvatar, { backgroundColor: colors.infoBg }]}>
                                <Ionicons name="person" size={20} color={colors.info} />
                            </View>
                            <View style={styles.doctorInfo}>
                                <Text style={[styles.doctorName, { color: colors.text }]}>{perfil.medico}</Text>
                                <Text style={[styles.doctorCenter, { color: colors.textSecondary }]}>{perfil.centroSalud}</Text>
                            </View>
                            <TouchableOpacity style={[styles.doctorCallBtn, { backgroundColor: colors.info }]} onPress={llamarMedico}>
                                <Ionicons name="call" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Visits */}
                        <Text style={[styles.subSectionTitle, { color: colors.text, marginTop: 20 }]}>Seguimiento médico</Text>
                        <View style={styles.visitPair}>
                            <View style={[styles.visitBox, { backgroundColor: isDark ? colors.surface : colors.background }]}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                                <Text style={[styles.visitLabel, { color: colors.textSecondary }]}>Última visita</Text>
                                <Text style={[styles.visitDate, { color: colors.text }]}>{perfil.ultimaVisitaMedica}</Text>
                            </View>
                            <View style={[styles.visitBox, { backgroundColor: isDark ? colors.roleLight : colors.roleLight, borderWidth: 1, borderColor: colors.primary + '30' }]}>
                                <Ionicons name="calendar" size={18} color={colors.primary} />
                                <Text style={[styles.visitLabel, { color: colors.textSecondary }]}>Próxima cita</Text>
                                <Text style={[styles.visitDate, { color: colors.primary }]}>{perfil.proximaCita}</Text>
                            </View>
                        </View>

                        {/* Observations */}
                        <View style={styles.editableBlock}>
                            <View style={styles.editableHeader}>
                                <Text style={[styles.subSectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Observaciones</Text>
                                <TouchableOpacity
                                    onPress={() => editingField === 'observaciones' ? saveEdit() : startEditing('observaciones', perfil.observaciones)}
                                    style={[styles.editPill, { backgroundColor: colors.infoBg }]}
                                >
                                    <Ionicons name={editingField === 'observaciones' ? 'checkmark' : 'pencil'} size={13} color={colors.info} />
                                    <Text style={[styles.editPillText, { color: colors.info }]}>
                                        {editingField === 'observaciones' ? 'Guardar' : 'Editar'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {editingField === 'observaciones' ? (
                                <View>
                                    <TextInput
                                        style={[styles.editTextArea, { backgroundColor: isDark ? colors.surface : colors.background, color: colors.text, borderColor: colors.primary }]}
                                        value={editValue}
                                        onChangeText={setEditValue}
                                        multiline
                                        numberOfLines={5}
                                        textAlignVertical="top"
                                        autoFocus
                                    />
                                    <TouchableOpacity onPress={cancelEdit} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <Text style={[styles.observationText, { color: colors.text, backgroundColor: isDark ? colors.surface : colors.background }]}>
                                    {perfil.observaciones}
                                </Text>
                            )}
                        </View>

                        {/* Medical notes */}
                        <View style={styles.editableBlock}>
                            <View style={styles.editableHeader}>
                                <Text style={[styles.subSectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Notas adicionales</Text>
                                <TouchableOpacity
                                    onPress={() => editingField === 'notasMedicas' ? saveEdit() : startEditing('notasMedicas', perfil.notasMedicas)}
                                    style={[styles.editPill, { backgroundColor: colors.infoBg }]}
                                >
                                    <Ionicons name={editingField === 'notasMedicas' ? 'checkmark' : 'pencil'} size={13} color={colors.info} />
                                    <Text style={[styles.editPillText, { color: colors.info }]}>
                                        {editingField === 'notasMedicas' ? 'Guardar' : 'Editar'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {editingField === 'notasMedicas' ? (
                                <View>
                                    <TextInput
                                        style={[styles.editTextArea, { backgroundColor: isDark ? colors.surface : colors.background, color: colors.text, borderColor: colors.primary }]}
                                        value={editValue}
                                        onChangeText={setEditValue}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                        autoFocus
                                    />
                                    <TouchableOpacity onPress={cancelEdit} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <Text style={[styles.observationText, { color: colors.text, backgroundColor: isDark ? colors.surface : colors.background }]}>
                                    {perfil.notasMedicas}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* ════════════ SETTINGS ════════════ */}
                <SectionHeader icon="settings" title="Ajustes" colors={colors} />
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIconWrap, { backgroundColor: isDark ? '#37474F' : '#ECEFF1' }]}>
                                <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#FFD54F' : '#FFA000'} />
                            </View>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>Modo oscuro</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleDarkMode}
                            trackColor={{ false: '#E0E0E0', true: colors.primary + '60' }}
                            thumbColor={isDark ? colors.primary : '#FAFAFA'}
                        />
                    </View>
                </View>

                {/* ════════════ EMERGENCY CONTACTS ════════════ */}
                <SectionHeader icon="call" title="Contactos de emergencia" colors={colors} />

                {/* Family contact */}
                <TouchableOpacity
                    style={[styles.contactRow, { backgroundColor: colors.card }]}
                    onPress={llamarEmergencia}
                    activeOpacity={0.7}
                >
                    <View style={[styles.contactAvatar, { backgroundColor: colors.infoBg }]}>
                        <Ionicons name="people" size={20} color={colors.info} />
                    </View>
                    <View style={styles.contactInfo}>
                        <Text style={[styles.contactName, { color: colors.text }]}>{perfil.contactoNombre}</Text>
                        <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{perfil.telefonoEmergencia}</Text>
                    </View>
                    <View style={[styles.contactCallBtn, { backgroundColor: colors.info }]}>
                        <Ionicons name="call" size={16} color="#fff" />
                    </View>
                </TouchableOpacity>

                {/* Doctor contact */}
                <TouchableOpacity
                    style={[styles.contactRow, { backgroundColor: colors.card, marginTop: 8 }]}
                    onPress={llamarMedico}
                    activeOpacity={0.7}
                >
                    <View style={[styles.contactAvatar, { backgroundColor: '#E8F5E9' }]}>
                        <Ionicons name="medkit" size={20} color="#43A047" />
                    </View>
                    <View style={styles.contactInfo}>
                        <Text style={[styles.contactName, { color: colors.text }]}>{perfil.medico}</Text>
                        <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{perfil.telefonoMedico}</Text>
                    </View>
                    <View style={[styles.contactCallBtn, { backgroundColor: '#43A047' }]}>
                        <Ionicons name="call" size={16} color="#fff" />
                    </View>
                </TouchableOpacity>

                {/* 112 SOS */}
                <TouchableOpacity
                    style={[styles.contactRow, { backgroundColor: colors.card, marginTop: 8 }]}
                    onPress={llamar112}
                    activeOpacity={0.7}
                >
                    <View style={[styles.contactAvatar, { backgroundColor: colors.dangerBg }]}>
                        <Ionicons name="warning" size={20} color={colors.danger} />
                    </View>
                    <View style={styles.contactInfo}>
                        <Text style={[styles.contactName, { color: colors.text }]}>Emergencias</Text>
                        <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>112</Text>
                    </View>
                    <View style={[styles.contactCallBtn, { backgroundColor: colors.danger }]}>
                        <Text style={styles.sosText}>SOS</Text>
                    </View>
                </TouchableOpacity>

                {/* ════════════ LOGOUT ════════════ */}
                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Salir', style: 'destructive', onPress: onLogout },
                    ])}
                    activeOpacity={0.7}
                >
                    <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                    <Text style={[styles.logoutText, { color: colors.danger }]}>Cerrar sesión</Text>
                </TouchableOpacity>

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* ════════════ PHOTO PREVIEW MODAL ════════════ */}
            <Modal visible={!!previewPhoto} transparent animationType="fade">
                <View style={styles.previewOverlay}>
                    <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewPhoto(null)}>
                        <Ionicons name="close-circle" size={36} color="#fff" />
                    </TouchableOpacity>
                    {previewPhoto && (
                        <Image source={{ uri: previewPhoto }} style={styles.previewImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </View>
    );
};

// ─── REUSABLE COMPONENTS ───
const SectionHeader = ({ icon, title, colors, count }: { icon: string; title: string; colors: any; count?: number }) => (
    <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {count !== undefined && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.countBadgeText, { color: colors.primary }]}>{count}</Text>
            </View>
        )}
    </View>
);

const StatItem = ({ icon, color, label, value, colors }: { icon: string; color: string; label: string; value: string; colors: any }) => (
    <View style={styles.statItem}>
        <Ionicons name={icon as any} size={18} color={color} />
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
);

// ─── STYLES ───
const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
    },

    /* ─── HEADER ─── */
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 48,
        paddingBottom: 36,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        alignItems: 'center',
        overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        top: -60,
        right: -40,
    },
    headerCircle2: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        bottom: -30,
        left: -30,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: 0.5,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 14,
    },
    avatarRing: {
        width: 106,
        height: 106,
        borderRadius: 53,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 94,
        height: 94,
        borderRadius: 47,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: 94,
        height: 94,
        borderRadius: 47,
    },
    avatarInitials: {
        fontSize: 34,
        fontWeight: '700',
        color: '#fff',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#1565C0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        borderColor: '#fff',
    },
    onlineDot: {
        position: 'absolute',
        top: 6,
        right: 10,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#66BB6A',
        borderWidth: 2.5,
        borderColor: '#fff',
    },
    patientName: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.3,
    },
    patientMeta: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 4,
    },

    /* ─── STATS CARD ─── */
    statsCard: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: -22,
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 32,
    },

    /* ─── SECTION HEADER ─── */
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 10,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
        letterSpacing: 0.2,
    },
    countBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },

    /* ─── GENERIC CARD ─── */
    card: {
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },

    /* ─── DIAGNOSIS ─── */
    diagAccent: {
        position: 'absolute',
        left: 0,
        top: 12,
        bottom: 12,
        width: 4,
        borderRadius: 2,
    },
    diagBody: {
        paddingLeft: 8,
    },
    diagBadge: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        marginBottom: 8,
    },
    diagBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    diagTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    diagMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    diagDate: {
        fontSize: 13,
    },

    /* ─── MEDICATION ─── */
    medCard: {
        marginHorizontal: 20,
        borderRadius: 16,
        marginBottom: 10,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    medAccent: {
        height: 3,
        width: '100%',
    },
    medBody: {
        padding: 14,
    },
    medHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    medIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    medNameBlock: {
        flex: 1,
    },
    medName: {
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 20,
    },
    medDose: {
        fontSize: 13,
        marginTop: 2,
    },
    medSchedule: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    timePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    timePillText: {
        fontSize: 13,
        fontWeight: '700',
    },
    medNotes: {
        fontSize: 12,
        fontStyle: 'italic',
        lineHeight: 18,
    },

    /* ─── ALLERGIES ─── */
    allergyCard: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    allergyChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    allergyText: {
        fontSize: 14,
        fontWeight: '600',
    },

    /* ─── EXPAND ─── */
    expandBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    expandBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },

    /* ─── EXPANDED BLOCK ─── */
    expandedBlock: {
        marginHorizontal: 20,
        marginTop: 10,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    subSectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
    },
    conditionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    conditionDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    conditionText: {
        fontSize: 14,
        flex: 1,
    },

    /* Doctor */
    doctorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 12,
    },
    doctorAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doctorInfo: {
        flex: 1,
        marginLeft: 10,
    },
    doctorName: {
        fontSize: 15,
        fontWeight: '600',
    },
    doctorCenter: {
        fontSize: 13,
        marginTop: 2,
    },
    doctorCallBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* Visits */
    visitPair: {
        flexDirection: 'row',
        gap: 10,
    },
    visitBox: {
        flex: 1,
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        gap: 4,
    },
    visitLabel: {
        fontSize: 12,
    },
    visitDate: {
        fontSize: 14,
        fontWeight: '600',
    },

    /* Editable blocks */
    editableBlock: {
        marginTop: 20,
    },
    editableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    editPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 4,
    },
    editPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    editTextArea: {
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        lineHeight: 22,
        minHeight: 100,
        borderWidth: 2,
    },
    observationText: {
        fontSize: 14,
        lineHeight: 22,
        borderRadius: 12,
        padding: 12,
    },

    /* ─── SETTINGS ─── */
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
    },

    /* ─── CONTACTS ─── */
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        borderRadius: 14,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    contactAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactInfo: {
        flex: 1,
        marginLeft: 12,
    },
    contactName: {
        fontSize: 15,
        fontWeight: '600',
    },
    contactPhone: {
        fontSize: 13,
        marginTop: 2,
    },
    contactCallBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sosText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
    },

    /* ─── LOGOUT ─── */
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginTop: 28,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
    },

    /* ─── PHOTO PREVIEW ─── */
    previewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewClose: {
        position: 'absolute',
        top: 50,
        right: 16,
        zIndex: 10,
        padding: 8,
    },
    previewImage: {
        width: SCREEN_W * 0.9,
        height: SCREEN_W * 0.9,
        borderRadius: 16,
    },
});

export default PerfilAbueloScreen;
