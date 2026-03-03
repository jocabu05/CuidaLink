import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, SHADOWS } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import wearableService, { WearableData } from '../services/wearableService';

const WearableWidget: React.FC = () => {
    const { colors } = useTheme();
    const [data, setData] = useState<WearableData | null>(null);

    useEffect(() => {
        loadData();
        wearableService.startStepTracking();
        const interval = setInterval(loadData, 30000); // refresh every 30s
        return () => {
            clearInterval(interval);
            wearableService.stopStepTracking();
        };
    }, []);

    const loadData = async () => {
        const latest = await wearableService.getLatestData();
        setData(latest);
    };

    if (!data) return null;

    const sleepColor = data.sleepQuality === 'buena' ? '#4CAF50' : data.sleepQuality === 'regular' ? '#FF9800' : '#F44336';
    const hrColor = data.heartRate > 90 ? '#F44336' : data.heartRate > 80 ? '#FF9800' : '#4CAF50';

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.text }]}>⌚ Datos del paciente</Text>
            <View style={styles.row}>
                {/* Steps */}
                <View style={styles.metric}>
                    <Text style={styles.metricIcon}>👟</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{data.steps.toLocaleString()}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>pasos</Text>
                </View>

                {/* Heart Rate */}
                <View style={styles.metric}>
                    <Text style={styles.metricIcon}>❤️</Text>
                    <Text style={[styles.metricValue, { color: hrColor }]}>{data.heartRate}</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>bpm</Text>
                </View>

                {/* Sleep */}
                <View style={styles.metric}>
                    <Text style={styles.metricIcon}>😴</Text>
                    <Text style={[styles.metricValue, { color: sleepColor }]}>{data.sleepHours}h</Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{data.sleepQuality}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        borderRadius: 16,
        padding: SPACING.md,
        ...SHADOWS.small,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: SPACING.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    metric: {
        alignItems: 'center',
        flex: 1,
    },
    metricIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    metricLabel: {
        fontSize: 11,
        marginTop: 2,
    },
});

export default React.memo(WearableWidget);
