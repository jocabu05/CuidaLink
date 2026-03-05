/**
 * LoginScreen.tsx — Pantalla de login para CUIDADORAS.
 *
 * Autenticación: teléfono + PIN de 4 dígitos.
 * El PIN se introduce con 4 inputs individuales (auto-focus entre ellos).
 * Tras login exitoso, guarda el JWT en AsyncStorage y navega al Dashboard.
 *
 * Características UI:
 * - Logo animado con gradiente
 * - Inputs con estilo moderno y feedback visual
 * - Botón "Olvidaste tu PIN?" (placeholder)
 * - Soporta modo oscuro
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated, Keyboard, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import authService from '../services/authService';

/* ───────── types ───────── */
interface LoginScreenProps {
  onLoginSuccess: () => void;
  onGoBack?: () => void;
}

const DEMO_USERS = [
  { phone: '600111222', pin: '1234', name: 'María García' },
];

/* ═══════════════════════════════════════════ */
export default function LoginScreen({ onLoginSuccess, onGoBack }: LoginScreenProps) {
  const { colors } = useTheme();

  /* state */
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* refs */
  const pinInputRef = useRef<TextInput>(null);
  const logoScale = useRef(new Animated.Value(1)).current;

  /* pulse animation */
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  /* handlers */
  const handleLogin = async () => {
    if (!phone.trim()) {
      setError('Introduce tu número de teléfono');
      return;
    }
    if (pin.length !== 4) {
      setError('El PIN debe tener 4 dígitos');
      return;
    }

    setLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      await authService.login(phone, pin);
      onLoginSuccess();
    } catch {
      const demo = DEMO_USERS.find(
        (u) => u.phone === phone && u.pin === pin,
      );
      if (demo) {
        onLoginSuccess();
      } else {
        setError(
          'Teléfono o PIN incorrectos. Prueba con 600111222 / 1234',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* PIN dots */
  const renderPinDots = () =>
    Array.from({ length: 4 }, (_, i) => (
      <View
        key={i}
        style={[
          styles.pinDot,
          {
            backgroundColor:
              i < pin.length ? colors.primary : colors.inputBg,
            borderColor:
              i < pin.length ? colors.primary : colors.border,
          },
        ]}
      />
    ));

  /* ── UI ── */
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* decorative circles */}
      <View
        style={[styles.circle1, { backgroundColor: colors.primary + '15' }]}
      />
      <View
        style={[styles.circle2, { backgroundColor: colors.primary + '10' }]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── back ── */}
          {onGoBack && (
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.card }, SHADOWS.small]}
              onPress={onGoBack}
            >
              <Ionicons name="arrow-back" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* ── logo ── */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Text style={[styles.appName, { color: colors.primary }]}>
            CuidaLink
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Cuidado con cariño y tecnología
          </Text>

          {/* ── card ── */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card },
              SHADOWS.medium,
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Acceso Cuidadora
            </Text>

            {/* phone */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Teléfono
            </Text>
            <View
              style={[
                styles.phoneRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.countryCode, { color: colors.textSecondary }]}
              >
                🇪🇸 +34
              </Text>
              <TextInput
                style={[styles.phoneInput, { color: colors.text }]}
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  setError('');
                }}
                placeholder="600 111 222"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
                maxLength={9}
                returnKeyType="next"
                onSubmitEditing={() => pinInputRef.current?.focus()}
              />
              {phone.length === 9 && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.success}
                />
              )}
            </View>

            {/* PIN */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              PIN de acceso
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => pinInputRef.current?.focus()}
              style={styles.pinContainer}
            >
              <View style={styles.pinDots}>{renderPinDots()}</View>
              <TextInput
                ref={pinInputRef}
                style={styles.hiddenInput}
                value={pin}
                onChangeText={(t) => {
                  setPin(t);
                  setError('');
                }}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </TouchableOpacity>

            {/* error */}
            {error ? (
              <View
                style={[
                  styles.errorContainer,
                  { backgroundColor: colors.dangerBg },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={colors.dangerText}
                />
                <Text
                  style={[styles.errorText, { color: colors.dangerText }]}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            {/* button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: colors.primary },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="log-in-outline"
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* demo info */}
          <View
            style={[styles.demoCard, { backgroundColor: colors.infoBg }]}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.infoText}
            />
            <Text style={[styles.demoText, { color: colors.infoText }]}>
              Demo: 600111222 / PIN 1234
            </Text>
          </View>

          {/* security footer */}
          <View style={styles.securityRow}>
            <Ionicons
              name="lock-closed"
              size={14}
              color={colors.textLight}
            />
            <Text
              style={[styles.securityText, { color: colors.textLight }]}
            >
              Conexión segura y cifrada
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ─────── styles ─────── */
const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },

  /* decorative */
  circle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  circle2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
  },

  /* back */
  backButton: {
    position: 'absolute',
    top: 48,
    left: 0,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },

  /* logo */
  logoContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  appName: { fontSize: 32, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: SPACING.xl },

  /* card */
  card: {
    width: '100%',
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },

  /* inputs */
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    height: 52,
    marginBottom: SPACING.md,
  },
  countryCode: {
    fontSize: 15,
    marginRight: SPACING.sm,
    fontWeight: '500',
  },
  phoneInput: { flex: 1, fontSize: 16, letterSpacing: 1 },

  /* PIN */
  pinContainer: { alignItems: 'center', marginBottom: SPACING.lg },
  pinDots: { flexDirection: 'row', gap: 14 },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },

  /* error */
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '500' },

  /* button */
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    gap: 8,
  },
  loginButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  /* demo */
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: SPACING.sm + 2,
    gap: 8,
    width: '100%',
    marginBottom: SPACING.md,
  },
  demoText: { fontSize: 13, fontWeight: '500' },

  /* security */
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  securityText: { fontSize: 12 },
});
