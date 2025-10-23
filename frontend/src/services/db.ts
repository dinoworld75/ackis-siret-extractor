import Dexie, { Table } from 'dexie';
import { HistoryEntry } from '../types/history.types';

class HistoryDatabase extends Dexie {
  history!: Table<HistoryEntry>;

  constructor() {
    super('SiretExtractorDB');
    this.version(1).stores({
      history: '++id, fileName, processedAt, totalUrls',
    });
  }
}

export const db = new HistoryDatabase();
