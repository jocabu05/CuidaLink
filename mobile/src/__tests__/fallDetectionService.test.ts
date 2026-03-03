/**
 * Unit tests for fallDetectionService
 * Tests the two-phase detection algorithm (freefall + impact)
 */

// Mock expo-sensors
jest.mock('expo-sensors', () => ({
    Accelerometer: {
        addListener: jest.fn(),
        setUpdateInterval: jest.fn(),
        removeAllListeners: jest.fn(),
    },
}));

import { Accelerometer } from 'expo-sensors';

// Import the service module and extract the class for testing
const fallDetectionModule = require('../services/fallDetectionService');
const fallDetectionService = fallDetectionModule.default;

describe('FallDetectionService', () => {
    let mockListener: (data: { x: number; y: number; z: number }) => void;

    beforeEach(() => {
        jest.useFakeTimers();
        // Capture the listener callback
        (Accelerometer.addListener as jest.Mock).mockImplementation((cb) => {
            mockListener = cb;
            return { remove: jest.fn() };
        });
    });

    afterEach(() => {
        fallDetectionService.stopMonitoring();
        jest.useRealTimers();
    });

    test('should start monitoring and set update interval', () => {
        const onFall = jest.fn();
        fallDetectionService.startMonitoring(onFall);

        expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(100);
        expect(Accelerometer.addListener).toHaveBeenCalled();
    });

    test('should NOT trigger on normal movement (1g gravity)', () => {
        const onFall = jest.fn();
        fallDetectionService.startMonitoring(onFall);

        // Normal standing: ~1g
        mockListener({ x: 0, y: 0, z: 1.0 });
        mockListener({ x: 0.1, y: 0, z: 0.98 });
        mockListener({ x: -0.1, y: 0.1, z: 0.95 });

        expect(onFall).not.toHaveBeenCalled();
    });

    test('should NOT trigger on impact alone without freefall', () => {
        const onFall = jest.fn();
        fallDetectionService.startMonitoring(onFall);

        // Direct high-g without prior freefall
        mockListener({ x: 2.0, y: 2.0, z: 2.0 }); // magnitude ~3.46g

        expect(onFall).not.toHaveBeenCalled();
    });

    test('should trigger on freefall followed by impact within 500ms', () => {
        const onFall = jest.fn();
        fallDetectionService.startMonitoring(onFall);

        // Phase 1: Freefall (< 0.4g)
        mockListener({ x: 0.1, y: 0.1, z: 0.1 }); // magnitude ~0.17g

        // Phase 2: Impact within 500ms (> 2.8g)
        jest.advanceTimersByTime(200);
        mockListener({ x: 2.0, y: 1.5, z: 1.5 }); // magnitude ~2.92g

        expect(onFall).toHaveBeenCalledTimes(1);
    });

    test('should NOT trigger if impact occurs after 500ms cooldown window', () => {
        const onFall = jest.fn();
        fallDetectionService.startMonitoring(onFall);

        // Phase 1: Freefall
        mockListener({ x: 0.05, y: 0.05, z: 0.05 }); // freefall

        // Phase 2: Impact after 600ms (too late)
        jest.advanceTimersByTime(600);
        mockListener({ x: 2.0, y: 2.0, z: 2.0 }); // impact

        expect(onFall).not.toHaveBeenCalled();
    });

    test('should respect 15-second cooldown between detections', () => {
        const onFall = jest.fn();
        fallDetectionService.startMonitoring(onFall);

        // First fall
        mockListener({ x: 0.1, y: 0.1, z: 0.1 });
        jest.advanceTimersByTime(200);
        mockListener({ x: 2.0, y: 1.5, z: 1.5 });
        expect(onFall).toHaveBeenCalledTimes(1);

        // Second fall immediately after (within 15s cooldown)
        jest.advanceTimersByTime(5000); // 5s later
        mockListener({ x: 0.1, y: 0.1, z: 0.1 });
        jest.advanceTimersByTime(200);
        mockListener({ x: 2.0, y: 1.5, z: 1.5 });
        expect(onFall).toHaveBeenCalledTimes(1); // Should still be 1

        // Third fall after 15s cooldown
        jest.advanceTimersByTime(15000);
        mockListener({ x: 0.1, y: 0.1, z: 0.1 });
        jest.advanceTimersByTime(200);
        mockListener({ x: 2.0, y: 1.5, z: 1.5 });
        expect(onFall).toHaveBeenCalledTimes(2); // Now 2
    });

    test('should stop monitoring cleanly', () => {
        fallDetectionService.startMonitoring(jest.fn());
        fallDetectionService.stopMonitoring();

        expect(Accelerometer.removeAllListeners).toHaveBeenCalled();
    });
});
