import { db, generateUUID, initializeDatabase } from './db';
import type { Task, CreateTaskInput, UpdateTaskInput, SyncStatus, TaskStatus } from '../types/task';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  lastUpdatedAt: number;
  serverLastUpdatedAt: number | null;
  syncStatus: string;
  locallyCreated: number;
  locallyModified: number;
  locallyDeleted: number;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    lastUpdatedAt: row.lastUpdatedAt,
    serverLastUpdatedAt: row.serverLastUpdatedAt,
    syncStatus: row.syncStatus as SyncStatus,
    locallyCreated: row.locallyCreated === 1,
    locallyModified: row.locallyModified === 1,
    locallyDeleted: row.locallyDeleted === 1,
  };
}

export function createTask(input: CreateTaskInput): Task {
  try {
    const { title, description } = input;
    const id = generateUUID();
    const now = Date.now();

    console.log('Creating task:', { id, title, description });

    const result = db.runSync(
      `INSERT INTO tasks (id, title, description, status, lastUpdatedAt, serverLastUpdatedAt, syncStatus, locallyCreated, locallyModified, locallyDeleted) 
       VALUES (?, ?, ?, 'pending', ?, NULL, 'pending', 1, 0, 0)`,
      [id, title, description ?? null, now]
    );

    console.log('Task created result:', result);

    const task = getTaskById(id);
    console.log('Retrieved created task:', task);
    return task!;
  } catch (error) {
    if (error instanceof Error && error.message?.includes('no such table')) {
      console.log('Tasks table does not exist, initializing database first');
      initializeDatabase();
      return createTask(input);
    }
    throw error;
  }
}

export function getAllTasks(): Task[] {
  try {
    const rows = db.getAllSync<TaskRow>(
      `SELECT * FROM tasks WHERE locallyDeleted = 0 ORDER BY lastUpdatedAt DESC`
    );
    console.log('Retrieved tasks from DB:', rows.length, 'rows');
    const tasks = rows.map(rowToTask);
    console.log(
      'Mapped tasks:',
      tasks.map((t) => ({ id: t.id, title: t.title, status: t.status }))
    );
    return tasks;
  } catch (error) {
    if (error instanceof Error && error.message?.includes('no such table')) {
      console.log('Tasks table does not exist, returning empty array');
      return [];
    }
    throw error;
  }
}

export function getTaskById(id: string): Task | null {
  const row = db.getFirstSync<TaskRow>(`SELECT * FROM tasks WHERE id = ?`, [id]);
  return row ? rowToTask(row) : null;
}

export function updateTask(id: string, input: UpdateTaskInput): Task | null {
  const existingTask = getTaskById(id);
  if (!existingTask) return null;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }

  if (updates.length === 0) return existingTask;

  const now = Date.now();
  updates.push('lastUpdatedAt = ?');
  values.push(now);

  if (!existingTask.locallyCreated) {
    updates.push('locallyModified = 1');
    updates.push("syncStatus = 'pending'");
  }

  values.push(id);

  db.runSync(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
  return getTaskById(id);
}

export function deleteTask(id: string): boolean {
  const task = getTaskById(id);
  if (!task) return false;

  if (task.locallyCreated) {
    const result = db.runSync(`DELETE FROM tasks WHERE id = ?`, [id]);
    return result.changes > 0;
  }

  const now = Date.now();
  db.runSync(
    `UPDATE tasks SET locallyDeleted = 1, lastUpdatedAt = ?, syncStatus = 'pending' WHERE id = ?`,
    [now, id]
  );
  return true;
}

export function toggleTaskComplete(id: string): Task | null {
  const task = getTaskById(id);
  if (!task) return null;

  const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
  return updateTask(id, { status: newStatus });
}

export function getPendingSyncTasks(): Task[] {
  try {
    const rows = db.getAllSync<TaskRow>(`SELECT * FROM tasks WHERE syncStatus = 'pending'`);
    return rows.map(rowToTask);
  } catch (error) {
    if (error instanceof Error && error.message?.includes('no such table')) {
      console.log('Tasks table does not exist, returning empty array');
      return [];
    }
    throw error;
  }
}

export function getLocallyCreatedTasks(): Task[] {
  try {
    const rows = db.getAllSync<TaskRow>(
      `SELECT * FROM tasks WHERE locallyCreated = 1 AND locallyDeleted = 0`
    );
    return rows.map(rowToTask);
  } catch (error) {
    if (error instanceof Error && error.message?.includes('no such table')) {
      console.log('Tasks table does not exist, returning empty array');
      return [];
    }
    throw error;
  }
}

export function getLocallyModifiedTasks(): Task[] {
  try {
    const rows = db.getAllSync<TaskRow>(
      `SELECT * FROM tasks WHERE locallyModified = 1 AND locallyCreated = 0 AND locallyDeleted = 0`
    );
    return rows.map(rowToTask);
  } catch (error) {
    if (error instanceof Error && error.message?.includes('no such table')) {
      console.log('Tasks table does not exist, returning empty array');
      return [];
    }
    throw error;
  }
}

export function getLocallyDeletedTasks(): Task[] {
  try {
    const rows = db.getAllSync<TaskRow>(`SELECT * FROM tasks WHERE locallyDeleted = 1`);
    return rows.map(rowToTask);
  } catch (error) {
    if (error instanceof Error && error.message?.includes('no such table')) {
      console.log('Tasks table does not exist, returning empty array');
      return [];
    }
    throw error;
  }
}

export function markTaskAsSynced(id: string, serverTask?: { lastUpdatedAt: number }): void {
  const updates = ["syncStatus = 'synced'", 'locallyCreated = 0', 'locallyModified = 0'];
  const values: (string | number)[] = [];

  if (serverTask) {
    updates.push('lastUpdatedAt = ?');
    updates.push('serverLastUpdatedAt = ?');
    values.push(serverTask.lastUpdatedAt);
    values.push(serverTask.lastUpdatedAt);
  }

  values.push(id);
  db.runSync(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
}

export function removeSyncedDeletedTask(id: string): void {
  db.runSync(`DELETE FROM tasks WHERE id = ?`, [id]);
}

export function upsertTaskFromServer(serverTask: {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  lastUpdatedAt: number;
}): void {
  db.runSync(
    `INSERT OR REPLACE INTO tasks (id, title, description, status, lastUpdatedAt, serverLastUpdatedAt, syncStatus, locallyCreated, locallyModified, locallyDeleted)
     VALUES (?, ?, ?, ?, ?, ?, 'synced', 0, 0, 0)`,
    [
      serverTask.id,
      serverTask.title,
      serverTask.description,
      serverTask.status,
      serverTask.lastUpdatedAt,
      serverTask.lastUpdatedAt,
    ]
  );
}

export function markTaskAsConflict(id: string): void {
  db.runSync(`UPDATE tasks SET syncStatus = 'conflict' WHERE id = ?`, [id]);
}
