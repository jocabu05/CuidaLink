import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { TYPOGRAPHY, SHADOWS, SPACING } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

interface TaskCardProps {
    icono: string;
    hora: string;
    descripcion: string;
    completada: boolean;
    onPress?: () => void;
    disabled?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
    icono,
    hora,
    descripcion,
    completada,
    onPress,
    disabled = false,
}) => {
    const { colors } = useTheme();
    const Container = onPress && !disabled && !completada ? TouchableOpacity : View;

    return (
        <Container
            style={[
                styles.card,
                { backgroundColor: colors.card },
                completada && [styles.cardCompleted, { backgroundColor: colors.pillBg, borderLeftColor: colors.success }],
                SHADOWS.small,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Text style={styles.icon}>{icono}</Text>
            </View>

            <View style={styles.content}>
                <Text style={[styles.hora, { color: colors.text }, completada && { color: colors.success }]}>
                    {hora}
                </Text>
                <Text style={[styles.descripcion, { color: colors.textSecondary }, completada && { color: colors.success }]}>
                    {descripcion}
                </Text>
            </View>

            <View style={[styles.statusIndicator, completada && { backgroundColor: colors.success }]}>
                {completada ? (
                    <Text style={[styles.checkmark, { color: colors.textOnPrimary }]}>✓</Text>
                ) : (
                    <View style={[styles.checkbox, { borderColor: colors.border }]} />
                )}
            </View>
        </Container>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: SPACING.md,
        marginVertical: SPACING.xs,
    } as ViewStyle,
    cardCompleted: {
        borderLeftWidth: 4,
    } as ViewStyle,
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,
    icon: {
        fontSize: 28,
    },
    content: {
        flex: 1,
        marginLeft: SPACING.md,
    } as ViewStyle,
    hora: {
        fontSize: TYPOGRAPHY.body.fontSize,
        fontWeight: '600',
    },
    descripcion: {
        fontSize: TYPOGRAPHY.caption.fontSize,
        marginTop: 2,
    },
    statusIndicator: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
    } as ViewStyle,
    checkmark: {
        fontSize: 22,
        fontWeight: 'bold',
    },
});

export default React.memo(TaskCard);
