class SimpleEventEmitter {
    private listeners: { [key: string]: ((...args: any[]) => void)[] } = {};

    on(event: string, callback: (...args: any[]) => void) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event: string, ...args: any[]) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(...args));
        }
    }

    removeListener(event: string, callback: (...args: any[]) => void) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
}

const taskEventEmitter = new SimpleEventEmitter();

export const notifyTasksChanged = () => {
    taskEventEmitter.emit('tasksChanged');
};

export const notifyEventCreated = (tipo: string) => {
    taskEventEmitter.emit('eventCreated', tipo);
};

export const notifyNuevaNotaCreated = () => {
    taskEventEmitter.emit('nuevaNota');
};

export const onTasksChanged = (callback: () => void) => {
    taskEventEmitter.on('tasksChanged', callback);
    return () => {
        taskEventEmitter.removeListener('tasksChanged', callback);
    };
};

export const onEventCreated = (callback: (tipo: string) => void) => {
    taskEventEmitter.on('eventCreated', callback);
    return () => {
        taskEventEmitter.removeListener('eventCreated', callback);
    };
};

export const onNuevaNotaCreated = (callback: () => void) => {
    taskEventEmitter.on('nuevaNota', callback);
    return () => {
        taskEventEmitter.removeListener('nuevaNota', callback);
    };
};

export const notifyNotaLeida = (notaId: string) => {
    taskEventEmitter.emit('notaLeida', notaId);
};

export const onNotaLeida = (callback: (notaId: string) => void) => {
    taskEventEmitter.on('notaLeida', callback);
    return () => {
        taskEventEmitter.removeListener('notaLeida', callback);
    };
};

export default taskEventEmitter;
