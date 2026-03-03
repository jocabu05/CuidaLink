/**
 * Unit tests for notasService
 * Tests CRUD operations, API fallback, and event emission
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

jest.mock('../services/api', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

jest.mock('../services/taskEventEmitter', () => ({
    emitNotasChanged: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { emitNotasChanged } from '../services/taskEventEmitter';

const notasService = require('../services/notasService').default;

describe('NotasService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('crearNota', () => {
        test('should create note via API and save locally', async () => {
            const nota = { texto: 'Test note', autor: 'familiar', prioridad: 'normal', abueloId: 1 };
            (api.post as jest.Mock).mockResolvedValue({ data: { id: 1, ...nota } });
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

            const result = await notasService.crearNota(nota.texto, nota.autor, nota.prioridad, nota.abueloId);

            expect(api.post).toHaveBeenCalledWith('/notas', expect.objectContaining({ texto: 'Test note' }));
            expect(AsyncStorage.setItem).toHaveBeenCalled();
            expect(emitNotasChanged).toHaveBeenCalled();
        });

        test('should fall back to local storage if API fails', async () => {
            const nota = { texto: 'Offline note', autor: 'familiar', prioridad: 'urgente', abueloId: 1 };
            (api.post as jest.Mock).mockRejectedValue(new Error('Network Error'));
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

            const result = await notasService.crearNota(nota.texto, nota.autor, nota.prioridad, nota.abueloId);

            expect(result).toBeDefined();
            expect(result.texto).toBe('Offline note');
            expect(AsyncStorage.setItem).toHaveBeenCalled();
            expect(emitNotasChanged).toHaveBeenCalled();
        });
    });

    describe('getNotasPendientes', () => {
        test('should fetch pending notes from API', async () => {
            const mockNotas = [
                { id: 1, texto: 'Note 1', leida: false },
                { id: 2, texto: 'Note 2', leida: false },
            ];
            (api.get as jest.Mock).mockResolvedValue({ data: mockNotas });

            const result = await notasService.getNotasPendientes();

            expect(api.get).toHaveBeenCalledWith('/notas/pendientes');
            expect(result).toHaveLength(2);
        });

        test('should fall back to local if API fails', async () => {
            (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));
            const localNotas = JSON.stringify([
                { id: 'local_1', texto: 'Local note', leida: false },
            ]);
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(localNotas);

            const result = await notasService.getNotasPendientes();

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('marcarLeidaYEliminar', () => {
        test('should mark note as read via API and update local', async () => {
            (api.put as jest.Mock).mockResolvedValue({ data: {} });
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
                JSON.stringify([{ id: 'test1', texto: 'Note', leida: false }])
            );

            await notasService.marcarLeidaYEliminar('test1');

            expect(emitNotasChanged).toHaveBeenCalled();
        });
    });

    describe('marcarTodasLeidasYEliminar', () => {
        test('should clear all pending notes', async () => {
            (api.delete as jest.Mock).mockResolvedValue({});
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
                JSON.stringify([
                    { id: '1', leida: false },
                    { id: '2', leida: false },
                ])
            );

            await notasService.marcarTodasLeidasYEliminar();

            expect(emitNotasChanged).toHaveBeenCalled();
        });
    });
});
