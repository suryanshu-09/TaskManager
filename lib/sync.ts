import * as api from './api';
import {
  getLocallyCreatedTasks,
  getLocallyModifiedTasks,
  getLocallyDeletedTasks,
  markTaskAsSynced,
  removeSyncedDeletedTask,
  upsertTaskFromServer,
  getAllTasks,
  markTaskAsConflict,
} from './tasks';
import { isOnline, addNetworkListener } from './network';
import type { Task, TaskStatus } from '../types/task';
import { initializeDatabase } from './db';

export type SyncState = 'idle' | 'syncing' | 'error';

export interface SyncStatus {
  state: SyncState;
  lastSyncTime: number | null;
  pendingChanges: number;
  error: string | null;
  isOnline: boolean;
}

type SyncStatusListener = (status: SyncStatus) => void;
type SyncCompleteListener = (success: boolean, error?: string) => void;

let syncState: SyncState = 'idle';
let lastSyncTime: number | null = null;
let lastError: string | null = null;
let isSyncInProgress = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let networkUnsubscribe: (() => void) | null = null;

const statusListeners: Set<SyncStatusListener> = new Set();
const completeListeners: Set<SyncCompleteListener> = new Set();

const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS!);
const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_RETRY_ATTEMPTS!);
const RETRY_DELAY_MS = parseInt(process.env.RETRY_DELAY_MS!);
const ERROR_BACKOFF_MS = parseInt(process.env.ERROR_BACKOFF_MS!);

export function getSyncStatus(): SyncStatus {
  const pendingChanges = getPendingChangesCount();
  return {
    state: syncState,
    lastSyncTime,
    pendingChanges,
    error: lastError,
    isOnline: isOnline(),
  };
}

function getPendingChangesCount(): number {
  try {
    const created = getLocallyCreatedTasks().length;
    const modified = getLocallyModifiedTasks().length;
    const deleted = getLocallyDeletedTasks().length;
    return created + modified + deleted;
  } catch (error) {
    if (error instanceof Error && error.message?.includes('no such table')) {
      console.log('Database not yet initialized, returning 0 pending changes');
    }
    return 0;
  }
}

function notifyStatusListeners(): void {
  const status = getSyncStatus();
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (error) {
      console.error('Error in sync status listener:', error);
    }
  });
}

function notifySyncComplete(success: boolean, error?: string): void {
  completeListeners.forEach((listener) => {
    try {
      listener(success, error);
    } catch (e) {
      console.error('Error in sync complete listener:', e);
    }
  });
}

function setSyncState(state: SyncState, error?: string): void {
  syncState = state;
  if (error) {
    lastError = error;
  } else if (state === 'idle') {
    lastError = null;
  }
  notifyStatusListeners();
}

export function addSyncStatusListener(listener: SyncStatusListener): () => void {
  statusListeners.add(listener);
  listener(getSyncStatus());
  return () => statusListeners.delete(listener);
}

export function addSyncCompleteListener(listener: SyncCompleteListener): () => void {
  completeListeners.add(listener);
  return () => completeListeners.delete(listener);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pushChanges(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  let createdTasks: Task[] = [];
  try {
    createdTasks = getLocallyCreatedTasks();
  } catch (error) {
    if (error instanceof Error && error.message?.includes('no such table')) {
      console.log('Database not yet initialized for pushChanges');
    } else {
      throw error;
    }
  }
  for (const task of createdTasks) {
    try {
      const serverTask = await api.createTask({
        title: task.title,
        description: task.description ?? undefined,
        status: task.status,
        lastUpdatedAt: task.lastUpdatedAt,
      });
      markTaskAsSynced(task.id, { lastUpdatedAt: serverTask.lastUpdatedAt });
      console.log(`Synced created task: ${task.id}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to create task "${task.title}": ${msg}`);
      console.error(`Failed to sync created task ${task.id}:`, error);
    }
  }

  let modifiedTasks: Task[] = [];
  try {
    modifiedTasks = getLocallyModifiedTasks();
  } catch (error) {
    if (error instanceof Error && error.message?.includes('no such table')) {
      console.log('Database not yet initialized for modified tasks');
    } else {
      throw error;
    }
  }
  for (const task of modifiedTasks) {
    try {
      const serverTask = await api.updateTask(task.id, {
        title: task.title,
        description: task.description ?? undefined,
        status: task.status,
        lastUpdatedAt: task.serverLastUpdatedAt ?? task.lastUpdatedAt,
      });
      markTaskAsSynced(task.id, { lastUpdatedAt: serverTask.lastUpdatedAt });
      console.log(`Synced modified task: ${task.id}`);
    } catch (error) {
      if (error instanceof api.ConflictError) {
        console.log(`Conflict detected for task ${task.id}, resolving with last-write-wins`);
        await handleConflict(task, error.serverTask);
      } else if (error instanceof api.NotFoundError) {
        console.log(`Task ${task.id} not found on server, marking as conflict`);
        markTaskAsConflict(task.id);
        errors.push(`Task "${task.title}" was deleted on server`);
      } else {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to update task "${task.title}": ${msg}`);
        console.error(`Failed to sync modified task ${task.id}:`, error);
      }
    }
  }

  let deletedTasks: Task[] = [];
  try {
    deletedTasks = getLocallyDeletedTasks();
  } catch (error) {
    if (error instanceof Error && error.message?.includes('no such table')) {
      console.log('Database not yet initialized for deleted tasks');
    } else {
      throw error;
    }
  }
  for (const task of deletedTasks) {
    try {
      await api.deleteTask(task.id);
      removeSyncedDeletedTask(task.id);
      console.log(`Synced deleted task: ${task.id}`);
    } catch (error) {
      if (error instanceof api.NotFoundError) {
        removeSyncedDeletedTask(task.id);
        console.log(`Task ${task.id} already deleted on server, removing locally`);
      } else {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to delete task "${task.title}": ${msg}`);
        console.error(`Failed to sync deleted task ${task.id}:`, error);
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

async function handleConflict(localTask: Task, serverTask: api.ApiTask): Promise<void> {
  if (localTask.lastUpdatedAt > serverTask.lastUpdatedAt) {
    console.log(`Local task ${localTask.id} is newer, re-pushing with server's timestamp`);
    try {
      const updatedTask = await api.updateTask(localTask.id, {
        title: localTask.title,
        description: localTask.description ?? undefined,
        status: localTask.status,
        lastUpdatedAt: serverTask.lastUpdatedAt,
      });
      markTaskAsSynced(localTask.id, { lastUpdatedAt: updatedTask.lastUpdatedAt });
    } catch (error) {
      console.error(`Failed to resolve conflict for task ${localTask.id}:`, error);
      markTaskAsConflict(localTask.id);
    }
  } else {
    console.log(`Server task ${serverTask.id} is newer, accepting server version`);
    upsertTaskFromServer({
      id: serverTask.id,
      title: serverTask.title,
      description: serverTask.description,
      status: serverTask.status as TaskStatus,
      lastUpdatedAt: serverTask.lastUpdatedAt,
    });
  }
}

async function pullChanges(): Promise<{ success: boolean; error?: string }> {
  try {
    const serverTasks = await api.fetchTasks();

    let localTasks: Task[] = [];
    try {
      localTasks = getAllTasks();
    } catch (error) {
      if (error instanceof Error && error.message?.includes('no such table')) {
        console.log('Database not yet initialized for pullChanges');
        return { success: true };
      } else {
        throw error;
      }
    }

    let localPendingTasks: Task[] = [];
    try {
      localPendingTasks = [
        ...getLocallyCreatedTasks(),
        ...getLocallyModifiedTasks(),
        ...getLocallyDeletedTasks(),
      ];
    } catch (error) {
      if (error instanceof Error && error.message?.includes('no such table')) {
        console.log('Database not yet initialized for pending tasks in pullChanges');
        localPendingTasks = [];
      } else {
        throw error;
      }
    }

    const localPendingIds = new Set(localPendingTasks.map((t) => t.id));

    const serverTaskMap = new Map(serverTasks.map((t) => [t.id, t]));

    if (serverTasks.length > 0 || !serverTasks.some((t) => t.id.includes('undefined'))) {
      for (const serverTask of serverTasks) {
        if (localPendingIds.has(serverTask.id)) {
          continue;
        }

        upsertTaskFromServer({
          id: serverTask.id,
          title: serverTask.title,
          description: serverTask.description,
          status: serverTask.status as TaskStatus,
          lastUpdatedAt: serverTask.lastUpdatedAt,
        });
      }

      const syncedLocalTasks = localTasks.filter(
        (task) => !localPendingIds.has(task.id) && !task.locallyCreated
      );

      for (const localTask of syncedLocalTasks) {
        if (!serverTaskMap.has(localTask.id)) {
          console.log(`Removing task ${localTask.id} that was deleted on server`);
          removeSyncedDeletedTask(localTask.id);
        }
      }
    } else {
      console.warn('Skipping deletion logic due to suspicious server response');
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to pull changes:', error);
    return { success: false, error: msg };
  }
}

export async function sync(): Promise<boolean> {
  if (isSyncInProgress) {
    console.log('Sync already in progress, skipping');
    return false;
  }

  if (!isOnline()) {
    console.log('Offline - sync skipped');
    notifyStatusListeners();
    return false;
  }

  isSyncInProgress = true;
  setSyncState('syncing');

  try {
    const pushResult = await pushChanges();

    const pullResult = await pullChanges();

    if (pushResult.success && pullResult.success) {
      lastSyncTime = Date.now();
      setSyncState('idle');
      notifySyncComplete(true);
      console.log('Sync completed successfully');
      return true;
    } else {
      const errorMsg = [
        ...pushResult.errors,
        pullResult.error ? `Pull failed: ${pullResult.error}` : '',
      ]
        .filter(Boolean)
        .join('; ');
      setSyncState('error', errorMsg);
      notifySyncComplete(false, errorMsg);
      console.log('Sync failed, local tasks preserved:', {
        pushErrors: pushResult.errors.length,
        pullError: pullResult.error,
        localTaskCount: getAllTasks().length,
      });
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown sync error';
    setSyncState('error', msg);
    notifySyncComplete(false, msg);
    console.error('Sync failed:', error);
    return false;
  } finally {
    isSyncInProgress = false;
    notifyStatusListeners();
  }
}

export async function syncWithRetry(maxAttempts: number = MAX_RETRY_ATTEMPTS): Promise<boolean> {
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const success = await sync();
    if (success) {
      return true;
    }

    const currentStatus = getSyncStatus();
    lastError = currentStatus.error;

    if (attempt < maxAttempts) {
      const delay = lastError?.includes('Unauthorized')
        ? ERROR_BACKOFF_MS
        : RETRY_DELAY_MS * attempt;

      console.log(`Sync attempt ${attempt} failed (${lastError}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  console.error(`Sync failed after ${maxAttempts} attempts. Last error: ${lastError}`);
  return false;
}

export function initializeSync(): void {
  console.log('Initializing sync system');

  try {
    initializeDatabase();
    console.log('Database initialized for sync');
  } catch (error) {
    console.error('Failed to initialize database for sync:', error);
    return;
  }

  isSyncInProgress = false;

  addNetworkListener((isOnline) => {
    if (isOnline && !isSyncInProgress) {
      console.log('Network available, triggering sync');
      sync();
    }
  });

  sync();
}

export function startPeriodicSync(intervalMs: number = SYNC_INTERVAL_MS): void {
  stopPeriodicSync();
  syncInterval = setInterval(() => {
    if (isOnline() && !isSyncInProgress) {
      sync();
    }
  }, intervalMs);
  console.log(`Periodic sync started (interval: ${intervalMs}ms)`);
}

export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('Periodic sync stopped');
  }
}

export function cleanupSync(): void {
  stopPeriodicSync();
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
  statusListeners.clear();
  completeListeners.clear();
  console.log('Sync engine cleaned up');
}

export async function syncNow(): Promise<boolean> {
  return syncWithRetry(1);
}

export function isSyncing(): boolean {
  return isSyncInProgress;
}
