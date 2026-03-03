import AsyncStorage from '@react-native-async-storage/async-storage';

const FOTO_PACIENTE_KEY = 'cuidalink_foto_paciente';

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
