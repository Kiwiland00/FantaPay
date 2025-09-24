import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cross-platform storage utility for React Native and Web
 * Uses AsyncStorage for React Native and localStorage for Web
 */
class CrossPlatformStorage {
  /**
   * Store a value with the given key
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('CrossPlatformStorage setItem error:', error);
      throw error;
    }
  }

  /**
   * Retrieve a value by key
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('CrossPlatformStorage getItem error:', error);
      throw error;
    }
  }

  /**
   * Remove a value by key
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('CrossPlatformStorage removeItem error:', error);
      throw error;
    }
  }

  /**
   * Clear all stored values
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('CrossPlatformStorage clear error:', error);
      throw error;
    }
  }

  /**
   * Get all keys
   */
  static async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('CrossPlatformStorage getAllKeys error:', error);
      throw error;
    }
  }

  /**
   * Get multiple values by keys
   */
  static async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('CrossPlatformStorage multiGet error:', error);
      throw error;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  static async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('CrossPlatformStorage multiSet error:', error);
      throw error;
    }
  }

  /**
   * Remove multiple keys
   */
  static async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('CrossPlatformStorage multiRemove error:', error);
      throw error;
    }
  }
}

export default CrossPlatformStorage;