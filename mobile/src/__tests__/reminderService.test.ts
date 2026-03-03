/**
 * Unit tests for reminderService
 * Tests scheduling, cancellation, and initialization
 */

jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id-1'),
    cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
    getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
}));

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const reminderService = require('../services/reminderService').default;

describe('ReminderService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('init', () => {
        test('should request notification permissions', async () => {
            await reminderService.init();

            expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
            expect(Notifications.setNotificationHandler).toHaveBeenCalled();
        });
    });

    describe('scheduleMedicationReminders', () => {
        test('should schedule notifications for each medication time', async () => {
            await reminderService.init();
            await reminderService.scheduleMedicationReminders();

            // Should schedule at least 2 notifications (pre-reminder + actual)
            expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
            const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
            expect(calls.length).toBeGreaterThanOrEqual(2);

            // Check content format
            const firstCall = calls[0][0];
            expect(firstCall.content).toHaveProperty('title');
            expect(firstCall.content).toHaveProperty('body');
            expect(firstCall.trigger).toBeDefined();
        });

        test('should save scheduled reminders to AsyncStorage', async () => {
            await reminderService.init();
            await reminderService.scheduleMedicationReminders();

            expect(AsyncStorage.setItem).toHaveBeenCalled();
        });
    });

    describe('cancelAllReminders', () => {
        test('should cancel all scheduled notifications', async () => {
            await reminderService.cancelAllReminders();

            expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
            expect(AsyncStorage.removeItem).toHaveBeenCalled();
        });
    });

    describe('getScheduledReminders', () => {
        test('should return empty array when no reminders stored', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
            const result = await reminderService.getScheduledReminders();

            expect(result).toEqual([]);
        });

        test('should return stored reminders', async () => {
            const stored = JSON.stringify([{ id: '1', hora: '10:30', titulo: 'Sinemet' }]);
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(stored);

            const result = await reminderService.getScheduledReminders();

            expect(result).toHaveLength(1);
            expect(result[0].titulo).toBe('Sinemet');
        });
    });
});
