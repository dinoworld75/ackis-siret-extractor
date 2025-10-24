import { useState, useEffect } from 'react';
import { HistoryEntry, HistoryStats } from '../types/history.types';
import { getHistoryStats } from '../services/historyStorage';
import { HistoryList } from '../components/History/HistoryList';
import { ResultsTable } from '../components/Results/ResultsTable';
import { ResultsDownload } from '../components/Results/ResultsDownload';

export function History() {
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const historyStats = await getHistoryStats();
      setStats(historyStats);
    } catch (error) {
      console.error('Failed to load history stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEntry = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
  };

  const handleBackToHistory = () => {
    setSelectedEntry(null);
    // Reload stats in case history changed
    loadStats();
  };

  // If viewing a specific entry, show results view
  if (selectedEntry) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={handleBackToHistory}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to History
        </button>

        <div className="space-y-6">
          {/* Entry Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEntry.fileName}</h2>
            <p className="text-sm text-gray-600 mb-4">
              Processed on {new Date(selectedEntry.processedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total URLs</p>
                <p className="text-2xl font-bold text-gray-900">{selectedEntry.totalUrls}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Success</p>
                <p className="text-2xl font-bold text-green-600">{selectedEntry.successCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">No Data</p>
                <p className="text-2xl font-bold text-yellow-600">{selectedEntry.noDataCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">{selectedEntry.errorCount}</p>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Results</h3>
            <ResultsTable results={selectedEntry.results} />
          </div>

          {/* Download Section */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Download Results</h3>
            <ResultsDownload
              originalFileData={selectedEntry.originalFileData || []}
              originalFileName={selectedEntry.fileName}
              results={selectedEntry.results}
            />
          </div>
        </div>
      </div>
    );
  }

  // Default view: Show history list with stats
  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Processing History</h1>
          <p className="text-gray-600 mt-2">
            View and manage your previously processed files
          </p>
        </div>

        {/* Statistics Cards */}
        {!loading && stats && stats.totalFiles > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Files Processed
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {stats.totalFiles}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total URLs Extracted
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {stats.totalUrls.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Successful Extractions
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {stats.totalSuccess.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        <div>
          <HistoryList onViewEntry={handleViewEntry} />
        </div>
      </div>
    </div>
  );
}
