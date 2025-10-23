import { useState, useEffect } from 'react';
import { HistoryEntry, HistorySortOption } from '../../types/history.types';
import { getHistory, clearHistory } from '../../services/historyStorage';
import { HistoryItem } from './HistoryItem';

interface HistoryListProps {
  onViewEntry: (entry: HistoryEntry) => void;
}

export function HistoryList({ onViewEntry }: HistoryListProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<HistorySortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load history entries
  useEffect(() => {
    loadHistory();
  }, []);

  // Apply filtering and sorting
  useEffect(() => {
    let filtered = [...entries];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(entry =>
        entry.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortOption) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime());
        break;
      case 'most_urls':
        filtered.sort((a, b) => b.totalUrls - a.totalUrls);
        break;
    }

    setFilteredEntries(filtered);
  }, [entries, searchQuery, sortOption]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const historyData = await getHistory();
      setEntries(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearHistory();
      setEntries([]);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear history:', error);
      alert('Failed to clear history. Please try again.');
    }
  };

  const handleDelete = () => {
    // Reload history after deletion
    loadHistory();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Processing History</h2>
          <p className="text-sm text-gray-600 mt-1">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        {entries.length > 0 && (
          <div>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-md hover:bg-red-100 transition-colors"
              >
                Clear All History
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors"
                >
                  Confirm Clear All
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search and Sort */}
      {entries.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as HistorySortOption)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="most_urls">Most URLs</option>
            </select>
          </div>
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No processing history yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Process your first file to see it appear here.
          </p>
        </div>
      )}

      {/* No Search Results */}
      {entries.length > 0 && filteredEntries.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-300">
          <p className="text-gray-600">No files match your search query.</p>
        </div>
      )}

      {/* History List */}
      {filteredEntries.length > 0 && (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              onView={onViewEntry}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
