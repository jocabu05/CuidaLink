/**
 * SplashScreen.tsx — Pantalla de carga inicial con animación de logo.
 *
 * Se muestra durante 2 segundos al abrir la app.
 * Animación: logo con fade-in + escalado + rotación.
 * Tras completar, llama a onFinish() para navegar al login o dashboard.
 * Soporta modo oscuro vía ThemeContext.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
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
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: '#F8F9FA' }]}>
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                {/* Logo principal */}
                <View style={styles.logoWrapper}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>
                
                {/* Nombre de la app */}
                <Text style={styles.appName}>CUIDALINK</Text>
                
                {/* Subtítulo */}
                <Text style={styles.tagline}>Apoyo y Cuidado para el Alzheimer</Text>
                
                {/* Loading dots */}
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
    container: { 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#F8F9FA'
    },
    content: { 
        alignItems: 'center',
        paddingHorizontal: 24
    },
    logoWrapper: {
        width: 280,
        height: 280,
        marginBottom: 24,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    logo: {
        width: 280,
        height: 280,
    },
    appName: { 
        fontSize: 44, 
        fontWeight: '700', 
        color: '#2E8BA6',
        letterSpacing: 3,
        marginBottom: 8,
        textAlign: 'center'
    },
    tagline: { 
        fontSize: 16, 
        color: '#666666', 
        marginBottom: 48,
        fontStyle: 'italic',
        textAlign: 'center'
    },
    loadingContainer: { 
        marginTop: 16 
    },
    dotsContainer: { 
        flexDirection: 'row', 
        gap: 8 
    },
    dot: { 
        width: 12, 
        height: 12, 
        borderRadius: 6, 
        backgroundColor: '#4DB5D9' 
    },
});

export default SplashScreen;
