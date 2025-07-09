import io from 'socket.io-client';

class CollaborationService {
  constructor() {
    this.socket = null;
    this.userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.callbacks = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  initialize(config = {}) {
    const {
      url = process.env.NEXT_PUBLIC_COLLAB_URL || 'http://localhost:3001',
      roomId = 'default-room',
      userData = { name: 'User', type: 'user' }
    } = config;

    this.roomId = roomId;
    this.userData = { ...userData, id: this.userId };

    // Initialize Socket.IO connection
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.setupSocketListeners();
    
    // Join room on connection
    this.socket.on('connect', () => {
      console.log('Connected to collaboration server');
      this.joinRoom();
    });

    return this;
  }

  setupSocketListeners() {
    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from collaboration server:', reason);
      this.emit('connectionLost', { reason });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      this.joinRoom();
      this.emit('connectionRestored', { attempts: attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
      this.emit('reconnectError', { error });
    });

    // Room events
    this.socket.on('room-joined', (data) => {
      console.log('Joined room:', data);
      this.emit('roomJoined', data);
    });

    this.socket.on('user-joined', (user) => {
      console.log('User joined:', user);
      this.emit('userJoin', user);
    });

    this.socket.on('user-left', (userId) => {
      console.log('User left:', userId);
      this.emit('userLeave', userId);
    });

    this.socket.on('room-users', (users) => {
      console.log('Room users:', users);
      this.emit('roomUsers', users);
    });

    // Collaboration events
    this.socket.on('message', (message) => {
      this.emit('message', message);
    });

    this.socket.on('cursor-position', (data) => {
      if (data.userId !== this.userId) {
        this.emit('cursorMove', data);
      }
    });

    this.socket.on('annotation', (annotation) => {
      this.emit('annotation', annotation);
    });

    this.socket.on('viewport-sync', (data) => {
      if (data.userId !== this.userId) {
        this.emit('viewportSync', data);
      }
    });

    this.socket.on('code-change', (change) => {
      if (change.userId !== this.userId) {
        this.emit('codeChange', change);
      }
    });

    this.socket.on('selection-change', (selection) => {
      if (selection.userId !== this.userId) {
        this.emit('selectionChange', selection);
      }
    });

    this.socket.on('file-lock-status', (status) => {
      this.emit('fileLockStatus', status);
    });

    // Redis pub/sub events
    this.socket.on('redis-message', (data) => {
      this.emit('redisMessage', data);
    });
  }

  joinRoom() {
    this.socket.emit('join-room', {
      roomId: this.roomId,
      user: this.userData
    });
  }

  sendMessage(message) {
    const fullMessage = {
      ...message,
      userId: this.userId,
      roomId: this.roomId,
      timestamp: message.timestamp || new Date().toISOString()
    };

    this.socket.emit('send-message', fullMessage);
  }

  sendCursorPosition(position) {
    this.socket.emit('cursor-move', {
      userId: this.userId,
      roomId: this.roomId,
      position,
      userData: this.userData
    });
  }

  sendAnnotation(annotation) {
    const fullAnnotation = {
      ...annotation,
      userId: this.userId,
      roomId: this.roomId,
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.socket.emit('add-annotation', fullAnnotation);
  }

  syncViewport(viewport) {
    this.socket.emit('sync-viewport', {
      userId: this.userId,
      roomId: this.roomId,
      viewport
    });
  }

  sendCodeChange(change) {
    this.socket.emit('code-change', {
      userId: this.userId,
      roomId: this.roomId,
      ...change
    });
  }

  sendSelectionChange(selection) {
    this.socket.emit('selection-change', {
      userId: this.userId,
      roomId: this.roomId,
      ...selection
    });
  }

  requestFileLock(filePath) {
    return new Promise((resolve) => {
      this.socket.emit('request-file-lock', {
        userId: this.userId,
        filePath,
        roomId: this.roomId
      }, (response) => {
        resolve(response);
      });
    });
  }

  releaseFileLock(filePath) {
    this.socket.emit('release-file-lock', {
      userId: this.userId,
      filePath,
      roomId: this.roomId
    });
  }

  startScreenShare() {
    return new Promise((resolve) => {
      this.socket.emit('start-screen-share', {
        userId: this.userId,
        roomId: this.roomId
      }, (response) => {
        resolve(response.success);
      });
    });
  }

  stopScreenShare() {
    this.socket.emit('stop-screen-share', {
      userId: this.userId,
      roomId: this.roomId
    });
  }

  // Event emitter pattern
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  // Redis integration for agent communication
  subscribeToAgentEvents() {
    this.socket.emit('subscribe-redis', {
      channels: [
        'agent-chat',
        'agent-status',
        'file-locks',
        'coordination-required'
      ]
    });
  }

  sendAgentMessage(channel, message) {
    this.socket.emit('publish-redis', {
      channel,
      message: {
        ...message,
        from: this.userId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks = {};
  }
}

// Singleton instance
let collaborationService = null;

export function getCollaborationService() {
  if (!collaborationService) {
    collaborationService = new CollaborationService();
  }
  return collaborationService;
}

// React hook for easier usage
export function useCollaborationService() {
  const service = getCollaborationService();

  const initializeCollaboration = (callbacks) => {
    service.initialize();

    // Register callbacks
    Object.entries(callbacks).forEach(([event, callback]) => {
      service.on(event, callback);
    });

    // Subscribe to agent events
    service.subscribeToAgentEvents();

    return () => {
      // Cleanup on unmount
      Object.entries(callbacks).forEach(([event, callback]) => {
        service.off(event, callback);
      });
    };
  };

  return {
    initializeCollaboration,
    sendMessage: service.sendMessage.bind(service),
    sendCursorPosition: service.sendCursorPosition.bind(service),
    sendAnnotation: service.sendAnnotation.bind(service),
    syncViewport: service.syncViewport.bind(service),
    sendCodeChange: service.sendCodeChange.bind(service),
    sendSelectionChange: service.sendSelectionChange.bind(service),
    requestFileLock: service.requestFileLock.bind(service),
    releaseFileLock: service.releaseFileLock.bind(service),
    startScreenShare: service.startScreenShare.bind(service),
    stopScreenShare: service.stopScreenShare.bind(service),
    sendAgentMessage: service.sendAgentMessage.bind(service),
    disconnect: service.disconnect.bind(service)
  };
}