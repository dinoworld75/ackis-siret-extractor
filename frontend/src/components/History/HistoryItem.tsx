import { useState } from 'react';
import { HistoryEntry } from '../../types/history.types';
import { deleteHistory } from '../../services/historyStorage';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface HistoryItemProps {
  entry: HistoryEntry;
  onView: (entry: HistoryEntry) => void;
  onDelete: () => void;
}

export function HistoryItem({ entry, onView, onDelete }: HistoryItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format date: "Jan 15, 2025 at 2:30 PM"
  const formattedDate = new Date(entry.processedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Get file icon based on type
  const getFileIcon = () => {
    if (entry.fileType.includes('csv')) {
      return (
        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          <text x="10" y="13" fontSize="6" textAnchor="middle" fill="white" fontWeight="bold">CSV</text>
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-green-700" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          <text x="10" y="13" fontSize="5" textAnchor="middle" fill="white" fontWeight="bold">XLSX</text>
        </svg>
      );
    }
  };

  const handleDelete = async () => {
    if (!entry.id) return;

    setIsDeleting(true);
    try {
      await deleteHistory(entry.id);
      onDelete();
    } catch (error) {
      console.error('Failed to delete history entry:', error);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownloadCSV = () => {
    const csvData = entry.results.map(result => ({
      URL: result.url,
      SIRET: result.siret || '',
      SIREN: result.siren || '',
      TVA: result.tva || '',
      Status: result.status,
      Error: result.error || '',
      'Processing Time (s)': result.processing_time.toFixed(2),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${entry.fileName.replace(/\.(csv|xlsx)$/i, '')}_results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadXLSX = () => {
    const worksheetData = [
      ['URL', 'SIRET', 'SIREN', 'TVA', 'Status', 'Error', 'Processing Time (s)'],
      ...entry.results.map(result => [
        result.url,
        result.siret || '',
        result.siren || '',
        result.tva || '',
        result.status,
        result.error || '',
        result.processing_time.toFixed(2),
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `${entry.fileName.replace(/\.(csv|xlsx)$/i, '')}_results.xlsx`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* File Icon */}
        <div className="flex-shrink-0">
          {getFileIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* File Name */}
          <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
            {entry.fileName}
          </h3>

          {/* Date */}
          <p className="text-sm text-gray-500 mb-3">
            {formattedDate}
          </p>

          {/* Statistics */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {entry.totalUrls} URLs
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {entry.successCount} success
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {entry.noDataCount} no data
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {entry.errorCount} errors
            </span>
          </div>

          {/* Processing Time */}
          <p className="text-sm text-gray-600">
            Processing time: <span className="font-medium">{entry.processingTime.toFixed(1)}s</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          <button
            onClick={() => onView(entry)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            View Results
          </button>

          {/* Download Dropdown */}
          <div className="relative group">
            <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors">
              Download
              <svg className="inline-block ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={handleDownloadCSV}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                CSV
              </button>
              <button
                onClick={handleDownloadXLSX}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                XLSX
              </button>
            </div>
          </div>

          {/* Delete Button */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-md hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
