import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'offline_cache_';
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const offlineStorage = {
  /**
   * Save data to cache
   * @param {string} key - Unique key for the data
   * @param {any} data - Data to store
   */
  save: async (key, data) => {
    try {
      const item = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to offline cache:', error);
    }
  },

  /**
   * Load data from cache
   * @param {string} key - Unique key for the data
   * @returns {Promise<any|null>} - The cached data or null if not found/expired
   */
  load: async (key) => {
    try {
      const serialized = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!serialized) return null;

      const item = JSON.parse(serialized);
      // We can add expiry logic here if needed, for now we return whatever is there
      // so users can see old data rather than no data when offline.
      return item.data;
    } catch (error) {
      console.warn('Failed to load from offline cache:', error);
      return null;
    }
  },

  /**
   * Clear specific cache key
   */
  remove: async (key) => {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.warn('Failed to remove from offline cache:', error);
    }
  }
};
