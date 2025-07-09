// Optimized Data Fetching Hook with Caching and Deduplication
import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedFetch, PollingManager } from '../utils/api-cache';

const pollingManager = new PollingManager();

export function useOptimizedData(url, options = {}) {
  const {
    pollingInterval = null,
    onError = null,
    transform = data => data,
    dependencies = [],
    enabled = true
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const pollingKeyRef = useRef(`polling-${url}-${Date.now()}`);

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;

    try {
      setError(null);
      const response = await cachedFetch(url);
      
      if (mountedRef.current) {
        const transformedData = transform(response);
        setData(transformedData);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
        if (onError) onError(err);
      }
    }
  }, [url, enabled, transform, onError]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initial fetch
    fetchData();

    // Set up polling if needed
    if (pollingInterval && enabled) {
      pollingManager.start(pollingKeyRef.current, fetchData, pollingInterval);
    }

    return () => {
      mountedRef.current = false;
      pollingManager.stop(pollingKeyRef.current);
    };
  }, [fetchData, pollingInterval, enabled, ...dependencies]);

  const refetch = useCallback(() => {
    setLoading(true);
    return fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// Hook for multiple API calls with optimized loading
export function useMultipleData(configs) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const newResults = {};
      const newErrors = {};

      await Promise.all(
        configs.map(async ({ key, url, transform = data => data }) => {
          try {
            const data = await cachedFetch(url);
            newResults[key] = transform(data);
          } catch (error) {
            newErrors[key] = error;
            newResults[key] = null;
          }
        })
      );

      setResults(newResults);
      setErrors(newErrors);
      setLoading(false);
    };

    fetchAll();
  }, []);

  return { results, loading, errors };
}

// Hook for paginated data with virtualization support
export function usePaginatedData(baseUrl, options = {}) {
  const {
    pageSize = 20,
    initialPage = 1,
    transform = data => data
  } = options;

  const [data, setData] = useState([]);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const url = `${baseUrl}?page=${page}&limit=${pageSize}`;
      const response = await cachedFetch(url);
      const newData = transform(response);

      setData(prev => [...prev, ...newData]);
      setHasMore(newData.length === pageSize);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, page, pageSize, loading, hasMore, transform]);

  const reset = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
  }, [initialPage]);

  return { data, loading, error, hasMore, loadMore, reset };
}

// Hook for real-time data with WebSocket fallback
export function useRealtimeData(url, wsUrl, options = {}) {
  const { 
    pollingInterval = 5000,
    transform = data => data 
  } = options;

  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  // Use standard polling as fallback
  const { data: polledData, loading, error } = useOptimizedData(url, {
    pollingInterval: connected ? null : pollingInterval,
    transform
  });

  useEffect(() => {
    if (!wsUrl || typeof WebSocket === 'undefined') return;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const newData = JSON.parse(event.data);
          setData(transform(newData));
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        console.log('WebSocket disconnected');
      };

      return () => {
        ws.close();
      };
    } catch (err) {
      console.error('WebSocket creation error:', err);
    }
  }, [wsUrl, transform]);

  // Use WebSocket data if connected, otherwise fall back to polling
  return {
    data: connected ? data : polledData,
    loading: !connected && loading,
    error: !connected ? error : null,
    connected
  };
}

export default useOptimizedData;