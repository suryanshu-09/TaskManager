export type SyncStatus = 'synced' | 'pending' | 'conflict';

export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  lastUpdatedAt: number;
  serverLastUpdatedAt: number | null;
  syncStatus: SyncStatus;
  locallyCreated: boolean;
  locallyModified: boolean;
  locallyDeleted: boolean;
}

export interface ApiTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  lastUpdatedAt: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
}
