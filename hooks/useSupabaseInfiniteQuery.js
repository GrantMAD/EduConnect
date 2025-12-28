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

  // Helper to load from cache
  const loadFromCache = async () => {
    try {
      const cachedData = await offlineStorage.load(key);
      if (cachedData && Array.isArray(cachedData)) {
        setData(cachedData);
        setIsOffline(true);
        // If we loaded from cache, we assume there might be more on the server, 
        // but since we are likely offline or failed fetch, we can't really paginate easily.
        // For now, let's set hasMore to false if we are purely relying on cache.
        setHasMore(false); 
      }
    } catch (err) {
      console.warn(`[useSupabaseInfiniteQuery] Cache load failed for ${key}:`, err);
    }
  };

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
      setLoading(true);
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
        console.error(`[useSupabaseInfiniteQuery] Error fetching ${key}:`, fetchError);
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
      
      // If initial load fails, try cache
      if (!isLoadMore && !isRefresh && pageRef.current === 0) {
        await loadFromCache();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      isFetching.current = false;
    }
  }, [key, pageSize, ...dependencies]);

  // Initial fetch when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { 
    data, 
    setData,
    error, 
    loading, 
    loadingMore,
    refreshing, 
    isOffline, 
    hasMore,
    refetch: () => fetchData(true),
    loadMore: () => fetchData(false, true)
  };
};
