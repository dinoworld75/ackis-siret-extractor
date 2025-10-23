import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UploadedFile } from '../types/file.types';
import { ExtractionResult } from '../types/api.types';

/**
 * Merges extraction results with original file data
 */
function mergeResults(
  originalFile: UploadedFile,
  results: ExtractionResult[],
  onlySuccessful: boolean = false
): any[][] {
  const headers = originalFile.headers;
  const data = originalFile.data;

  // Create a map of URL to extraction result for quick lookup
  const resultsMap = new Map<string, ExtractionResult>();
  results.forEach((result) => {
    resultsMap.set(result.url.toLowerCase().trim(), result);
  });

  // Add new column headers
  const newHeaders = [
    ...headers,
    'Extracted_SIRET',
    'Extracted_SIREN',
    'Extracted_TVA',
    'Extraction_Status',
    'Extraction_Error',
    'Processing_Time_Seconds',
  ];

  const mergedData: any[][] = [newHeaders];

  // Process each row (skip header row)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Find URL in this row (check all cells)
    let matchedResult: ExtractionResult | null = null;
    for (const cell of row) {
      if (cell && typeof cell === 'string') {
        const cellValue = cell.toLowerCase().trim();
        // Check if this cell looks like a URL and has a matching result
        if (cellValue.startsWith('http://') || cellValue.startsWith('https://')) {
          const result = resultsMap.get(cellValue);
          if (result) {
            matchedResult = result;
            break;
          }
        }
      }
    }

    // If filtering for only successful results and this row doesn't have a successful match, skip it
    if (onlySuccessful && (!matchedResult || matchedResult.status !== 'success')) {
      continue;
    }

    // Build the new row with extraction data
    const newRow = [...row];

    if (matchedResult) {
      newRow.push(
        matchedResult.siret || '',
        matchedResult.siren || '',
        matchedResult.tva || '',
        matchedResult.status,
        matchedResult.error || '',
        matchedResult.processing_time.toFixed(2)
      );
    } else {
      // No matching result found for this row
      newRow.push('', '', '', '', '', '');
    }

    mergedData.push(newRow);
  }

  return mergedData;
}

/**
 * Export results to CSV format with UTF-8 BOM
 */
export function exportToCSV(
  originalFile: UploadedFile,
  results: ExtractionResult[],
  onlySuccessful: boolean = false
): void {
  console.log('[FileExporter] Exporting to CSV...');
  console.log('[FileExporter] Original file:', originalFile.name);
  console.log('[FileExporter] Results count:', results.length);
  console.log('[FileExporter] Only successful:', onlySuccessful);

  // Merge data
  const mergedData = mergeResults(originalFile, results, onlySuccessful);

  console.log('[FileExporter] Merged data rows:', mergedData.length);

  // Convert to CSV using PapaParse
  const csv = Papa.unparse(mergedData, {
    quotes: true,
    delimiter: ',',
    newline: '\n',
  });

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csv;

  // Create blob and download
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Generate filename
  const originalName = originalFile.name.replace(/\.(csv|xlsx?)$/i, '');
  const suffix = onlySuccessful ? '_extracted_success' : '_extracted';
  const filename = `${originalName}${suffix}.csv`;

  // Trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);

  console.log('[FileExporter] CSV download triggered:', filename);
}

/**
 * Export results to XLSX format
 */
export function exportToXLSX(
  originalFile: UploadedFile,
  results: ExtractionResult[],
  onlySuccessful: boolean = false
): void {
  console.log('[FileExporter] Exporting to XLSX...');
  console.log('[FileExporter] Original file:', originalFile.name);
  console.log('[FileExporter] Results count:', results.length);
  console.log('[FileExporter] Only successful:', onlySuccessful);

  // Merge data
  const mergedData = mergeResults(originalFile, results, onlySuccessful);

  console.log('[FileExporter] Merged data rows:', mergedData.length);

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(mergedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

  // Set column widths for better readability
  const columnWidths = [
    { wch: 50 }, // URL column (wider)
    { wch: 15 }, // Other original columns
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 }, // Extraction status
    { wch: 40 }, // Extraction error (wider)
    { wch: 12 }, // Processing time
  ];
  worksheet['!cols'] = columnWidths;

  // Generate filename
  const originalName = originalFile.name.replace(/\.(csv|xlsx?)$/i, '');
  const suffix = onlySuccessful ? '_extracted_success' : '_extracted';
  const filename = `${originalName}${suffix}.xlsx`;

  // Write and download
  XLSX.writeFile(workbook, filename);

  console.log('[FileExporter] XLSX download triggered:', filename);
}
