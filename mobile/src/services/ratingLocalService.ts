import AsyncStorage from '@react-native-async-storage/async-storage';

const RATING_KEY = '@cuidalink_ratings';

export interface DayRating {
    id: string;
    fecha: string; // YYYY-MM-DD
    estrellas: number; // 1-5
    comentario: string;
    timestamp: string;
}

class RatingService {
    async valorarDia(estrellas: number, comentario: string): Promise<DayRating> {
        const ratings = await this.getRatings();
        const hoy = new Date().toISOString().split('T')[0];

        // Replace today's rating if exists
        const filtrado = ratings.filter(r => r.fecha !== hoy);
        const nuevo: DayRating = {
            id: Date.now().toString(),
            fecha: hoy,
            estrellas,
            comentario,
            timestamp: new Date().toISOString(),
        };
        filtrado.push(nuevo);
        await AsyncStorage.setItem(RATING_KEY, JSON.stringify(filtrado.slice(-60))); // 60 days
        return nuevo;
    }

    async getRatings(): Promise<DayRating[]> {
        try {
            const data = await AsyncStorage.getItem(RATING_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    async getRatingHoy(): Promise<DayRating | null> {
        const ratings = await this.getRatings();
        const hoy = new Date().toISOString().split('T')[0];
        return ratings.find(r => r.fecha === hoy) || null;
    }

    async getPromedioSemanal(): Promise<number> {
        const ratings = await this.getRatings();
        const hace7dias = new Date();
        hace7dias.setDate(hace7dias.getDate() - 7);
        const recientes = ratings.filter(r => new Date(r.timestamp) >= hace7dias);
        if (recientes.length === 0) return 0;
        return recientes.reduce((sum, r) => sum + r.estrellas, 0) / recientes.length;
    }
}

export default new RatingService();
