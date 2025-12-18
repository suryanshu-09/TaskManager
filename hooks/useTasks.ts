import { useState, useCallback, useEffect, useMemo } from 'react';
import { getAllTasks } from '../lib/tasks';
import { useNetwork } from './useNetwork';
import { useSync } from './useSync';
import type { Task } from '../types/task';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { isConnected } = useNetwork();
  const { isSyncing, lastSyncTime, syncError, pendingChanges, triggerSync } = useSync();

  const loadTasks = useCallback((showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      const allTasks = getAllTasks();
      setTasks(allTasks);
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) {
      return tasks;
    }

    const query = searchQuery.toLowerCase().trim();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query))
    );
  }, [tasks, searchQuery]);

  useEffect(() => {
    if (isConnected && pendingChanges > 0 && !isSyncing) {
      triggerSync();
    }
  }, [isConnected, pendingChanges, isSyncing, triggerSync]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!isSyncing && lastSyncTime) {
      loadTasks(false);
    }
  }, [isSyncing, lastSyncTime, loadTasks]);

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    pendingCount: pendingChanges,
    isConnected,
    isSyncing,
    syncError,
    lastSyncTime,
    loadTasks,
    triggerSync,
    refreshTasks: () => loadTasks(false),
  };
}
