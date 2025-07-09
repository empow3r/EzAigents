import { useEffect, useRef } from 'react';
import { getCollaborationService } from '../services/collaboration-service';

export function useCollaborationService() {
  const serviceRef = useRef(null);

  useEffect(() => {
    serviceRef.current = getCollaborationService();

    return () => {
      // Cleanup if needed
    };
  }, []);

  const initializeCollaboration = (callbacks) => {
    if (!serviceRef.current) return;

    serviceRef.current.initialize();

    // Register callbacks
    Object.entries(callbacks).forEach(([event, callback]) => {
      serviceRef.current.on(event, callback);
    });

    // Subscribe to agent events
    serviceRef.current.subscribeToAgentEvents();

    return () => {
      // Cleanup on unmount
      Object.entries(callbacks).forEach(([event, callback]) => {
        serviceRef.current.off(event, callback);
      });
    };
  };

  return {
    initializeCollaboration,
    sendMessage: (message) => serviceRef.current?.sendMessage(message),
    sendCursorPosition: (position) => serviceRef.current?.sendCursorPosition(position),
    sendAnnotation: (annotation) => serviceRef.current?.sendAnnotation(annotation),
    syncViewport: (viewport) => serviceRef.current?.syncViewport(viewport),
    sendCodeChange: (change) => serviceRef.current?.sendCodeChange(change),
    sendSelectionChange: (selection) => serviceRef.current?.sendSelectionChange(selection),
    requestFileLock: (filePath) => serviceRef.current?.requestFileLock(filePath),
    releaseFileLock: (filePath) => serviceRef.current?.releaseFileLock(filePath),
    startScreenShare: () => serviceRef.current?.startScreenShare(),
    stopScreenShare: () => serviceRef.current?.stopScreenShare(),
    sendAgentMessage: (channel, message) => serviceRef.current?.sendAgentMessage(channel, message),
    disconnect: () => serviceRef.current?.disconnect()
  };
}