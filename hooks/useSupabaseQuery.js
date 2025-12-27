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

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
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
      
      // 3. If fetch fails, try to load from cache
      const cachedData = await offlineStorage.load(key);
      if (cachedData) {
        setData(cachedData);
        setIsOffline(true); // Indicate we are serving offline data
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [key, ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { 
    data, 
    error, 
    loading, 
    refreshing, 
    isOffline, 
    refetch: () => fetchData(true) 
  };
};
