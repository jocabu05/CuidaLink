/**
 * voiceService.ts — Servicio de voz completo (Text-to-Speech + grabación de audio).
 *
 * Text-to-Speech (TTS):
 * - leerTareasPendientes(): lee en voz alta las tareas que faltan
 * - saludar(): saludo personalizado con nombre del paciente
 * - leerResumenDia(): resumen de tareas completadas/pendientes
 * - speak(): habla cualquier texto en español
 * - stop(): detiene el habla
 *
 * Grabación de audio (notas de voz para chat):
 * - startRecording(): inicia grabación con Audio API de Expo
 * - stopRecording(): detiene grabación, devuelve base64 + duración
 * - playAudio(): reproduce audio desde base64 o URI
 * - stopPlayback(): detiene la reproducción
 *
 * Usa expo-speech para TTS y expo-av para grabación/reproducción.
 */
import * as Speech from 'expo-speech';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Platform, Alert } from 'react-native';

interface Tarea {
    tipo: string;
    hora: string;
    descripcion: string;
    completada: boolean;
}

export interface AudioRecordingResult {
    base64: string;
    durationSeconds: number;
    uri: string;
}

const TIPO_NAMES: Record<string, string> = {
    LLEGADA: 'Llegada',
    PASTILLA: 'Medicamento',
    PASEO: 'Paseo',
    COMIDA: 'Comida',
    SIESTA: 'Siesta',
};

// Recording options that work on all platforms
const RECORDING_OPTIONS: Audio.RecordingOptions = {
    isMeteringEnabled: true,
    android: {
        extension: '.m4a',
        outputFormat: 2, // MPEG_4
        audioEncoder: 3, // AAC
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
    },
    ios: {
        extension: '.m4a',
        audioQuality: 127, // Audio.IOSAudioQuality.MAX
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
    },
    web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
    },
};

/**
 * Voice service for text-to-speech accessibility and audio recording.
 * Uses expo-speech + expo-av.
 */
class VoiceService {
    private speaking: boolean = false;
    private audioConfigured: boolean = false;
    private recording: Audio.Recording | null = null;
    private recordingStartTime: number = 0;
    private sound: Audio.Sound | null = null;

    /**
     * Configure audio for playback mode.
     */
    private async configureAudio(): Promise<void> {
        if (this.audioConfigured) return;
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
            this.audioConfigured = true;
        } catch (e) {
            console.error('🔊 Failed to configure audio:', e);
        }
    }

    /**
     * Configure audio for recording mode.
     */
    private async configureRecording(): Promise<void> {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
            this.audioConfigured = false;
        } catch (e) {
            console.error('🎤 Failed to configure recording audio:', e);
            throw e;
        }
    }

    /**
     * Request microphone permission.
     */
    async requestPermission(): Promise<boolean> {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permiso necesario',
                    'Se necesita acceso al micrófono para grabar notas de voz. Ve a Ajustes para habilitarlo.',
                );
                return false;
            }
            return true;
        } catch (e) {
            console.error('🎤 Permission error:', e);
            return false;
        }
    }

    /**
     * Start recording audio.
     */
    async startRecording(): Promise<boolean> {
        try {
            // 1. Check permission
            const hasPermission = await this.requestPermission();
            if (!hasPermission) return false;

            // 2. Stop any playback first
            if (this.speaking) {
                Speech.stop();
                this.speaking = false;
            }
            await this.stopPlayback();

            // 3. Cleanup previous recording if exists
            if (this.recording) {
                try { await this.recording.stopAndUnloadAsync(); } catch { /* ignore */ }
                this.recording = null;
            }

            // 4. Configure audio mode for recording
            await this.configureRecording();

            // Small delay to let audio session settle
            await new Promise(r => setTimeout(r, 100));

            // 5. Create a new Recording object, prepare, then start
            const recording = new Audio.Recording();
            try {
                await recording.prepareToRecordAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
            } catch (presetError) {
                console.warn('🎤 HIGH_QUALITY preset failed, trying custom options:', presetError);
                try {
                    await recording.prepareToRecordAsync(RECORDING_OPTIONS);
                } catch (customError) {
                    console.error('🎤 Custom options also failed:', customError);
                    return false;
                }
            }
            await recording.startAsync();

            this.recording = recording;
            this.recordingStartTime = Date.now();
            console.log('🎤 Recording started successfully');
            return true;
        } catch (e) {
            console.error('🎤 Failed to start recording:', e);
            this.recording = null;
            return false;
        }
    }

    /**
     * Stop recording and return base64 audio data.
     */
    async stopRecording(): Promise<AudioRecordingResult | null> {
        if (!this.recording) return null;

        const rec = this.recording;
        this.recording = null;

        try {
            // Try to stop — may already be stopped
            try {
                const status = await rec.getStatusAsync();
                if (status.isRecording) {
                    await rec.stopAndUnloadAsync();
                } else {
                    // Not recording but still loaded — unload
                    await rec.stopAndUnloadAsync();
                }
            } catch (stopErr) {
                console.warn('🎤 Error stopping recording (will try to read anyway):', stopErr);
            }

            const uri = rec.getURI();
            if (!uri) return null;

            const durationSeconds = Math.round((Date.now() - this.recordingStartTime) / 1000);

            // Read file as base64 using fetch + FileReader (avoids expo-file-system issues)
            const base64 = await this.fileToBase64(uri);

            console.log(`🎤 Recording stopped: ${durationSeconds}s, ${Math.round(base64.length / 1024)}KB`);

            return {
                base64,
                durationSeconds: Math.max(1, durationSeconds),
                uri,
            };
        } catch (e) {
            console.error('🎤 Failed to stop recording:', e);
            return null;
        }
    }

    /**
     * Cancel an ongoing recording without saving.
     */
    async cancelRecording(): Promise<void> {
        if (!this.recording) return;
        try {
            await this.recording.stopAndUnloadAsync();
        } catch { /* ignore */ }
        this.recording = null;
    }

    isRecording(): boolean {
        return this.recording !== null;
    }

    /**
     * Convert a local file URI to a base64 string using fetch + FileReader.
     * Works reliably across all Expo SDK versions without expo-file-system.
     */
    private async fileToBase64(uri: string): Promise<string> {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                // Strip the "data:...;base64," prefix
                const base64 = dataUrl.split(',')[1] || '';
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Play an audio base64 string.
     */
    async playAudio(base64: string): Promise<void> {
        await this.stopPlayback();
        await this.configureAudio();

        try {
            // Use data URI directly — no temp file needed
            const dataUri = `data:audio/mp4;base64,${base64}`;
            const { sound } = await Audio.Sound.createAsync({ uri: dataUri });
            this.sound = sound;

            sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
                if (status.isLoaded && status.didJustFinish) {
                    this.stopPlayback();
                }
            });

            await sound.playAsync();
        } catch (e) {
            console.error('🔊 Failed to play audio:', e);
        }
    }

    /**
     * Stop current audio playback.
     */
    async stopPlayback(): Promise<void> {
        if (this.sound) {
            try { await this.sound.unloadAsync(); } catch { /* ignore */ }
            this.sound = null;
        }
    }

    /**
     * Speak text. Forces audio category on iOS first.
     */
    async speak(text: string): Promise<void> {
        await this.configureAudio();

        if (this.speaking) {
            Speech.stop();
            await new Promise(r => setTimeout(r, 300));
        }
        this.speaking = true;
        console.log('🔊 Speaking:', text.substring(0, 80) + '...');

        return new Promise<void>((resolve) => {
            Speech.speak(text, {
                language: 'es-ES',
                rate: Platform.OS === 'ios' ? 0.5 : 0.85,
                pitch: 1.0,
                volume: 1.0,
                onStart: () => {
                    console.log('🔊 Speech started');
                },
                onDone: () => {
                    console.log('🔊 Speech done');
                    this.speaking = false;
                    resolve();
                },
                onStopped: () => {
                    console.log('🔊 Speech stopped');
                    this.speaking = false;
                    resolve();
                },
                onError: (error: any) => {
                    console.error('🔊 Speech error:', error);
                    this.speaking = false;
                    resolve();
                },
            });
        });
    }

    async speakTaskList(tareas: Tarea[]): Promise<void> {
        const pendientes = tareas.filter(t => !t.completada);
        const completadas = tareas.filter(t => t.completada);

        let text = '';

        if (completadas.length > 0) {
            text += `Llevas ${completadas.length} tarea${completadas.length > 1 ? 's' : ''} completada${completadas.length > 1 ? 's' : ''}. `;
        }

        if (pendientes.length === 0) {
            text += '¡Enhorabuena! Has completado todas las tareas de hoy.';
        } else {
            text += `Tienes ${pendientes.length} tarea${pendientes.length > 1 ? 's' : ''} pendiente${pendientes.length > 1 ? 's' : ''}. `;
            pendientes.forEach((t, i) => {
                const nombre = TIPO_NAMES[t.tipo] || t.tipo;
                text += `${i + 1}: ${nombre} a las ${t.hora}. ${t.descripcion}. `;
            });
        }

        await this.speak(text);
    }

    async announceReminder(titulo: string): Promise<void> {
        await this.speak(`Recordatorio: ${titulo}`);
    }

    async announceStatus(nombre: string, porcentaje: number): Promise<void> {
        await this.speak(
            `Buenos días. Estás cuidando de ${nombre}. ` +
            `El progreso de hoy es del ${porcentaje} por ciento.`
        );
    }

    stop(): void {
        Speech.stop();
        this.speaking = false;
    }

    isSpeaking(): boolean {
        return this.speaking;
    }
}

export default new VoiceService();
