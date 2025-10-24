import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveHistory,
  getHistory,
  getHistoryById,
  deleteHistory,
  clearHistory,
  getHistoryStats,
} from '../historyStorage';
import { db } from '../db';
import { HistoryEntry } from '../../types/history.types';
import { ExtractionResult } from '../../types/api.types';

describe('historyStorage', () => {
  // Clean up database before and after each test
  beforeEach(async () => {
    await db.history.clear();
  });

  afterEach(async () => {
    await db.history.clear();
  });

  describe('saveHistory', () => {
    it('should save a new history entry', async () => {
      const entry: Omit<HistoryEntry, 'id'> = {
        fileName: 'test.csv',
        fileSize: 1024,
        fileType: 'text/csv',
        processedAt: new Date('2025-10-23T10:00:00Z'),
        totalUrls: 10,
        successCount: 8,
        noDataCount: 1,
        errorCount: 1,
        processingTime: 120.5,
        selectedColumns: ['URL', 'Website'],
        results: [],
      };

      const id = await saveHistory(entry);

      expect(id).toBeTypeOf('number');
      expect(id).toBeGreaterThan(0);

      const saved = await db.history.get(id);
      expect(saved).toBeDefined();
      expect(saved?.fileName).toBe('test.csv');
      expect(saved?.totalUrls).toBe(10);
    });

    it('should auto-cleanup and keep only last 50 entries', async () => {
      // Create 55 entries
      for (let i = 0; i < 55; i++) {
        await saveHistory({
          fileName: `test${i}.csv`,
          fileSize: 1024,
          fileType: 'text/csv',
          processedAt: new Date(Date.now() + i * 1000), // Different timestamps
          totalUrls: 10,
          successCount: 8,
          noDataCount: 1,
          errorCount: 1,
          processingTime: 120.5,
          selectedColumns: ['URL'],
          results: [],
        });
      }

      const count = await db.history.count();
      expect(count).toBe(50);

      // Check that oldest entries were deleted
      const allEntries = await db.history.orderBy('processedAt').toArray();
      expect(allEntries[0].fileName).toBe('test5.csv'); // First 5 should be deleted
    });

    it('should preserve all entry fields', async () => {
      const results: ExtractionResult[] = [
        {
          url: 'http://example.com',
          siret: '12345678901234',
          siren: '123456789',
          tva: 'FR12123456789',
          status: 'success',
          error: null,
          processing_time: 5.5,
          worker_id: null,
          proxy_used: null,
        },
      ];

      const entry: Omit<HistoryEntry, 'id'> = {
        fileName: 'detailed.csv',
        fileSize: 2048,
        fileType: 'text/csv',
        processedAt: new Date('2025-10-23T10:00:00Z'),
        totalUrls: 1,
        successCount: 1,
        noDataCount: 0,
        errorCount: 0,
        processingTime: 5.5,
        selectedColumns: ['Website', 'URL'],
        results: results,
        originalFileData: [['URL'], ['http://example.com']],
      };

      const id = await saveHistory(entry);
      const saved = await db.history.get(id);

      expect(saved).toBeDefined();
      expect(saved?.fileName).toBe('detailed.csv');
      expect(saved?.fileSize).toBe(2048);
      expect(saved?.selectedColumns).toEqual(['Website', 'URL']);
      expect(saved?.results).toHaveLength(1);
      expect(saved?.results[0].siret).toBe('12345678901234');
      expect(saved?.originalFileData).toEqual([['URL'], ['http://example.com']]);
    });
  });

  describe('getHistory', () => {
    it('should return all history entries sorted by processedAt DESC', async () => {
      const entry1: Omit<HistoryEntry, 'id'> = {
        fileName: 'old.csv',
        fileSize: 1024,
        fileType: 'text/csv',
        processedAt: new Date('2025-10-20T10:00:00Z'),
        totalUrls: 5,
        successCount: 5,
        noDataCount: 0,
        errorCount: 0,
        processingTime: 60,
        selectedColumns: ['URL'],
        results: [],
      };

      const entry2: Omit<HistoryEntry, 'id'> = {
        fileName: 'new.csv',
        fileSize: 1024,
        fileType: 'text/csv',
        processedAt: new Date('2025-10-23T10:00:00Z'),
        totalUrls: 10,
        successCount: 10,
        noDataCount: 0,
        errorCount: 0,
        processingTime: 120,
        selectedColumns: ['URL'],
        results: [],
      };

      await saveHistory(entry1);
      await saveHistory(entry2);

      const history = await getHistory();

      expect(history).toHaveLength(2);
      // Newest first
      expect(history[0].fileName).toBe('new.csv');
      expect(history[1].fileName).toBe('old.csv');
    });

    it('should return empty array when no entries exist', async () => {
      const history = await getHistory();
      expect(history).toEqual([]);
    });
  });

  describe('getHistoryById', () => {
    it('should return specific history entry by ID', async () => {
      const entry: Omit<HistoryEntry, 'id'> = {
        fileName: 'specific.csv',
        fileSize: 1024,
        fileType: 'text/csv',
        processedAt: new Date('2025-10-23T10:00:00Z'),
        totalUrls: 10,
        successCount: 8,
        noDataCount: 1,
        errorCount: 1,
        processingTime: 120.5,
        selectedColumns: ['URL'],
        results: [],
      };

      const id = await saveHistory(entry);
      const found = await getHistoryById(id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(id);
      expect(found?.fileName).toBe('specific.csv');
    });

    it('should return undefined for non-existent ID', async () => {
      const found = await getHistoryById(999999);
      expect(found).toBeUndefined();
    });
  });

  describe('deleteHistory', () => {
    it('should delete a specific history entry', async () => {
      const entry: Omit<HistoryEntry, 'id'> = {
        fileName: 'to-delete.csv',
        fileSize: 1024,
        fileType: 'text/csv',
        processedAt: new Date('2025-10-23T10:00:00Z'),
        totalUrls: 10,
        successCount: 8,
        noDataCount: 1,
        errorCount: 1,
        processingTime: 120.5,
        selectedColumns: ['URL'],
        results: [],
      };

      const id = await saveHistory(entry);

      // Verify it exists
      let found = await getHistoryById(id);
      expect(found).toBeDefined();

      // Delete it
      await deleteHistory(id);

      // Verify it's gone
      found = await getHistoryById(id);
      expect(found).toBeUndefined();
    });

    it('should not throw error when deleting non-existent entry', async () => {
      await expect(deleteHistory(999999)).resolves.not.toThrow();
    });
  });

  describe('clearHistory', () => {
    it('should delete all history entries', async () => {
      // Add multiple entries
      for (let i = 0; i < 5; i++) {
        await saveHistory({
          fileName: `test${i}.csv`,
          fileSize: 1024,
          fileType: 'text/csv',
          processedAt: new Date(),
          totalUrls: 10,
          successCount: 8,
          noDataCount: 1,
          errorCount: 1,
          processingTime: 120.5,
          selectedColumns: ['URL'],
          results: [],
        });
      }

      let count = await db.history.count();
      expect(count).toBe(5);

      await clearHistory();

      count = await db.history.count();
      expect(count).toBe(0);
    });
  });

  describe('getHistoryStats', () => {
    it('should calculate correct statistics', async () => {
      await saveHistory({
        fileName: 'file1.csv',
        fileSize: 1024,
        fileType: 'text/csv',
        processedAt: new Date(),
        totalUrls: 10,
        successCount: 8,
        noDataCount: 1,
        errorCount: 1,
        processingTime: 120.5,
        selectedColumns: ['URL'],
        results: [],
      });

      await saveHistory({
        fileName: 'file2.csv',
        fileSize: 2048,
        fileType: 'text/csv',
        processedAt: new Date(),
        totalUrls: 20,
        successCount: 15,
        noDataCount: 3,
        errorCount: 2,
        processingTime: 240.5,
        selectedColumns: ['URL'],
        results: [],
      });

      const stats = await getHistoryStats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalUrls).toBe(30); // 10 + 20
      expect(stats.totalSuccess).toBe(23); // 8 + 15
    });

    it('should return zero stats when no entries exist', async () => {
      const stats = await getHistoryStats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalUrls).toBe(0);
      expect(stats.totalSuccess).toBe(0);
    });

    it('should handle entries with zero values', async () => {
      await saveHistory({
        fileName: 'empty.csv',
        fileSize: 100,
        fileType: 'text/csv',
        processedAt: new Date(),
        totalUrls: 0,
        successCount: 0,
        noDataCount: 0,
        errorCount: 0,
        processingTime: 0,
        selectedColumns: [],
        results: [],
      });

      const stats = await getHistoryStats();

      expect(stats.totalFiles).toBe(1);
      expect(stats.totalUrls).toBe(0);
      expect(stats.totalSuccess).toBe(0);
    });
  });
});
