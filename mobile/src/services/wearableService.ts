import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEARABLE_KEY = 'cuidalink_wearable';

export interface WearableData {
    steps: number;
    heartRate: number;
    sleepHours: number;
    sleepQuality: 'buena' | 'regular' | 'mala';
    lastUpdate: string;
}

/**
 * Simulated wearable data service.
 * Uses real pedometer when available, simulates heart rate and sleep.
 * In a real product, this would connect to a BLE wearable device.
 */
class WearableService {
    private subscription: { remove: () => void } | null = null;
    private currentSteps: number = 0;

    async getLatestData(): Promise<WearableData> {
        // Try real pedometer data
        let steps = 0;
        try {
            const available = await Pedometer.isAvailableAsync();
            if (available) {
                const end = new Date();
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                const result = await Pedometer.getStepCountAsync(start, end);
                steps = result.steps;
            }
        } catch {
            // Pedometer not available, use simulated
        }

        // If no real data, simulate
        if (steps === 0) {
            const hour = new Date().getHours();
            // Simulate steps based on time of day
            steps = Math.min(hour * 450 + Math.floor(Math.random() * 200), 8000);
        }

        // Simulate heart rate (realistic resting range for elderly)
        const heartRate = 65 + Math.floor(Math.random() * 15); // 65-80 bpm

        // Get stored sleep data or simulate
        const stored = await this.getStoredData();
        const sleepHours = stored?.sleepHours || (6 + Math.random() * 2); // 6-8 hours
        const sleepQuality = sleepHours >= 7 ? 'buena' : sleepHours >= 5.5 ? 'regular' : 'mala';

        const data: WearableData = {
            steps,
            heartRate,
            sleepHours: Math.round(sleepHours * 10) / 10,
            sleepQuality,
            lastUpdate: new Date().toISOString(),
        };

        await AsyncStorage.setItem(WEARABLE_KEY, JSON.stringify(data));
        return data;
    }

    async getStoredData(): Promise<WearableData | null> {
        const raw = await AsyncStorage.getItem(WEARABLE_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    startStepTracking(): void {
        if (this.subscription) return;
        Pedometer.isAvailableAsync().then(available => {
            if (available) {
                this.subscription = Pedometer.watchStepCount(result => {
                    this.currentSteps = result.steps;
                });
            }
        }).catch(() => { });
    }

    stopStepTracking(): void {
        if (this.subscription) {
            this.subscription.remove();
            this.subscription = null;
        }
    }

    getCurrentSteps(): number {
        return this.currentSteps;
    }
}

export default new WearableService();
