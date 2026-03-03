import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';

type FallCallback = () => void;

/**
 * Fall Detection Service — Two-phase detection:
 * 1. Freefall phase: acceleration drops below 0.4g (near weightlessness)
 * 2. Impact phase: acceleration spikes above 2.8g within 500ms
 * Plus a 15-second cooldown to prevent alert spam.
 */
class FallDetectionService {
    private subscription: { remove: () => void } | null = null;
    private isMonitoring: boolean = false;

    // Thresholds
    private freefallThreshold: number = 0.4;   // Below this = freefall
    private impactThreshold: number = 2.8;     // Above this = hard impact
    private freefallWindowMs: number = 500;    // Impact must follow freefall within this window
    private cooldownMs: number = 15000;        // 15s between alerts

    // State tracking
    private freefallDetectedAt: number = 0;    // Timestamp of last freefall
    private lastAlertAt: number = 0;           // Timestamp of last alert

    startMonitoring(onFallDetected: FallCallback): void {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        Accelerometer.setUpdateInterval(100); // 10 samples/sec for accuracy

        this.subscription = Accelerometer.addListener((data: AccelerometerMeasurement) => {
            const { x, y, z } = data;
            const acceleration = Math.sqrt(x * x + y * y + z * z);
            const now = Date.now();

            // Phase 1: Detect freefall (near-weightlessness)
            if (acceleration < this.freefallThreshold) {
                this.freefallDetectedAt = now;
                return;
            }

            // Phase 2: Detect impact shortly after freefall
            if (
                acceleration > this.impactThreshold &&
                this.freefallDetectedAt > 0 &&
                (now - this.freefallDetectedAt) < this.freefallWindowMs &&
                (now - this.lastAlertAt) > this.cooldownMs
            ) {
                console.log('🚨 Caída detectada! Impacto:', acceleration.toFixed(2), 'g');
                this.lastAlertAt = now;
                this.freefallDetectedAt = 0;
                onFallDetected();
            }
        });

        console.log('🔄 Monitoreo de caídas iniciado (umbral:', this.impactThreshold, 'g)');
    }

    stopMonitoring(): void {
        if (this.subscription) {
            this.subscription.remove();
            this.subscription = null;
        }
        this.isMonitoring = false;
        this.freefallDetectedAt = 0;
        console.log('⏹️ Monitoreo de caídas detenido');
    }

    setThreshold(impact: number, freefall?: number): void {
        this.impactThreshold = impact;
        if (freefall !== undefined) this.freefallThreshold = freefall;
    }

    isActive(): boolean {
        return this.isMonitoring;
    }
}

export default new FallDetectionService();

