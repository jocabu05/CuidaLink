/**
 * BigButton.tsx — Componente de botón grande reutilizable.
 *
 * Botón con tamaño extra para personas mayores o acciones principales.
 * Props: title, onPress, color, icon, disabled, loading.
 * Soporta modo oscuro vía ThemeContext.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { TYPOGRAPHY, BUTTON_HEIGHT, SHADOWS } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

interface BigButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    icon?: string;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
}

const BigButton: React.FC<BigButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    icon,
    disabled = false,
    loading = false,
    style,
}) => {
    const { colors } = useTheme();
    
    const getBackgroundColor = (): string => {
        if (disabled) return colors.textLight;
        switch (variant) {
            case 'success':
                return colors.success;
            case 'warning':
                return colors.warning;
            case 'danger':
                return colors.danger;
            default:
                return colors.primary;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor() },
                SHADOWS.medium,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={colors.textOnPrimary} size="large" />
            ) : (
                <>
                    {icon && <Text style={styles.icon}>{icon}</Text>}
                    <Text style={[styles.title, { color: colors.textOnPrimary }]}>{title}</Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        height: BUTTON_HEIGHT,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 12,
    } as ViewStyle,
    icon: {
        fontSize: 28,
    } as TextStyle,
    title: {
        fontSize: TYPOGRAPHY.button.fontSize,
        fontWeight: TYPOGRAPHY.button.fontWeight,
    } as TextStyle,
});

export default React.memo(BigButton);
