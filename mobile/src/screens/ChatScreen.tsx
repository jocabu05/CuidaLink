import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    KeyboardAvoidingView, Platform, Alert, Animated, Vibration,
    Dimensions, Image, Linking, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SHADOWS } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import chatService, { ChatMessage } from '../services/chatService';
import voiceService from '../services/voiceService';

const CL = {
    headerDark: '#0D47A1', headerMid: '#1565C0', accent: '#2196F3',
    chatBgLight: '#F0F4FA', chatBgDark: '#121212',
    bubbleMineLight: '#D6E8FF', bubbleMineDark: '#1A3A5C',
    bubbleOtherLight: '#FFFFFF', bubbleOtherDark: '#1E1E1E',
    inputBgLight: '#FFFFFF', inputBgDark: '#2C2C2C',
    textPrimary: '#212121', textPrimaryDark: '#E0E0E0',
    textSecondary: '#757575', textSecondaryDark: '#9E9E9E',
    timeText: '#8696A0', recording: '#EE3B3B', audioAccent: '#2196F3',
};

interface ChatScreenProps {
    role: 'cuidadora' | 'familiar';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ChatScreen: React.FC<ChatScreenProps> = ({ role }) => {
    const { colors, isDark } = useTheme();
    const [mensajes, setMensajes] = useState<ChatMessage[]>([]);
    const [texto, setTexto] = useState('');
    const [sending, setSending] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [contactPhoto, setContactPhoto] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const recordBarAnim = useRef(new Animated.Value(0)).current;

    const waveformHeights = useMemo(() => {
        const map: Record<string, number[]> = {};
        mensajes.forEach(m => {
            if (m.type === 'audio' && !map[m.id]) {
                map[m.id] = Array.from({ length: 20 }, () => 4 + Math.random() * 16);
            }
        });
        return map;
    }, [mensajes]);

    const cargarMensajes = useCallback(async () => {
        const msgs = await chatService.getMensajes();
        setMensajes(msgs);
        await chatService.marcarLeidos(role);
    }, [role]);

    const photoKey = (r: string) => r === 'cuidadora' ? 'profile_photo_abuelo' : 'profile_photo_familiar';

    useEffect(() => {
        const loadPhotos = async () => {
            try {
                const myPhoto = await AsyncStorage.getItem(photoKey(role));
                const contactRole = role === 'cuidadora' ? 'familiar' : 'cuidadora';
                const otherPhoto = await AsyncStorage.getItem(photoKey(contactRole));
                if (myPhoto) setProfilePhoto(myPhoto);
                if (otherPhoto) setContactPhoto(otherPhoto);
            } catch { /* ignore */ }
        };
        loadPhotos();
        const photoInterval = setInterval(loadPhotos, 5000);
        return () => clearInterval(photoInterval);
    }, [role]);

    useEffect(() => {
        cargarMensajes();
        const interval = setInterval(cargarMensajes, 3000);
        return () => {
            clearInterval(interval);
            voiceService.stopPlayback();
        };
    }, [cargarMensajes]);

    useEffect(() => {
        if (isRecording) {
            Animated.timing(recordBarAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            Animated.timing(recordBarAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
            pulseAnim.setValue(1);
        }
    }, [isRecording, pulseAnim, recordBarAnim]);

    const enviarTexto = async () => {
        if (!texto.trim() || sending) return;
        setSending(true);
        const msg = await chatService.enviarMensaje(role, texto.trim());
        setMensajes(prev => [...prev, msg]);
        setTexto('');
        setSending(false);
        scrollToEnd();
    };

    const abrirCamara = async () => {
        try {
            const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                if (!canAskAgain) {
                    Alert.alert('Permiso necesario', 'Se necesita acceso a la cámara. Actívalo en Ajustes.', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
                    ]);
                } else {
                    Alert.alert('Permiso necesario', 'Se necesita acceso a la cámara para hacer fotos.');
                }
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'], quality: 0.6, base64: true, allowsEditing: true,
            });
            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const base64 = asset.base64 || await readFileAsBase64(asset.uri);
                if (base64) await enviarImagen(base64);
            }
        } catch (e) {
            console.error('Error cámara:', e);
            Alert.alert('Error', 'No se pudo abrir la cámara');
        }
    };

    const abrirGaleria = async () => {
        try {
            const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                if (!canAskAgain) {
                    Alert.alert('Permiso necesario', 'Se necesita acceso a la galería. Actívalo en Ajustes.', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
                    ]);
                } else {
                    Alert.alert('Permiso necesario', 'Se necesita acceso a la galería para adjuntar fotos.');
                }
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'], quality: 0.6, base64: true, allowsEditing: true,
            });
            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const base64 = asset.base64 || await readFileAsBase64(asset.uri);
                if (base64) await enviarImagen(base64);
            }
        } catch (e) {
            console.error('Error galería:', e);
            Alert.alert('Error', 'No se pudo abrir la galería');
        }
    };

    const readFileAsBase64 = async (uri: string): Promise<string | null> => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            return new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    resolve(dataUrl.split(',')[1] || null);
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch { return null; }
    };

    const enviarImagen = async (base64: string) => {
        setSending(true);
        const msg = await chatService.enviarMensaje(role, '📷 Foto', {
            type: 'image', imageBase64: base64,
        });
        setMensajes(prev => [...prev, msg]);
        setSending(false);
        scrollToEnd();
    };

    const cambiarFotoPerfil = async () => {
        Alert.alert('Foto de perfil', 'Elige una opción', [
            {
                text: 'Cámara',
                onPress: async () => {
                    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                        if (!canAskAgain) {
                            Alert.alert('Permiso necesario', 'Actívalo en Ajustes.', [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
                            ]);
                        }
                        return;
                    }
                    const result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [1, 1], base64: true,
                    });
                    if (!result.canceled && result.assets[0]?.base64) {
                        const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
                        setProfilePhoto(uri);
                        await AsyncStorage.setItem(photoKey(role), uri);
                    }
                },
            },
            {
                text: 'Galería',
                onPress: async () => {
                    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                        if (!canAskAgain) {
                            Alert.alert('Permiso necesario', 'Actívalo en Ajustes.', [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
                            ]);
                        }
                        return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ['images'], quality: 0.5, allowsEditing: true, aspect: [1, 1], base64: true,
                    });
                    if (!result.canceled && result.assets[0]?.base64) {
                        const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
                        setProfilePhoto(uri);
                        await AsyncStorage.setItem(photoKey(role), uri);
                    }
                },
            },
            ...(profilePhoto ? [{
                text: 'Eliminar foto', style: 'destructive' as const,
                onPress: async () => {
                    setProfilePhoto(null);
                    await AsyncStorage.removeItem(photoKey(role));
                },
            }] : []),
            { text: 'Cancelar', style: 'cancel' as const },
        ]);
    };

    const realizarLlamada = () => {
        Alert.alert('📞 Llamar', `¿Quieres llamar ${role === 'cuidadora' ? 'al familiar' : 'a la cuidadora'}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Llamar',
                onPress: () => {
                    const numero = role === 'cuidadora' ? 'tel:+34600000001' : 'tel:+34600000002';
                    Linking.openURL(numero).catch(() => Alert.alert('Error', 'No se pudo iniciar la llamada'));
                },
            },
        ]);
    };

    const realizarVideollamada = () => {
        Alert.alert('📹 Videollamada', `¿Quieres hacer una videollamada ${role === 'cuidadora' ? 'con el familiar' : 'con la cuidadora'}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Videollamada',
                onPress: () => {
                    const numero = role === 'cuidadora' ? '+34600000001' : '+34600000002';
                    const url = Platform.OS === 'ios' ? `facetime:${numero}` : `https://meet.google.com/new`;
                    Linking.openURL(url).catch(() => {
                        Linking.openURL(`tel:${numero}`).catch(() => Alert.alert('Error', 'No se pudo iniciar la videollamada'));
                    });
                },
            },
        ]);
    };

    const startRecording = async () => {
        const started = await voiceService.startRecording();
        if (!started) return;
        setIsRecording(true);
        setRecordingDuration(0);
        Vibration.vibrate(50);
        recordingTimer.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    };

    const stopAndSendRecording = async () => {
        if (recordingTimer.current) { clearInterval(recordingTimer.current); recordingTimer.current = null; }
        setIsRecording(false);
        const result = await voiceService.stopRecording();
        if (!result || result.durationSeconds < 1) return;
        setSending(true);
        Vibration.vibrate(50);
        const msg = await chatService.enviarMensaje(
            role, `🎤 Nota de voz (${result.durationSeconds}s)`,
            { type: 'audio', audioBase64: result.base64, audioDuration: result.durationSeconds }
        );
        setMensajes(prev => [...prev, msg]);
        setSending(false);
        scrollToEnd();
    };

    const cancelRecording = async () => {
        if (recordingTimer.current) { clearInterval(recordingTimer.current); recordingTimer.current = null; }
        setIsRecording(false);
        await voiceService.cancelRecording();
    };

    const playAudio = async (msg: ChatMessage) => {
        if (playingId === msg.id) {
            await voiceService.stopPlayback();
            setPlayingId(null);
            return;
        }
        if (msg.audioBase64) {
            setPlayingId(msg.id);
            await voiceService.playAudio(msg.audioBase64);
            setPlayingId(null);
        }
    };

    const confirmarEliminar = (msg: ChatMessage) => {
        Alert.alert('Eliminar mensaje', '¿Eliminar este mensaje?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar para todos', style: 'destructive',
                onPress: async () => {
                    await chatService.eliminarMensaje(msg.id);
                    setMensajes(prev => prev.filter(m => m.id !== msg.id));
                },
            },
        ]);
    };

    const scrollToEnd = () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    const formatHora = (ts: string) => new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60), s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };
    const hasText = texto.trim().length > 0;

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isMine = item.from === role;
        const isAudio = item.type === 'audio';
        const isImage = item.type === 'image';
        const isPlaying = playingId === item.id;
        const heights = waveformHeights[item.id] || Array.from({ length: 20 }, () => 8);
        return (
            <TouchableOpacity activeOpacity={0.8} onLongPress={() => confirmarEliminar(item)} delayLongPress={600}>
                <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
                    <View style={[
                        styles.bubble,
                        isMine
                            ? { backgroundColor: isDark ? CL.bubbleMineDark : CL.bubbleMineLight, borderTopRightRadius: 2 }
                            : { backgroundColor: isDark ? CL.bubbleOtherDark : CL.bubbleOtherLight, borderTopLeftRadius: 2 },
                        isImage && styles.bubbleImage,
                    ]}>
                    <View style={[
                        styles.bubbleTail,
                        isMine
                            ? { right: -6, borderLeftWidth: 6, borderRightWidth: 6, borderTopColor: isDark ? CL.bubbleMineDark : CL.bubbleMineLight, borderLeftColor: 'transparent', borderRightColor: 'transparent' }
                            : { left: -6, borderLeftWidth: 6, borderRightWidth: 6, borderTopColor: isDark ? CL.bubbleOtherDark : CL.bubbleOtherLight, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
                    ]} />
                    {!isMine && (
                        <Text style={[styles.senderLabel, { color: colors.primary }]}>
                            {item.from === 'cuidadora' ? 'Cuidadora' : 'Familiar'}
                        </Text>
                    )}
                    {isImage && item.imageBase64 ? (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImage(`data:image/jpeg;base64,${item.imageBase64}`)}>
                            <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.chatImage} resizeMode="cover" />
                        </TouchableOpacity>
                    ) : isAudio ? (
                        <TouchableOpacity style={styles.audioRow} onPress={() => playAudio(item)} activeOpacity={0.7}>
                            <View style={[styles.audioAvatar, isMine && styles.audioAvatarMine]}>
                                {isMine && profilePhoto ? (
                                    <Image source={{ uri: profilePhoto }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                                ) : !isMine && contactPhoto ? (
                                    <Image source={{ uri: contactPhoto }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                                ) : (
                                    <Ionicons name="person" size={20} color="#fff" />
                                )}
                            </View>
                            <TouchableOpacity style={styles.playBtn} onPress={() => playAudio(item)}>
                                <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color={isMine ? CL.headerDark : CL.audioAccent} />
                            </TouchableOpacity>
                            <View style={styles.waveformContainer}>
                                <View style={styles.waveform}>
                                    {heights.map((h, i) => (
                                        <View key={i} style={[
                                            styles.waveBar, { height: h },
                                            { backgroundColor: isPlaying && i < 10
                                                ? (isMine ? CL.headerDark : CL.audioAccent)
                                                : (isMine ? 'rgba(13,71,161,0.35)' : 'rgba(33,150,243,0.35)') },
                                        ]} />
                                    ))}
                                </View>
                                <Text style={styles.audioDur}>{formatDuration(item.audioDuration || 0)}</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <Text style={[styles.msgText, { color: isDark ? CL.textPrimaryDark : CL.textPrimary }]}>{item.text}</Text>
                    )}
                    <View style={[styles.footer, isImage && styles.footerImage]}>
                        <Text style={[styles.timeText, isImage && styles.timeImage]}>{formatHora(item.timestamp)}</Text>
                        {isMine && (
                            <Ionicons name="checkmark-done" size={16} color={isImage ? '#fff' : CL.audioAccent} style={{ marginLeft: 4 }} />
                        )}
                    </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: isDark ? CL.chatBgDark : CL.chatBgLight }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
        >
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <TouchableOpacity onPress={() => { if (contactPhoto) setPreviewImage(contactPhoto); }} activeOpacity={0.7}>
                    <View style={styles.headerAvatar}>
                        {contactPhoto ? (
                            <Image source={{ uri: contactPhoto }} style={styles.headerAvatarImg} />
                        ) : (
                            <Ionicons name="person" size={22} color="#fff" />
                        )}
                    </View>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{role === 'cuidadora' ? 'Familiar' : 'Cuidadora'}</Text>
                    <Text style={styles.headerStatus}>en línea</Text>
                </View>
                <TouchableOpacity style={styles.headerAction} onPress={realizarVideollamada}>
                    <Ionicons name="videocam" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerAction} onPress={realizarLlamada}>
                    <Ionicons name="call" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {mensajes.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={[styles.emptyBadge, { backgroundColor: isDark ? colors.surfaceElevated : '#E3F2FD' }]}>
                        <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
                        <Text style={[styles.emptyBadgeText, { color: colors.textSecondary }]}>
                            Mensajes cifrados de extremo a extremo
                        </Text>
                    </View>
                    <Text style={styles.emptyIcon}>💬</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Envía un mensaje, foto o nota de voz
                    </Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef} data={mensajes} renderItem={renderMessage}
                    keyExtractor={item => item.id} contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />
            )}

            <Modal visible={!!previewImage} transparent animationType="fade">
                <View style={styles.previewOverlay}>
                    <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImage(null)}>
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    {previewImage && (
                        <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>

            {isRecording && (
                <Animated.View style={[
                    styles.recordBar,
                    { backgroundColor: isDark ? colors.surface : '#fff', opacity: recordBarAnim, transform: [{ translateY: recordBarAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }
                ]}>
                    <TouchableOpacity onPress={cancelRecording} style={styles.recordTrash}>
                        <Ionicons name="trash" size={24} color={CL.recording} />
                    </TouchableOpacity>
                    <View style={styles.recordCenter}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <View style={styles.recordDot} />
                        </Animated.View>
                        <Text style={styles.recordTimer}>{formatDuration(recordingDuration)}</Text>
                    </View>
                    <TouchableOpacity onPress={stopAndSendRecording} style={styles.recordSendBtn}>
                        <Ionicons name="send" size={22} color="#fff" />
                    </TouchableOpacity>
                </Animated.View>
            )}

            {!isRecording && (
                <View style={[styles.inputBar, { backgroundColor: isDark ? CL.chatBgDark : CL.chatBgLight }]}>
                    <View style={[styles.inputRow, { backgroundColor: isDark ? CL.inputBgDark : CL.inputBgLight }]}>
                        <TouchableOpacity style={styles.inputIcon} onPress={abrirGaleria}>
                            <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.textInput, { color: isDark ? CL.textPrimaryDark : CL.textPrimary }]}
                            value={texto} onChangeText={setTexto} placeholder="Mensaje"
                            placeholderTextColor={colors.textSecondary} multiline maxLength={500}
                        />
                        <TouchableOpacity style={styles.inputIcon} onPress={abrirGaleria}>
                            <Ionicons name="attach" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                        {!hasText && (
                            <TouchableOpacity style={styles.inputIcon} onPress={abrirCamara}>
                                <Ionicons name="camera" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {hasText ? (
                        <TouchableOpacity style={styles.fabButton} onPress={enviarTexto} disabled={sending} activeOpacity={0.7}>
                            <Ionicons name="send" size={22} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.fabButton} onPress={startRecording} disabled={sending} activeOpacity={0.7}>
                            <Ionicons name="mic" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: CL.chatBgLight },
    header: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: CL.headerMid,
        paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 10, paddingHorizontal: 10,
    },
    headerAvatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden',
    },
    headerAvatarImg: { width: 40, height: 40, borderRadius: 20 },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 18, fontWeight: '600', color: '#fff' },
    headerStatus: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    headerAction: { padding: 8 },
    emptyState: {
        flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    emptyBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD',
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, marginBottom: 24,
    },
    emptyBadgeText: { fontSize: 12, color: CL.textSecondary, marginLeft: 6 },
    emptyIcon: { fontSize: 48, marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: CL.textSecondary, textAlign: 'center' },
    messagesList: { paddingHorizontal: 4, paddingVertical: 8, paddingBottom: 4 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3 },
    msgRowMine: { justifyContent: 'flex-end' },
    msgRowOther: { justifyContent: 'flex-start' },
    msgAvatar: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.15)',
        alignItems: 'center', justifyContent: 'center', marginHorizontal: 3, overflow: 'hidden',
    },
    msgAvatarImg: { width: 28, height: 28, borderRadius: 14 },
    bubble: {
        maxWidth: '80%', borderRadius: 12, paddingHorizontal: 10,
        paddingTop: 6, paddingBottom: 4, position: 'relative',
    },
    bubbleMine: { backgroundColor: CL.bubbleMineLight, borderTopRightRadius: 2 },
    bubbleOther: { backgroundColor: CL.bubbleOtherLight, borderTopLeftRadius: 2 },
    bubbleImage: { padding: 3, overflow: 'hidden' },
    bubbleTail: {
        position: 'absolute', top: 0, width: 0, height: 0,
        borderTopWidth: 10, borderBottomWidth: 0,
    },
    tailMine: {
        right: -6, borderLeftWidth: 6, borderRightWidth: 6,
        borderTopColor: CL.bubbleMineLight, borderLeftColor: 'transparent', borderRightColor: 'transparent',
    },
    tailOther: {
        left: -6, borderLeftWidth: 6, borderRightWidth: 6,
        borderTopColor: CL.bubbleOtherLight, borderLeftColor: 'transparent', borderRightColor: 'transparent',
    },
    senderLabel: { fontSize: 12, fontWeight: '700', color: CL.headerMid, marginBottom: 2 },
    msgText: { fontSize: 15.5, color: CL.textPrimary, lineHeight: 21 },
    chatImage: { width: SCREEN_WIDTH * 0.6, height: SCREEN_WIDTH * 0.6, borderRadius: 6 },
    footer: {
        flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2,
    },
    footerImage: {
        position: 'absolute', bottom: 6, right: 8, backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
    },
    timeText: { fontSize: 11, color: CL.timeText },
    timeImage: { color: '#fff' },
    audioRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 4, minWidth: 200,
    },
    audioAvatar: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: CL.audioAccent,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    audioAvatarMine: { backgroundColor: CL.headerMid },
    playBtn: { paddingHorizontal: 6 },
    waveformContainer: { flex: 1, marginLeft: 4 },
    waveform: { flexDirection: 'row', alignItems: 'center', height: 28, gap: 1.5 },
    waveBar: { width: 2.5, borderRadius: 2 },
    audioDur: { fontSize: 11, color: CL.timeText, marginTop: 1 },
    recordBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    },
    recordTrash: { padding: 8 },
    recordCenter: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
    recordDot: {
        width: 12, height: 12, borderRadius: 6, backgroundColor: CL.recording, marginRight: 10,
    },
    recordTimer: {
        fontSize: 20, fontWeight: '600', color: CL.textPrimary, fontVariant: ['tabular-nums'],
    },
    recordSendBtn: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: CL.accent,
        alignItems: 'center', justifyContent: 'center',
    },
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 6, paddingVertical: 6,
        paddingBottom: Platform.OS === 'ios' ? 26 : 6, backgroundColor: CL.chatBgLight,
    },
    inputRow: {
        flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: CL.inputBgLight,
        borderRadius: 24, paddingHorizontal: 6, paddingVertical: Platform.OS === 'ios' ? 6 : 2, minHeight: 46,
    },
    inputIcon: { padding: 6, justifyContent: 'center' },
    textInput: {
        flex: 1, fontSize: 16, color: CL.textPrimary, maxHeight: 100,
        paddingHorizontal: 4, paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    },
    fabButton: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: CL.headerMid,
        alignItems: 'center', justifyContent: 'center', marginLeft: 6,
    },
    previewOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center',
    },
    previewClose: {
        position: 'absolute', top: Platform.OS === 'ios' ? 54 : 36, right: 16, zIndex: 10, padding: 8,
    },
    previewImage: { width: SCREEN_WIDTH * 0.95, height: SCREEN_WIDTH * 1.2 },
});

export default React.memo(ChatScreen);
