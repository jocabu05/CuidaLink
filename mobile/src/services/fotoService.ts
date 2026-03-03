/**
 * fotoService.ts — Servicio simple para persistir la foto de perfil del paciente.
 *
 * Usa AsyncStorage para guardar/recuperar la URI de la foto.
 * Se usa en PerfilAbueloScreen y DashboardScreen.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const fotoService = {
    async guardarFoto(uri: string): Promise<void> {
        await AsyncStorage.setItem(FOTO_PACIENTE_KEY, uri);
    },

    async getFoto(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(FOTO_PACIENTE_KEY);
        } catch {
            return null;
        }
    },

    async eliminarFoto(): Promise<void> {
        await AsyncStorage.removeItem(FOTO_PACIENTE_KEY);
    },
};

export default fotoService;
