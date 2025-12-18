import { useState, useCallback, useEffect } from 'react';
import { useNetwork } from './useNetwork';
import { sync, getSyncStatus, addSyncStatusListener } from '../lib/sync';

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);

  const { isConnected } = useNetwork();

  const triggerSync = useCallback(async () => {
    if (!isConnected || isSyncing) {
      return;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);

      await sync();

      setLastSyncTime(Date.now());
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isConnected, isSyncing]);

  useEffect(() => {
    const unsubscribe = addSyncStatusListener((status) => {
      setIsSyncing(status.state === 'syncing');
      setLastSyncTime(status.lastSyncTime);
      setSyncError(status.error);
      setPendingChanges(status.pendingChanges);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isConnected && !isSyncing && pendingChanges > 0) {
      triggerSync();
    }
  }, [isConnected, isSyncing, pendingChanges, triggerSync]);

  return {
    isSyncing,
    lastSyncTime,
    syncError,
    pendingChanges,
    triggerSync,
  };
}
