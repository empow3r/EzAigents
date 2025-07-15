import useSWR from 'swr';
import { cacheApiResponse, getCachedApiResponse } from '../utils/cacheManager';

// Optimized fetcher with caching
const fetcher = async (url) => {
  // Check cache first
  const cached = getCachedApiResponse(url);
  if (cached) {
    return cached;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  
  const data = await res.json();
  
  // Cache the response
  cacheApiResponse(url, data, 30000);
  
  return data;
};

// Optimized data hook with SWR
export const useOptimizedData = (url, options = {}) => {
  const {
    refreshInterval = 5000,
    dedupingInterval = 2000,
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
    ...swrOptions
  } = options;

  return useSWR(url, fetcher, {
    refreshInterval,
    dedupingInterval,
    revalidateOnFocus,
    revalidateOnReconnect,
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    loadingTimeout: 5000,
    ...swrOptions
  });
};

// Multi-endpoint data fetching
export const useMultipleOptimizedData = (endpoints) => {
  const results = endpoints.map(endpoint => 
    useOptimizedData(endpoint.url, endpoint.options)
  );

  const isLoading = results.some(result => result.isLoading);
  const error = results.find(result => result.error)?.error;
  const data = results.reduce((acc, result, index) => {
    acc[endpoints[index].key] = result.data;
    return acc;
  }, {});

  return {
    data,
    isLoading,
    error,
    mutate: () => results.forEach(result => result.mutate())
  };
};

// Prefetch data for faster initial loads
export const prefetchData = async (urls) => {
  await Promise.all(
    urls.map(url => fetcher(url).catch(() => null))
  );
};