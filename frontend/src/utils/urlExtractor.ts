import { UploadedFile } from '../types/file.types';
import { ColumnSelection } from '../types/column.types';

export interface ExtractedUrl {
  url: string;
  rowIndex: number;
  columnName: string;
}

/**
 * Validates if a string is a valid URL
 * Accepts URLs starting with http://, https://, or www.
 */
function isValidUrl(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmed = str.trim();

  // Check if starts with http://, https://, or www.
  const urlPattern = /^(https?:\/\/|www\.)/i;
  return urlPattern.test(trimmed);
}

/**
 * Normalizes a URL by ensuring it has a protocol
 */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();

  // If starts with www., add https://
  if (trimmed.toLowerCase().startsWith('www.')) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Extracts URLs from file data based on selected columns with prioritization
 *
 * @param file - The uploaded file with parsed data
 * @param selectedColumns - Array of selected columns with priorities
 * @returns Array of extracted URLs with their row indices
 */
export function extractUrls(
  file: UploadedFile,
  selectedColumns: ColumnSelection[]
): ExtractedUrl[] {
  const extractedUrls: ExtractedUrl[] = [];

  // Filter and sort selected columns by priority (1 = highest)
  const sortedColumns = selectedColumns
    .filter((col) => col.selected)
    .sort((a, b) => a.priority - b.priority);

  if (sortedColumns.length === 0) {
    console.warn('[URL Extractor] No columns selected');
    return extractedUrls;
  }

  // Get column indices
  const columnIndices = sortedColumns.map((col) => ({
    name: col.columnName,
    index: file.headers.indexOf(col.columnName),
    priority: col.priority,
  }));

  console.log('[URL Extractor] Column indices:', columnIndices);

  // Skip header row (index 0)
  for (let rowIndex = 1; rowIndex < file.data.length; rowIndex++) {
    const row = file.data[rowIndex];

    // Try columns in priority order
    let foundUrl = false;
    for (const column of columnIndices) {
      if (column.index === -1) {
        continue; // Column not found in headers
      }

      const cellValue = row[column.index];
      if (cellValue && isValidUrl(cellValue)) {
        const normalizedUrl = normalizeUrl(cellValue);
        extractedUrls.push({
          url: normalizedUrl,
          rowIndex: rowIndex,
          columnName: column.name,
        });
        foundUrl = true;
        break; // Found URL in this column, move to next row
      }
    }

    if (!foundUrl) {
      console.debug(`[URL Extractor] No valid URL found in row ${rowIndex}`);
    }
  }

  console.log(
    `[URL Extractor] Extracted ${extractedUrls.length} URLs from ${file.data.length - 1} rows`
  );

  return extractedUrls;
}

/**
 * Chunks an array into smaller arrays of specified size
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
