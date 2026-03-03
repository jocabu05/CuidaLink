/**
 * SplashScreen.tsx — Pantalla de carga inicial con animación de logo.
 *
 * Se muestra durante 2 segundos al abrir la app.
 * Animación: logo con fade-in + escalado + rotación.
 * Tras completar, llama a onFinish() para navegar al login o dashboard.
 * Soporta modo oscuro vía ThemeContext.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const { colors } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onFinish());
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.headerBg }]}>
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <View style={[styles.logoContainer, { backgroundColor: colors.card }]}>
                    <Text style={styles.logoIcon}>🤲</Text>
                    <View style={[styles.heartBadge, { backgroundColor: colors.card, borderColor: colors.headerBg }]}>
                        <Text style={styles.heartIcon}>💚</Text>
                    </View>
                </View>
                <Text style={styles.appName}>CuidaLink</Text>
                <Text style={styles.tagline}>Cuidando con confianza</Text>
                <View style={styles.loadingContainer}>
                    <LoadingDots />
                </View>
            </Animated.View>
        </View>
    );
};

const LoadingDots: React.FC = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animateDot = (dot: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: 1, duration: 300, easing: Easing.ease, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, easing: Easing.ease, useNativeDriver: true }),
                ])
            ).start();
        };
        animateDot(dot1, 0);
        animateDot(dot2, 200);
        animateDot(dot3, 400);
    }, []);

    const dotStyle = (anim: Animated.Value) => ({
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
    });

    return (
        <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, dotStyle(dot1)]} />
            <Animated.View style={[styles.dot, dotStyle(dot2)]} />
            <Animated.View style={[styles.dot, dotStyle(dot3)]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { alignItems: 'center' },
    logoContainer: {
        width: 140, height: 140, borderRadius: 70,
        alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
    },
    logoIcon: { fontSize: 64 },
    heartBadge: {
        position: 'absolute', bottom: 0, right: 0, width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center', borderWidth: 3,
    },
    heartIcon: { fontSize: 24 },
    appName: { fontSize: 42, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 1 },
    tagline: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 8, fontStyle: 'italic' },
    loadingContainer: { marginTop: 48 },
    dotsContainer: { flexDirection: 'row', gap: 8 },
    dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF' },
});

export default SplashScreen;
