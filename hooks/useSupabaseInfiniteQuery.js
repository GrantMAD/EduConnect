import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage } from '../lib/offlineStorage';

/**
 * A hook to fetch paginated data with offline fallback.
 * 
 * @param {string} key - Unique key for caching (e.g., 'announcements_list')
 * @param {Function} queryBuilder - Function that returns a Supabase query builder. 
 *                                  It receives { from, to } as arguments.
 *                                  Example: ({ from, to }) => supabase.from('table').select('*').range(from, to)
 * @param {object} options - Configuration options
 * @param {number} options.pageSize - Number of items to fetch per page (default: 20)
 * @param {Array} options.dependencies - Dependencies to reset and re-fetch (like useEffect)
 */
export const useSupabaseInfiniteQuery = (key, queryBuilder, { pageSize = 20, dependencies = [] } = {}) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Initial load
  const [loadingMore, setLoadingMore] = useState(false); // Pagination load
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const pageRef = useRef(0);
  const isFetching = useRef(false);

  // Initial fetch and cache loading
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // 1. Try to load from cache immediately for this key
      try {
        const cachedData = await offlineStorage.load(key);
        if (isMounted && cachedData && Array.isArray(cachedData)) {
          setData(cachedData);
          setIsOffline(true);
          // If we have cache, we still want to fetch fresh data,
          // but maybe we don't show the initial skeleton?
          // We'll keep loading=true for now to indicate "refreshing background"
          // but the screen can choose to show data if it exists.
        }
      } catch (err) {
        console.warn(`[useSupabaseInfiniteQuery] Initial cache load failed for ${key}:`, err);
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

  const fetchData = useCallback(async (isRefresh = false, isLoadMore = false) => {
    if (isLoadMore && (!hasMore || loadingMore)) return;
    
    // Check if we are already fetching to prevent duplicate requests
    if (isFetching.current && !isRefresh) return; 

    isFetching.current = true;

    if (isRefresh) {
      setRefreshing(true);
      pageRef.current = 0;
      setHasMore(true);
    } else if (isLoadMore) {
      setLoadingMore(true);
    } else {
      // Only show full loading if we have no data yet
      if (data.length === 0) {
        setLoading(true);
      }
      pageRef.current = 0;
    }

    setIsOffline(false);
    setError(null);

    try {
      const from = pageRef.current * pageSize;
      const to = from + pageSize - 1;

      const query = queryBuilder({ from, to });
      const { data: newData, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }
      
      if (isRefresh || (!isLoadMore && pageRef.current === 0)) {
        setData(newData);
        offlineStorage.save(key, newData);
      } else {
        setData(prev => [...prev, ...newData]);
      }

      // Determine if there are more items
      if (newData.length < pageSize) {
        setHasMore(false);
      } else {
        pageRef.current += 1;
        setHasMore(true);
      }

    } catch (err) {
      console.warn(`[useSupabaseInfiniteQuery] Fetch failed for ${key}:`, err);
      setError(err);
      
      // Fallback already handled by initial load, but if fetch fails 
      // and we have nothing, we can try loading from cache again just in case
      if (data.length === 0) {
        const cached = await offlineStorage.load(key);
        if (cached) {
          setData(cached);
          setIsOffline(true);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      isFetching.current = false;
    }
  }, [key, pageSize, queryBuilder, ...dependencies]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);
  const loadMore = useCallback(() => fetchData(false, true), [fetchData]);

  return { 
    data, 
    setData,
    error, 
    loading, 
    loadingMore,
    refreshing, 
    isOffline, 
    hasMore,
    refetch,
    loadMore
  };
};
