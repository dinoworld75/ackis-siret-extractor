import { useState } from 'react';
import { ExtractionResult } from '../../types/api.types';
import { exportToCSV, exportToXLSX } from '../../services/fileExporter';

interface ResultsDownloadProps {
  originalFileData: any[][];
  originalFileName: string;
  results: ExtractionResult[];
}

export function ResultsDownload({ originalFileData, originalFileName, results }: ResultsDownloadProps) {
  const [onlySuccessful, setOnlySuccessful] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCSV = () => {
    setIsDownloading(true);
    try {
      // Create a compatible UploadedFile object from the stored data
      const fileForExport = {
        name: originalFileName,
        size: 0, // Not used in export
        type: 'text/csv', // Not critical for export
        headers: originalFileData[0] || [],
        data: originalFileData,
        rowCount: originalFileData.length - 1,
      };
      exportToCSV(fileForExport, results, onlySuccessful);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadXLSX = () => {
    setIsDownloading(true);
    try {
      // Create a compatible UploadedFile object from the stored data
      const fileForExport = {
        name: originalFileName,
        size: 0, // Not used in export
        type: 'text/csv', // Not critical for export
        headers: originalFileData[0] || [],
        data: originalFileData,
        rowCount: originalFileData.length - 1,
      };
      exportToXLSX(fileForExport, results, onlySuccessful);
    } catch (error) {
      console.error('Failed to export XLSX:', error);
      alert('Failed to export XLSX. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const successCount = results.filter((r) => r.status === 'success').length;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Download Results</h3>
        <p className="text-sm text-gray-600">
          Download your results with extracted SIRET/SIREN/TVA data
        </p>
      </div>

      {/* Option to download only successful results */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="only-successful"
          checked={onlySuccessful}
          onChange={(e) => setOnlySuccessful(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="only-successful" className="text-sm text-gray-700">
          Download only successful results ({successCount} rows)
        </label>
      </div>

      {/* Download buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDownloadCSV}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {isDownloading ? 'Downloading...' : 'Download CSV'}
        </button>

        <button
          onClick={handleDownloadXLSX}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {isDownloading ? 'Downloading...' : 'Download XLSX'}
        </button>
      </div>

      {/* Info message */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p>
          <strong>Note:</strong> The downloaded file will include all original columns plus 6 new
          columns:
        </p>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          <li>Extracted_SIRET</li>
          <li>Extracted_SIREN</li>
          <li>Extracted_TVA</li>
          <li>Extraction_Status</li>
          <li>Extraction_Error</li>
          <li>Processing_Time_Seconds</li>
        </ul>
      </div>
    </div>
  );
}
