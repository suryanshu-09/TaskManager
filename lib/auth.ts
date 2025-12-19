import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const CLERK_PUBLISHABLE_KEY =
  process.env.CLERK_PUBLISHABLE_KEY || 'pk_test_aGlwLXNoZWVwZG9nLTIzLmNsZXJrLmFjY291bnRzLmRldiQ';

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting token from cache:', error);
      return null;
    }
  },

  async saveToken(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error saving token to cache:', error);
    }
  },

  async clearToken(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error clearing token from cache:', error);
    }
  },
};
