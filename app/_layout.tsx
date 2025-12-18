import { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { initializeDatabase } from '../lib/db';
import { CLERK_PUBLISHABLE_KEY, tokenCache } from '../lib/auth';
import { setAuthTokenGetter } from '../lib/api';
import { initializeNetworkMonitoring, stopNetworkMonitoring } from '../lib/network';
import { initializeSync, cleanupSync } from '../lib/sync';
import '../global.css';

function SyncInitializer({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const [isSyncInitialized, setIsSyncInitialized] = useState(false);

  const tokenGetter = useCallback(async () => {
    try {
      const token = await getToken();
      console.log('Token retrieved from Clerk:', !!token, 'Length:', token?.length || 0);
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }, [getToken]);

  useEffect(() => {
    console.log('SyncInitializer: isSignedIn =', isSignedIn);

    setAuthTokenGetter(tokenGetter);

    const initAsync = async () => {
      await initializeNetworkMonitoring();

      if (isSignedIn) {
        console.log('User is signed in, initializing sync');
        initializeSync();
        setIsSyncInitialized(true);
      } else {
        console.log('User is not signed in, skipping sync initialization');
      }
    };

    initAsync();

    return () => {
      cleanupSync();
      stopNetworkMonitoring();
    };
  }, [tokenGetter, isSignedIn]);

  useEffect(() => {
    if (isSignedIn && !isSyncInitialized) {
      initializeSync();
      setIsSyncInitialized(true);
    } else if (!isSignedIn && isSyncInitialized) {
      cleanupSync();
      setIsSyncInitialized(false);
    }
  }, [isSignedIn, isSyncInitialized]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    try {
      initializeDatabase();
    } catch (error) {
      console.error('Database initialization error:', error);
    } finally {
      setIsDbReady(true);
    }
  }, []);

  if (!isDbReady) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: '#F9FAFB',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color="#4F79DB" />
      </SafeAreaView>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <SyncInitializer>
            <SafeAreaView
              style={{ flex: 1, backgroundColor: '#F9FAFB' }}
              edges={['top', 'left', 'right']}>
              <Stack screenOptions={{ headerShown: false }} />
            </SafeAreaView>
          </SyncInitializer>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
