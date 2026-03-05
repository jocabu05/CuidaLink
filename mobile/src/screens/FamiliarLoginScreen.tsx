/**
 * FamiliarLoginScreen.tsx — Pantalla de login para FAMILIARES.
 *
 * Autenticación: email + contraseña.
 * Tras login exitoso, guarda JWT con rol FAMILIAR y navega a FamiliarDashboard.
 * Incluye enlace para registrarse si no tiene cuenta.
 *
 * UI: Gradiente header, inputs modernos, animaciones de carga.
 * Soporta modo oscuro.
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated, Keyboard, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';
import api from '../services/api';

const REGISTERED_USERS_KEY = '@cuidalink_registered_familiares';

/* ───────── types ───────── */
interface FamiliarLoginScreenProps {
  onLoginSuccess: () => void;
  onGoBack: () => void;
  onRegister?: () => void;
}

const DEMO_FAMILIAR = {
  email: 'familiar@demo.com',
  password: '1234',
  name: 'Carlos López',
};

/* ═══════════════════════════════════════════ */
export default function FamiliarLoginScreen({
  onLoginSuccess,
  onGoBack,
  onRegister,
}: FamiliarLoginScreenProps) {
  const { colors } = useTheme();

  /* state */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* refs */
  const passwordRef = useRef<TextInput>(null);
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
    if (!email.trim()) {
      setError('Introduce tu email');
      return;
    }
    if (!password.trim()) {
      setError('Introduce tu contraseña');
      return;
    }

    setLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      await api.post('/auth/familiar/login', { email, password });
      onLoginSuccess();
    } catch {
      // Backend no disponible — comprobar credenciales demo y usuarios registrados localmente
      if (
        email.trim().toLowerCase() === DEMO_FAMILIAR.email &&
        password === DEMO_FAMILIAR.password
      ) {
        onLoginSuccess();
      } else {
        // Buscar en usuarios registrados localmente
        try {
          const raw = await AsyncStorage.getItem(REGISTERED_USERS_KEY);
          const users: { email: string; password: string; nombre: string }[] = raw ? JSON.parse(raw) : [];
          const match = users.find(
            (u) => u.email === email.trim().toLowerCase() && u.password === password,
          );
          if (match) {
            onLoginSuccess();
          } else {
            setError('Email o contraseña incorrectos');
          }
        } catch {
          setError('Email o contraseña incorrectos');
        }
      }
    } finally {
      setLoading(false);
    }
  };

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
          {/* back button */}
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: colors.card },
              SHADOWS.small,
            ]}
            onPress={onGoBack}
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>

          {/* logo */}
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
            Portal Familiar
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
              Acceso Familiar
            </Text>

            {/* email */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Email
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError('');
                }}
                placeholder="familiar@demo.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            {/* password */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Contraseña
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { color: colors.text }]}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError('');
                }}
                placeholder="••••••••"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

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

            {/* register link */}
            {onRegister && (
              <TouchableOpacity
                onPress={onRegister}
                style={styles.registerRow}
              >
                <Text
                  style={[
                    styles.registerText,
                    { color: colors.textSecondary },
                  ]}
                >
                  ¿No tienes cuenta?{' '}
                </Text>
                <Text
                  style={[styles.registerLink, { color: colors.primary }]}
                >
                  Regístrate aquí
                </Text>
              </TouchableOpacity>
            )}
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
              Demo: familiar@demo.com / 1234
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    height: 52,
    marginBottom: SPACING.md,
    gap: 10,
  },
  input: { flex: 1, fontSize: 16 },

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

  /* register */
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  registerText: { fontSize: 14 },
  registerLink: { fontSize: 14, fontWeight: '700' },

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
