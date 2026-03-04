/**
 * TaskEditorModal.tsx — Modal para crear/editar tareas personalizadas.
 *
 * El familiar puede añadir tareas extra al día de la cuidadora.
 * Campos: texto, hora, tipo de tarea.
 * Se abre como modal bottom-sheet.
 * Integra: tareasService.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, SHADOWS } from '../styles/theme';

interface Tarea {
    tipo: string;
    hora: string;
    descripcion: string;
    completada: boolean;
    icono: string;
}

interface TaskEditorModalProps {
    visible: boolean;
    tareas: Tarea[];
    onClose: () => void;
    onSave: (tareas: Tarea[]) => void;
}

const TASK_TYPES = [
    { value: 'LLEGADA', label: 'Llegada', color: '#2E7D32' },
    { value: 'PASTILLA', label: 'Medicamento', color: '#1565C0' },
    { value: 'PASEO', label: 'Paseo', color: '#E65100' },
    { value: 'COMIDA', label: 'Comida', color: '#6A1B9A' },
    { value: 'SIESTA', label: 'Siesta', color: '#4527A0' },
];

const TaskEditorModal: React.FC<TaskEditorModalProps> = ({ visible, tareas, onClose, onSave }) => {
    const { colors } = useTheme();

    const [editingTareas, setEditingTareas] = useState<Tarea[]>(tareas);
    const [newTaskType, setNewTaskType] = useState('LLEGADA');
    const [newTaskHora, setNewTaskHora] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');

    const handleAddTask = () => {
        if (!newTaskHora.trim() || !newTaskDesc.trim()) {
            Alert.alert('Error', 'Por favor completa hora y descripción');
            return;
        }

        const newTask: Tarea = {
            tipo: newTaskType,
            hora: newTaskHora,
            descripcion: newTaskDesc,
            completada: false,
            icono: newTaskType[0],
        };

        setEditingTareas([...editingTareas, newTask]);
        setNewTaskHora('');
        setNewTaskDesc('');
        setNewTaskType('LLEGADA');
    };

    const handleDeleteTask = (index: number) => {
        Alert.alert(
            'Eliminar tarea',
            '¿Estás seguro?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        setEditingTareas(editingTareas.filter((_, i) => i !== index));
                    },
                },
            ]
        );
    };

    const handleSave = () => {
        onSave(editingTareas);
        onClose();
    };

    const getTaskTypeLabel = (tipo: string) => {
        return TASK_TYPES.find(t => t.value === tipo)?.label || tipo;
    };

    const getTaskTypeColor = (tipo: string) => {
        return TASK_TYPES.find(t => t.value === tipo)?.color || '#666';
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Editar Tareas</Text>
                    <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: colors.primary }]}>
                        <Text style={styles.saveButtonText}>Guardar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Current Tasks Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Tareas Actuales ({editingTareas.length})
                        </Text>
                        {editingTareas.length === 0 ? (
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No hay tareas. Añade una nueva.
                            </Text>
                        ) : (
                            editingTareas.map((tarea, index) => (
                                <View key={index} style={[styles.taskItem, { backgroundColor: colors.card, ...SHADOWS.small }]}>
                                    <View
                                        style={[
                                            styles.taskBadge,
                                            { backgroundColor: getTaskTypeColor(tarea.tipo) },
                                        ]}
                                    >
                                        <Text style={styles.taskBadgeText}>{tarea.tipo[0]}</Text>
                                    </View>
                                    <View style={styles.taskItemInfo}>
                                        <Text style={[styles.taskItemTime, { color: colors.text }]}>{tarea.hora}</Text>
                                        <Text style={[styles.taskItemDesc, { color: colors.textSecondary }]}>{tarea.descripcion}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteTask(index)}
                                        style={styles.deleteButton}
                                    >
                                        <Text style={styles.deleteButtonText}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Add New Task Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Añadir Nueva Tarea</Text>

                        {/* Task Type Selector */}
                        <View style={styles.formGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
                            <View style={styles.typeButtonsContainer}>
                                {TASK_TYPES.map((taskType) => (
                                    <TouchableOpacity
                                        key={taskType.value}
                                        style={[
                                            styles.typeButton,
                                            { borderColor: colors.border, backgroundColor: colors.card },
                                            newTaskType === taskType.value && {
                                                borderWidth: 2,
                                                backgroundColor: colors.inputBg,
                                            },
                                        ]}
                                        onPress={() => setNewTaskType(taskType.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.typeButtonText,
                                                { color: colors.textSecondary },
                                                newTaskType === taskType.value && {
                                                    color: taskType.color,
                                                    fontWeight: '700',
                                                },
                                            ]}
                                        >
                                            {taskType.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Hour Input */}
                        <View style={styles.formGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Hora</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                placeholder="14:30"
                                placeholderTextColor={colors.textSecondary}
                                value={newTaskHora}
                                onChangeText={setNewTaskHora}
                                maxLength={5}
                            />
                        </View>

                        {/* Description Input */}
                        <View style={styles.formGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Descripción</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.descriptionInput,
                                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                                ]}
                                placeholder="Ej: Preparar comida"
                                placeholderTextColor={colors.textSecondary}
                                value={newTaskDesc}
                                onChangeText={setNewTaskDesc}
                                multiline
                                numberOfLines={2}
                            />
                        </View>

                        {/* Add Button */}
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: colors.primary }]}
                            onPress={handleAddTask}
                        >
                            <Text style={styles.addButtonText}>➕ Añadir</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeButton: {
        padding: SPACING.sm,
    },
    closeButtonText: {
        fontSize: 22,
    },
    saveButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: 6,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 13,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    section: {
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: SPACING.md,
    },
    emptyText: {
        fontSize: 13,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: SPACING.md,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: SPACING.md,
        overflow: 'hidden',
        gap: 0,
    },
    taskBadge: {
        width: 50,
        height: 50,
        borderRadius: 0,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 50,
    },
    taskBadgeText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    taskItemInfo: {
        flex: 1,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
    },
    taskItemTime: {
        fontSize: 14,
        fontWeight: '700',
    },
    taskItemDesc: {
        fontSize: 13,
        marginTop: 2,
    },
    deleteButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        fontSize: 18,
    },
    formGroup: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    typeButtonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    typeButton: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: 6,
        borderWidth: 1,
    },
    typeButtonText: {
        fontSize: 12,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        fontSize: 13,
    },
    descriptionInput: {
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.sm,
        textAlignVertical: 'top',
    },
    addButton: {
        borderRadius: 6,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    addButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 13,
    },
});

export default TaskEditorModal;
