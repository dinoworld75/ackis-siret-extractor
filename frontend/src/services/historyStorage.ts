import { db } from './db';
import { HistoryEntry, HistoryStats } from '../types/history.types';

const MAX_HISTORY_ENTRIES = 50;

/**
 * Save a new history entry to IndexedDB
 * Auto-cleanup: Keep only last 50 entries
 */
export async function saveHistory(entry: Omit<HistoryEntry, 'id'>): Promise<number> {
  // Add new entry
  const id = await db.history.add(entry);

  // Auto-cleanup: Keep only last 50 entries
  const count = await db.history.count();
  if (count > MAX_HISTORY_ENTRIES) {
    const entriesToDelete = count - MAX_HISTORY_ENTRIES;
    const oldestEntries = await db.history
      .orderBy('processedAt')
      .limit(entriesToDelete)
      .toArray();

    const idsToDelete = oldestEntries.map(e => e.id).filter((id): id is number => id !== undefined);
    await db.history.bulkDelete(idsToDelete);
  }

  return id;
}

/**
 * Get all history entries, sorted by processedAt DESC
 */
export async function getHistory(): Promise<HistoryEntry[]> {
  return await db.history
    .orderBy('processedAt')
    .reverse()
    .toArray();
}

/**
 * Get a specific history entry by ID
 */
export async function getHistoryById(id: number): Promise<HistoryEntry | undefined> {
  return await db.history.get(id);
}

/**
 * Delete a specific history entry
 */
export async function deleteHistory(id: number): Promise<void> {
  await db.history.delete(id);
}

/**
 * Delete all history entries
 */
export async function clearHistory(): Promise<void> {
  await db.history.clear();
}

/**
 * Get aggregate statistics from all history entries
 */
export async function getHistoryStats(): Promise<HistoryStats> {
  const entries = await db.history.toArray();

  const stats: HistoryStats = {
    totalFiles: entries.length,
    totalUrls: 0,
    totalSuccess: 0,
  };

  for (const entry of entries) {
    stats.totalUrls += entry.totalUrls;
    stats.totalSuccess += entry.successCount;
  }

  return stats;
}
