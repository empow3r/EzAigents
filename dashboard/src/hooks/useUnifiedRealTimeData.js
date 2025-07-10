import { useState, useEffect, useRef, useCallback } from 'react';

const WEBSOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'wss://localhost:3001/realtime' 
  : 'ws://localhost:3001/realtime';

const FALLBACK_POLL_INTERVAL = 10000; // 10 seconds fallback polling

let globalDataStore = {
  data: {},
  subscribers: new Set(),
  websocket: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
};

export const useUnifiedRealTimeData = (dataKeys = []) => {
  const [data, setData] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const subscriberRef = useRef(null);
  const fallbackIntervalRef = useRef(null);

  const updateData = useCallback((newData) => {
    setData(prevData => {
      const updatedData = { ...prevData, ...newData };
      
      // Only include requested data keys if specified
      if (dataKeys.length > 0) {
        const filteredData = {};
        dataKeys.forEach(key => {
          if (updatedData[key] !== undefined) {
            filteredData[key] = updatedData[key];
          }
        });
        return filteredData;
      }
      
      return updatedData;
    });
  }, [dataKeys]);

  const connectWebSocket = useCallback(() => {
    if (globalDataStore.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WEBSOCKET_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        globalDataStore.reconnectAttempts = 0;
        
        // Request specific data keys if provided
        if (dataKeys.length > 0) {
          ws.send(JSON.stringify({ type: 'subscribe', keys: dataKeys }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Update global store
          globalDataStore.data = { ...globalDataStore.data, ...message.data };
          
          // Notify all subscribers
          globalDataStore.subscribers.forEach(callback => {
            callback(message.data);
          });
        } catch (parseError) {
          console.error('Failed to parse WebSocket message:', parseError);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect
        if (globalDataStore.reconnectAttempts < globalDataStore.maxReconnectAttempts) {
          globalDataStore.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, globalDataStore.reconnectAttempts), 30000);
          setTimeout(connectWebSocket, delay);
        } else {
          // Start fallback polling
          startFallbackPolling();
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection failed');
      };
      
      globalDataStore.websocket = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to create WebSocket connection');
      startFallbackPolling();
    }
  }, [dataKeys]);

  const startFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) return;
    
    console.log('Starting fallback polling');
    
    const pollData = async () => {
      try {
        const endpoints = dataKeys.length > 0 ? dataKeys : [
          'agent-stats',
          'queue-stats',
          'system-health',
          'redis-status'
        ];
        
        const promises = endpoints.map(endpoint => 
          fetch(`/api/${endpoint}`)
            .then(res => res.json())
            .then(data => ({ [endpoint]: data }))
            .catch(error => {
              console.error(`Failed to fetch ${endpoint}:`, error);
              return { [endpoint]: null };
            })
        );
        
        const results = await Promise.all(promises);
        const combinedData = results.reduce((acc, result) => ({ ...acc, ...result }), {});
        
        updateData(combinedData);
        setError(null);
      } catch (error) {
        console.error('Fallback polling failed:', error);
        setError('Failed to fetch data');
      }
    };
    
    // Initial poll
    pollData();
    
    // Set up interval
    fallbackIntervalRef.current = setInterval(pollData, FALLBACK_POLL_INTERVAL);
  }, [dataKeys, updateData]);

  useEffect(() => {
    // Create subscriber function
    subscriberRef.current = updateData;
    globalDataStore.subscribers.add(subscriberRef.current);
    
    // Set initial data from global store
    if (Object.keys(globalDataStore.data).length > 0) {
      updateData(globalDataStore.data);
    }
    
    // Connect WebSocket or start polling
    if (typeof window !== 'undefined') {
      connectWebSocket();
    }
    
    return () => {
      // Clean up subscriber
      if (subscriberRef.current) {
        globalDataStore.subscribers.delete(subscriberRef.current);
      }
      
      // Clean up fallback polling
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      
      // Close WebSocket if no more subscribers
      if (globalDataStore.subscribers.size === 0 && globalDataStore.websocket) {
        globalDataStore.websocket.close();
        globalDataStore.websocket = null;
      }
    };
  }, [connectWebSocket, updateData]);

  const refetch = useCallback(() => {
    if (globalDataStore.websocket?.readyState === WebSocket.OPEN) {
      globalDataStore.websocket.send(JSON.stringify({ type: 'refresh', keys: dataKeys }));
    } else {
      startFallbackPolling();
    }
  }, [dataKeys, startFallbackPolling]);

  return {
    data,
    isConnected,
    error,
    refetch,
  };
};

// Helper hook for specific data types
export const useAgentStats = () => {
  return useUnifiedRealTimeData(['agent-stats']);
};

export const useQueueStats = () => {
  return useUnifiedRealTimeData(['queue-stats']);
};

export const useSystemHealth = () => {
  return useUnifiedRealTimeData(['system-health', 'redis-status']);
};