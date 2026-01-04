import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '../lib/offlineStorage';

/**
 * A hook to fetch data with offline fallback.
 * 
 * @param {string} key - Unique key for caching (e.g., 'announcements_list')
 * @param {Function} queryFn - Async function that fetches data from Supabase
 * @param {Array} dependencies - Dependencies to re-run the fetch (like useEffect)
 */
export const useSupabaseQuery = (key, queryFn, dependencies = []) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initial fetch and cache loading
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // 1. Try to load from cache immediately
      try {
        const cachedData = await offlineStorage.load(key);
        if (isMounted && cachedData) {
          setData(cachedData);
          setIsOffline(true);
        }
      } catch (err) {
        console.warn(`[useSupabaseQuery] Initial cache load failed for ${key}:`, err);
      }

      // 2. Perform initial fetch
      if (isMounted) {
        fetchData();
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [key, fetchData]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      // Only show loading if we have no data yet
      if (!data) {
        setLoading(true);
      }
    }
    
    setIsOffline(false);
    setError(null);

    try {
      // 1. Try to fetch fresh data
      const result = await queryFn();
      
      // 2. If successful, update state and cache
      setData(result);
      offlineStorage.save(key, result);
      
    } catch (err) {
      console.warn(`[OfflineFallback] Fetch failed for ${key}:`, err);
      setError(err);
      
      // 3. Fallback already handled by initial load, but try again if we have nothing
      if (!data) {
        const cachedData = await offlineStorage.load(key);
        if (cachedData) {
          setData(cachedData);
          setIsOffline(true);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [key, queryFn, ...dependencies]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { 
    data, 
    error, 
    loading, 
    refreshing, 
    isOffline, 
    refetch 
  };
};
