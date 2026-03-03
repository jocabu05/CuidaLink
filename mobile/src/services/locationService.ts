import * as Location from 'expo-location';

export interface LocationData {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp: number;
}

class LocationService {
    private watchId: Location.LocationSubscription | null = null;
    private routePoints: LocationData[] = [];

    // Solicitar permisos de ubicación
    async requestPermissions(): Promise<boolean> {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    }

    // Obtener ubicación actual
    async getCurrentLocation(): Promise<LocationData | null> {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                throw new Error('Permisos de ubicación denegados');
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            return {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
                accuracy: location.coords.accuracy ?? undefined,
                timestamp: location.timestamp,
            };
        } catch (error) {
            console.error('Error obteniendo ubicación:', error);
            return null;
        }
    }

    // Verificar si estamos dentro del geofence (20 metros)
    isWithinGeofence(currentLat: number, currentLng: number, homeLat: number, homeLng: number): boolean {
        // Fórmula Haversine simplificada para distancias cortas
        const R = 6371000; // Radio de la Tierra en metros
        const dLat = this.toRad(homeLat - currentLat);
        const dLng = this.toRad(homeLng - currentLng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(currentLat)) * Math.cos(this.toRad(homeLat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance <= 20; // 20 metros de geofence
    }

    private toRad(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    // Iniciar tracking de ruta para paseos
    async startRouteTracking(onLocationUpdate: (location: LocationData) => void): Promise<void> {
        this.routePoints = [];

        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            throw new Error('Permisos de ubicación denegados');
        }

        this.watchId = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                distanceInterval: 5, // Actualizar cada 5 metros
                timeInterval: 5000, // O cada 5 segundos
            },
            (location) => {
                const point: LocationData = {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                    accuracy: location.coords.accuracy ?? undefined,
                    timestamp: location.timestamp,
                };
                this.routePoints.push(point);
                onLocationUpdate(point);
            }
        );
    }

    // Detener tracking y obtener ruta completa
    stopRouteTracking(): { ruta: LocationData[]; distanciaKm: number } {
        if (this.watchId) {
            this.watchId.remove();
            this.watchId = null;
        }

        const distancia = this.calculateRouteDistance(this.routePoints);
        const ruta = [...this.routePoints];
        this.routePoints = [];

        return { ruta, distanciaKm: distancia };
    }

    // Calcular distancia total de la ruta en km
    private calculateRouteDistance(points: LocationData[]): number {
        if (points.length < 2) return 0;

        let totalDistance = 0;
        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            totalDistance += this.haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
        }

        return Math.round(totalDistance * 100) / 100; // Redondear a 2 decimales
    }

    private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // ─── GEOFENCE MONITORING ───
    private geofenceInterval: ReturnType<typeof setInterval> | null = null;
    private safeZoneRadius: number = 100; // meters

    async startGeofenceMonitoring(
        homeLat: number,
        homeLng: number,
        onExitZone: (distance: number) => void,
        radiusMeters: number = 100,
        checkIntervalMs: number = 30000
    ): Promise<void> {
        this.safeZoneRadius = radiusMeters;
        this.stopGeofenceMonitoring();

        this.geofenceInterval = setInterval(async () => {
            const location = await this.getCurrentLocation();
            if (!location) return;

            const distance = this.haversineDistance(
                location.lat, location.lng, homeLat, homeLng
            ) * 1000; // convert km to meters

            if (distance > this.safeZoneRadius) {
                console.log(`🚨 Fuera de zona segura! Distancia: ${Math.round(distance)}m`);
                onExitZone(Math.round(distance));
            }
        }, checkIntervalMs);

        console.log(`📍 Geofence iniciado: radio ${radiusMeters}m, check cada ${checkIntervalMs / 1000}s`);
    }

    stopGeofenceMonitoring(): void {
        if (this.geofenceInterval) {
            clearInterval(this.geofenceInterval);
            this.geofenceInterval = null;
            console.log('📍 Geofence detenido');
        }
    }

    isGeofenceActive(): boolean {
        return this.geofenceInterval !== null;
    }
}

export default new LocationService();
