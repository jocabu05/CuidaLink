import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import api from '../services/api';

const REGISTERED_USERS_KEY = '@cuidalink_registered_familiares';

interface FamiliarRegisterScreenProps {
  onRegisterSuccess: () => void;
  onGoBack: () => void;
}

const PARENTESCO_OPTIONS = ['Hijo/a', 'Nieto/a', 'Hermano/a', 'Sobrino/a', 'Otro'];

const getPasswordStrength = (pw: string): { level: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Débil', color: '#F44336' };
  if (score <= 3) return { level: 2, label: 'Media', color: '#FF9800' };
  return { level: 3, label: 'Fuerte', color: '#4CAF50' };
};

export default function FamiliarRegisterScreen({ onRegisterSuccess, onGoBack }: FamiliarRegisterScreenProps) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [codigoInvitacion, setCodigoInvitacion] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const logoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const validateStep1 = (): boolean => {
    if (!nombre.trim()) { setError('Introduce tu nombre'); return false; }
    if (!email.trim() || !email.includes('@')) { setError('Introduce un email válido'); return false; }
    if (!telefono.trim() || telefono.length < 9) { setError('Introduce un teléfono válido'); return false; }
    if (!parentesco) { setError('Selecciona tu parentesco'); return false; }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (password.length < 4) { setError('La contraseña debe tener al menos 4 caracteres'); return false; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return false; }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep1()) setStep(2);
  };

  const handleRegister = async () => {
    setError('');
    if (!validateStep2()) return;
    setLoading(true);
    Keyboard.dismiss();
    try {
      await api.post('/auth/familiar/register', { nombre, email, telefono, parentesco, codigoInvitacion, password });
    } catch {
      // Backend no disponible — guardar usuario localmente para login offline
    }
    // Siempre guardar en local para que el login funcione sin backend
    try {
      const raw = await AsyncStorage.getItem(REGISTERED_USERS_KEY);
      const users: { email: string; password: string; nombre: string }[] = raw ? JSON.parse(raw) : [];
      const existing = users.findIndex((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (existing >= 0) {
        users[existing] = { email: email.trim().toLowerCase(), password, nombre };
      } else {
        users.push({ email: email.trim().toLowerCase(), password, nombre });
      }
      await AsyncStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Error guardando usuario local:', e);
    }
    setLoading(false);
    onRegisterSuccess();
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const inputRowStyle = [styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }];

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {[1, 2].map((s) => (
        <View key={s} style={styles.stepItemRow}>
          <View
            style={[styles.stepDot, {
              backgroundColor: step >= s ? colors.primary : colors.inputBg,
              borderColor: step >= s ? colors.primary : colors.border,
            }]}
          >
            {step > s ? (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            ) : (
              <Text style={[styles.stepDotText, { color: step >= s ? '#FFFFFF' : colors.textLight }]}>{s}</Text>
            )}
          </View>
          <Text
            style={[styles.stepLabel, {
              color: step >= s ? colors.primary : colors.textLight,
              fontWeight: step === s ? '700' : '400',
            }]}
          >
            {s === 1 ? 'Datos' : 'Seguridad'}
          </Text>
          {s < 2 && (
            <View style={[styles.stepLine, { backgroundColor: step > 1 ? colors.primary : colors.border }]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre completo</Text>
      <View style={inputRowStyle}>
        <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
        <TextInput style={[styles.input, { color: colors.text }]} value={nombre}
          onChangeText={(t) => { setNombre(t); setError(''); }} placeholder="Tu nombre" placeholderTextColor={colors.textLight} />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
      <View style={inputRowStyle}>
        <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
        <TextInput style={[styles.input, { color: colors.text }]} value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }} placeholder="tu@email.com"
          placeholderTextColor={colors.textLight} keyboardType="email-address" autoCapitalize="none" />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Teléfono</Text>
      <View style={inputRowStyle}>
        <Text style={[styles.countryCode, { color: colors.textSecondary }]}>🇪🇸 +34</Text>
        <TextInput style={[styles.input, { color: colors.text }]} value={telefono}
          onChangeText={(t) => { setTelefono(t); setError(''); }} placeholder="600 000 000"
          placeholderTextColor={colors.textLight} keyboardType="phone-pad" maxLength={9} />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Parentesco</Text>
      <View style={styles.chipRow}>
        {PARENTESCO_OPTIONS.map((opt) => {
          const active = parentesco === opt;
          return (
            <TouchableOpacity key={opt}
              style={[styles.chip, {
                backgroundColor: active ? colors.primary : colors.pillBg,
                borderColor: active ? colors.primary : colors.border,
              }]}
              onPress={() => { setParentesco(opt); setError(''); }}
            >
              <Text style={[styles.chipText, {
                color: active ? '#FFFFFF' : colors.pillText,
                fontWeight: active ? '700' : '500',
              }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Código de invitación (opcional)</Text>
      <View style={inputRowStyle}>
        <Ionicons name="key-outline" size={20} color={colors.textSecondary} />
        <TextInput style={[styles.input, { color: colors.text }]} value={codigoInvitacion}
          onChangeText={setCodigoInvitacion} placeholder="ABC123"
          placeholderTextColor={colors.textLight} autoCapitalize="characters" />
      </View>

      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleNext} activeOpacity={0.8}>
        <Text style={styles.primaryButtonText}>Siguiente</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={[styles.summaryCard, { backgroundColor: colors.infoBg, borderColor: colors.border }]}>
        <Ionicons name="person-circle" size={28} color={colors.infoText} />
        <View style={styles.summaryTextCol}>
          <Text style={[styles.summaryName, { color: colors.text }]}>{nombre}</Text>
          <Text style={[styles.summaryDetail, { color: colors.textSecondary }]}>{email} · {parentesco}</Text>
        </View>
        <TouchableOpacity onPress={() => setStep(1)}>
          <Ionicons name="pencil" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Contraseña</Text>
      <View style={inputRowStyle}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
        <TextInput style={[styles.input, { color: colors.text }]} value={password}
          onChangeText={(t) => { setPassword(t); setError(''); }} placeholder="Mínimo 4 caracteres"
          placeholderTextColor={colors.textLight} secureTextEntry={!showPassword}
          autoComplete="off" autoCorrect={false} />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {password.length > 0 && (
        <View style={styles.strengthRow} pointerEvents="none">
          <View style={styles.strengthTrack}>
            {[1, 2, 3].map((lvl) => (
              <View key={lvl} style={[styles.strengthSegment, {
                backgroundColor: lvl <= strength.level ? strength.color : colors.border,
              }]} />
            ))}
          </View>
          <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        </View>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Confirmar contraseña</Text>
      <View style={inputRowStyle}>
        <Ionicons name="lock-open-outline" size={20} color={colors.textSecondary} />
        <TextInput
          key="confirmPassword"
          style={[styles.input, { color: colors.text }]}
          value={confirmPassword}
          onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
          placeholder="Repite la contraseña"
          placeholderTextColor={colors.textLight}
          secureTextEntry={!showConfirm}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {confirmPassword.length > 0 && (
        <View style={styles.matchRow} pointerEvents="none">
          <Ionicons name={passwordsMatch ? 'checkmark-circle' : 'close-circle'} size={18}
            color={passwordsMatch ? colors.success : colors.danger} />
          <Text style={{ color: passwordsMatch ? colors.success : colors.danger, fontSize: 13, fontWeight: '500', marginLeft: 6 }}>
            {passwordsMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
          </Text>
        </View>
      )}

      <Text style={[styles.termsText, { color: colors.textLight }]}>
        Al registrarte, aceptas nuestros Términos de Servicio y Política de Privacidad.
      </Text>

      <View style={styles.buttonsRow}>
        <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={() => { setStep(1); setError(''); }}>
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary, flex: 1 }, loading && { opacity: 0.7 }]}
          onPress={handleRegister} disabled={loading} activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Registrarse</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.circle1, { backgroundColor: colors.primary + '15' }]} />
      <View style={[styles.circle2, { backgroundColor: colors.primary + '10' }]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }, SHADOWS.small]} onPress={onGoBack}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Animated.View style={[styles.logoContainer, { backgroundColor: colors.primary, transform: [{ scale: logoScale }] }]}>
            <Ionicons name="person-add" size={44} color="#FFFFFF" />
          </Animated.View>
          <Text style={[styles.appName, { color: colors.primary }]}>Crear Cuenta</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Registro familiar</Text>
          {renderStepIndicator()}
          <View style={[styles.card, { backgroundColor: colors.card }, SHADOWS.medium]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {step === 1 ? 'Tus datos' : 'Seguridad'}
            </Text>
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.dangerBg }]}>
                <Ionicons name="alert-circle" size={18} color={colors.dangerText} />
                <Text style={[styles.errorText, { color: colors.dangerText }]}>{error}</Text>
              </View>
            ) : null}
            {step === 1 ? renderStep1() : renderStep2()}
          </View>
          <View style={[styles.demoCard, { backgroundColor: colors.infoBg }]}>
            <Ionicons name="information-circle" size={20} color={colors.infoText} />
            <Text style={[styles.demoText, { color: colors.infoText }]}>Demo: el registro completa automáticamente</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1, alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl, paddingTop: 56,
  },
  circle1: {
    position: 'absolute', top: -80, right: -80,
    width: 250, height: 250, borderRadius: 125,
  },
  circle2: {
    position: 'absolute', bottom: -60, left: -60,
    width: 200, height: 200, borderRadius: 100,
  },
  backButton: {
    position: 'absolute', top: 0, left: 0,
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  logoContainer: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm,
  },
  appName: { fontSize: 28, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 14, marginBottom: SPACING.md },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginBottom: SPACING.lg, gap: 4,
  },
  stepItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotText: { fontSize: 13, fontWeight: '700' },
  stepLabel: { fontSize: 13 },
  stepLine: { width: 32, height: 2, borderRadius: 1, marginHorizontal: 4 },
  card: {
    width: '100%', borderRadius: 20,
    padding: SPACING.lg, marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 20, fontWeight: '700',
    textAlign: 'center', marginBottom: SPACING.lg,
  },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
    paddingHorizontal: SPACING.md, height: 52, marginBottom: SPACING.md, gap: 10,
  },
  input: { flex: 1, fontSize: 16, height: '100%', padding: 0 },
  countryCode: { fontSize: 15, fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13 },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
    padding: SPACING.sm + 4, marginBottom: SPACING.lg, gap: 10,
  },
  summaryTextCol: { flex: 1 },
  summaryName: { fontSize: 15, fontWeight: '700' },
  summaryDetail: { fontSize: 12, marginTop: 2 },
  strengthRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm, gap: 10,
  },
  strengthTrack: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSegment: { flex: 1, height: 5, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '600', minWidth: 40 },
  matchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  termsText: { fontSize: 12, textAlign: 'center', marginBottom: SPACING.md, lineHeight: 18 },
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: SPACING.sm, marginBottom: SPACING.md, gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '500' },
  buttonsRow: { flexDirection: 'row', gap: 10 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 16, gap: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: SPACING.md, gap: 6,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600' },
  demoCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: SPACING.sm + 2, gap: 8, width: '100%', marginBottom: SPACING.md,
  },
  demoText: { fontSize: 13, fontWeight: '500' },
});
