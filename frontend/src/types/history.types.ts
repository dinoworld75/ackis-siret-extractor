import { ExtractionResult } from './api.types';

export interface HistoryEntry {
  id?: number; // auto-increment
  fileName: string;
  fileSize: number;
  fileType: string;
  processedAt: Date;
  totalUrls: number;
  successCount: number;
  noDataCount: number;
  errorCount: number;
  processingTime: number; // in seconds
  selectedColumns: string[]; // column names used
  results: ExtractionResult[]; // full results array
  originalFileData?: any[][]; // optional: store original file data
}

export interface HistoryStats {
  totalFiles: number;
  totalUrls: number;
  totalSuccess: number;
}

export type HistorySortOption = 'recent' | 'oldest' | 'most_urls';
