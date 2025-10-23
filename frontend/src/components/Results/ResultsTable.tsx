import { useState, useMemo } from 'react';
import { ExtractionResult } from '../../types/api.types';
import {
  ResultFilter,
  SortField,
  SortDirection,
  ResultsStatistics,
} from '../../types/result.types';

interface ResultsTableProps {
  results: ExtractionResult[];
}

const ITEMS_PER_PAGE = 50;

export function ResultsTable({ results }: ResultsTableProps) {
  const [filter, setFilter] = useState<ResultFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('url');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Calculate statistics
  const statistics = useMemo<ResultsStatistics>(() => {
    const total = results.length;
    const success = results.filter((r) => r.status === 'success').length;
    const noData = results.filter((r) => r.status === 'no_data').length;
    const error = results.filter((r) => r.status === 'error').length;
    const totalTime = results.reduce((sum, r) => sum + r.processing_time, 0);
    const averageTime = total > 0 ? totalTime / total : 0;

    return {
      total,
      success,
      successPercentage: total > 0 ? (success / total) * 100 : 0,
      noData,
      noDataPercentage: total > 0 ? (noData / total) * 100 : 0,
      error,
      errorPercentage: total > 0 ? (error / total) * 100 : 0,
      averageTime,
      totalTime,
    };
  }, [results]);

  // Filter results
  const filteredResults = useMemo(() => {
    let filtered = results;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter((r) => r.status === filter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.url.toLowerCase().includes(query));
    }

    return filtered;
  }, [results, filter, searchQuery]);

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];

    sorted.sort((a, b) => {
      let aValue: string | number | null = a[sortField];
      let bValue: string | number | null = b[sortField];

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0;
    });

    return sorted;
  }, [filteredResults, sortField, sortDirection]);

  // Paginate results
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedResults.slice(startIndex, endIndex);
  }, [sortedResults, currentPage]);

  const totalPages = Math.ceil(sortedResults.length / ITEMS_PER_PAGE);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Toggle expanded row
  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: ExtractionResult['status'] }) => {
    const badgeClasses = {
      success: 'bg-green-100 text-green-800 border-green-200',
      no_data: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
    };

    const badgeText = {
      success: '✓ Success',
      no_data: '⚠ No Data',
      error: '✗ Error',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClasses[status]}`}
      >
        {badgeText[status]}
      </span>
    );
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <span className="text-gray-400 ml-1">
          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 12l5 5 5-5H5zm10-4L10 3 5 8h10z" />
          </svg>
        </span>
      );
    }

    return (
      <span className="text-blue-600 ml-1">
        {sortDirection === 'asc' ? (
          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 12l5-5 5 5H5z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
            <path d="M15 8l-5 5-5-5h10z" />
          </svg>
        )}
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Results</div>
          <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700">Success</div>
          <div className="text-2xl font-bold text-green-900">
            {statistics.success}
            <span className="text-sm font-normal ml-2">
              ({statistics.successPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-700">No Data</div>
          <div className="text-2xl font-bold text-yellow-900">
            {statistics.noData}
            <span className="text-sm font-normal ml-2">
              ({statistics.noDataPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700">Error</div>
          <div className="text-2xl font-bold text-red-900">
            {statistics.error}
            <span className="text-sm font-normal ml-2">
              ({statistics.errorPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search by URL
          </label>
          <input
            id="search"
            type="text"
            placeholder="Filter by URL..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="w-full md:w-48">
          <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Status
          </label>
          <select
            id="filter"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as ResultFilter);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All ({results.length})</option>
            <option value="success">Success ({statistics.success})</option>
            <option value="no_data">No Data ({statistics.noData})</option>
            <option value="error">Error ({statistics.error})</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {paginatedResults.length} of {sortedResults.length} results
        {filter !== 'all' || searchQuery ? ` (filtered from ${results.length} total)` : ''}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('url')}
                >
                  URL
                  <SortIndicator field="url" />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('siret')}
                >
                  SIRET
                  <SortIndicator field="siret" />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('siren')}
                >
                  SIREN
                  <SortIndicator field="siren" />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('tva')}
                >
                  TVA Intra.
                  <SortIndicator field="tva" />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  Status
                  <SortIndicator field="status" />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('processing_time')}
                >
                  Time (s)
                  <SortIndicator field="processing_time" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No results found
                  </td>
                </tr>
              ) : (
                paginatedResults.map((result, index) => {
                  const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
                  const isExpanded = expandedRows.has(globalIndex);
                  const hasError = result.status === 'error' && result.error;

                  return (
                    <tr
                      key={globalIndex}
                      className={hasError ? 'cursor-pointer hover:bg-gray-50' : ''}
                      onClick={() => hasError && toggleExpanded(globalIndex)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="max-w-xs">
                          <div className="text-sm text-gray-900 truncate" title={result.url}>
                            {result.url}
                          </div>
                          {hasError && isExpanded && (
                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                              <strong>Error:</strong> {result.error}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {result.siret || (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {result.siren || (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {result.tva || <span className="text-gray-400">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={result.status} />
                        {hasError && (
                          <span className="ml-2 text-xs text-gray-500">
                            {isExpanded ? '(click to hide)' : '(click to show error)'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.processing_time.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
