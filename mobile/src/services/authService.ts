/**
 * authService.ts — Servicio de autenticación para cuidadoras y familiares.
 *
 * Gestiona:
 * - Login cuidadora (teléfono + PIN → JWT)
 * - Login familiar (email + password → JWT con rol FAMILIAR)
 * - Registro de familiar
 * - Persistencia del token y datos de usuario en AsyncStorage
 * - Logout (limpia token y datos locales)
 * - getToken() / getUser() para acceder a la sesión actual
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { LoginResponse } from './api';
    id: number;
    nombre: string;
    telefono: string;
    fotoPerfil?: string;
    rating: number;
}

class AuthService {
    private static TOKEN_KEY = 'token';
    private static USER_KEY = 'user';

    async login(telefono: string, pin: string): Promise<User> {
        const response = await api.post<LoginResponse>('/auth/login', {
            telefono,
            pin,
        });

        const { token, cuidadoraId, nombre, fotoPerfil, rating } = response.data;

        // Guardar token y usuario
        await AsyncStorage.setItem(AuthService.TOKEN_KEY, token);

        const user: User = {
            id: cuidadoraId,
            nombre,
            telefono,
            fotoPerfil,
            rating,
        };

        await AsyncStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));

        return user;
    }

    async logout(): Promise<void> {
        await AsyncStorage.removeItem(AuthService.TOKEN_KEY);
        await AsyncStorage.removeItem(AuthService.USER_KEY);
    }

    async getToken(): Promise<string | null> {
        return AsyncStorage.getItem(AuthService.TOKEN_KEY);
    }

    async getCurrentUser(): Promise<User | null> {
        const userStr = await AsyncStorage.getItem(AuthService.USER_KEY);
        if (!userStr) return null;
        return JSON.parse(userStr);
    }

    async updateProfilePhoto(base64Photo: string): Promise<void> {
        try {
            const token = await this.getToken();
            if (!token) throw new Error('No token available');

            // Call API to update profile photo
            await api.post('/auth/update-photo', { fotoPerfil: base64Photo });

            // Update local user
            const user = await this.getCurrentUser();
            if (user) {
                user.fotoPerfil = base64Photo;
                await AsyncStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
            }
        } catch (error) {
            console.error('Error updating profile photo:', error);
            throw error;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        const token = await this.getToken();
        return !!token;
    }
}

export default new AuthService();
