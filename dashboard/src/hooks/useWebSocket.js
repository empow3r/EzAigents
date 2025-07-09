import { useEffect, useRef, useState, useCallback } from 'react';

const useWebSocket = (url, options = {}) => {
  const [socketState, setSocketState] = useState('connecting');
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);

  const {
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    shouldReconnect = () => true,
    onOpen = () => {},
    onClose = () => {},
    onError = () => {},
    onMessage = () => {},
  } = options;

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      socketRef.current = new WebSocket(url);
      
      socketRef.current.onopen = (event) => {
        setSocketState('connected');
        setConnectionAttempts(0);
        onOpen(event);
        
        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          socketRef.current.send(message);
        }
      };

      socketRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setLastMessage(message);
        onMessage(message);
      };

      socketRef.current.onclose = (event) => {
        setSocketState('disconnected');
        onClose(event);
        
        if (shouldReconnect() && connectionAttempts < reconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, connectionAttempts);
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      socketRef.current.onerror = (error) => {
        setSocketState('error');
        onError(error);
      };
    } catch (error) {
      setSocketState('error');
      onError(error);
    }
  }, [url, reconnectAttempts, reconnectDelay, shouldReconnect, connectionAttempts, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.close();
    }
  }, []);

  const sendMessage = useCallback((message) => {
    const messageString = typeof message === 'string' ? message : JSON.stringify(message);
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(messageString);
    } else {
      // Queue message for when connection is ready
      messageQueueRef.current.push(messageString);
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socketState,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
};

export default useWebSocket;