/**
 * RoleSelectionScreen.tsx — Pantalla de selección de rol.
 *
 * El usuario elige si entra como:
 *   👩‍⚕️ Cuidadora → navega a LoginScreen (teléfono + PIN)
 *   👨‍👩‍👧 Familiar → navega a FamiliarLoginScreen (email + contraseña)
 *
 * Animaciones de entrada con Animated API.
 * Soporta modo oscuro.
 */
import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';

const { width } = Dimensions.get('window');

interface RoleSelectionScreenProps {
    onSelectRole: (role: 'cuidadora' | 'familiar') => void;
}

const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ onSelectRole }) => {
    const { colors, isDark } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const card1Anim = useRef(new Animated.Value(0)).current;
    const card2Anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]),
            Animated.stagger(150, [
                Animated.spring(card1Anim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
                Animated.spring(card2Anim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
            ]),
        ]).start();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Decorative circles */}
            <View style={[styles.circle1, { backgroundColor: colors.success + '14' }]} />
            <View style={[styles.circle2, { backgroundColor: colors.primary + '10' }]} />

            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.logoContainer}>
                    <View style={[styles.logo, { backgroundColor: colors.pillBg }]}>
                        <Text style={styles.logoEmoji}>💚</Text>
                    </View>
                    <View style={[styles.logoPulse, { borderColor: colors.success + '30' }]} />
                </View>
                <Text style={[styles.appName, { color: colors.text }]}>CuidaLink</Text>
                <Text style={[styles.tagline, { color: colors.textSecondary }]}>Cuidado inteligente, tranquilidad real</Text>
                <View style={[styles.divider, { backgroundColor: colors.primary }]} />
                <Text style={[styles.subtitle, { color: colors.text }]}>¿Cómo quieres acceder?</Text>
            </Animated.View>

            {/* Role Cards */}
            <View style={styles.cardsContainer}>
                <Animated.View style={{ opacity: card1Anim, transform: [{ scale: card1Anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>
                    <TouchableOpacity
                        style={[styles.roleCard, { backgroundColor: colors.card }]}
                        onPress={() => onSelectRole('cuidadora')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.cardContent}>
                            <View style={[styles.emojiCircle, { backgroundColor: colors.pillBg }]}>
                                <Text style={styles.emoji}>🩺</Text>
                            </View>
                            <View style={styles.cardText}>
                                <Text style={[styles.roleTitle, { color: colors.text }]}>Cuidadora</Text>
                                <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                                    Registra tareas, comidas, paseos y medicamentos
                                </Text>
                            </View>
                            <Text style={[styles.arrow, { color: colors.textLight }]}>→</Text>
                        </View>
                        <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ opacity: card2Anim, transform: [{ scale: card2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>
                    <TouchableOpacity
                        style={[styles.roleCard, { backgroundColor: colors.card }]}
                        onPress={() => onSelectRole('familiar')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.cardContent}>
                            <View style={[styles.emojiCircle, { backgroundColor: colors.infoBg }]}>
                                <Text style={styles.emoji}>👨‍👩‍👧</Text>
                            </View>
                            <View style={styles.cardText}>
                                <Text style={[styles.roleTitle, { color: colors.text }]}>Familiar</Text>
                                <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                                    Consulta estado, fotos, ubicación y actividad
                                </Text>
                            </View>
                            <Text style={[styles.arrow, { color: colors.textLight }]}>→</Text>
                        </View>
                        <View style={[styles.cardAccent, { backgroundColor: colors.primaryLight }]} />
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Footer */}
            <Animated.Text style={[styles.footer, { opacity: fadeAnim, color: colors.textLight }]}>
                v2.0 · Hecho con ❤️ para familias
            </Animated.Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: SPACING.lg, overflow: 'hidden' },
    circle1: { position: 'absolute', top: -80, right: -60, width: 200, height: 200, borderRadius: 100 },
    circle2: { position: 'absolute', bottom: -40, left: -80, width: 260, height: 260, borderRadius: 130 },
    header: { alignItems: 'center', paddingTop: 80, marginBottom: SPACING.xl },
    logoContainer: { position: 'relative', marginBottom: SPACING.md },
    logo: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium },
    logoPulse: { position: 'absolute', top: -4, left: -4, width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
    logoEmoji: { fontSize: 40 },
    appName: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
    tagline: { fontSize: 15, marginTop: 6, fontWeight: '500' },
    divider: { width: 40, height: 3, borderRadius: 2, marginTop: 20 },
    subtitle: { fontSize: 17, marginTop: 16, fontWeight: '600' },
    cardsContainer: { flex: 1, justifyContent: 'center', gap: 20, marginBottom: 40 },
    roleCard: { borderRadius: 24, overflow: 'hidden', ...SHADOWS.medium },
    cardContent: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingRight: 16 },
    cardAccent: { height: 4 },
    emojiCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    emoji: { fontSize: 28 },
    cardText: { flex: 1, marginLeft: 16 },
    roleTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    roleDescription: { fontSize: 13, lineHeight: 18 },
    arrow: { fontSize: 22, fontWeight: '300' },
    footer: { textAlign: 'center', fontSize: 12, paddingBottom: 32, fontWeight: '500' },
});

export default RoleSelectionScreen;
