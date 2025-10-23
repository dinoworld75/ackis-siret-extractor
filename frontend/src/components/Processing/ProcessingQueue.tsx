import { ProcessingState } from '../../hooks/useProcessing';

interface ProcessingQueueProps {
  state: ProcessingState;
  onCancel?: () => void;
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function ProcessingQueue({ state, onCancel }: ProcessingQueueProps) {
  if (state.status === 'idle') {
    return null;
  }

  const { status, progress, error } = state;
  const { currentBatch, totalBatches, processedUrls, totalUrls, successCount, errorCount, noDataCount, percentage, estimatedTimeRemaining } = progress;

  return (
    <div className="w-full p-6 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {status === 'processing' && 'Processing URLs...'}
            {status === 'completed' && 'Processing Complete'}
            {status === 'error' && 'Processing Failed'}
          </h3>

          {status === 'processing' && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Batch Progress */}
        {status === 'processing' && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Batch {currentBatch}/{totalBatches}
            </span>
            <span>
              {processedUrls}/{totalUrls} URLs processed
            </span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              status === 'error'
                ? 'bg-red-500'
                : status === 'completed'
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Percentage */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{Math.round(percentage)}%</span>
          {status === 'processing' && estimatedTimeRemaining > 0 && (
            <span className="text-sm text-gray-600">
              ~{formatTime(estimatedTimeRemaining)} remaining
            </span>
          )}
        </div>

        {/* Results Summary */}
        {processedUrls > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-xs text-gray-600">Success</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{noDataCount}</div>
              <div className="text-xs text-gray-600">No Data</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-xs text-gray-600">Errors</div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {status === 'completed' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">Success</p>
            <p className="text-sm text-green-700 mt-1">
              Successfully processed {totalUrls} URLs. {successCount} URLs returned data, {noDataCount} URLs had no data, and {errorCount} URLs had errors.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
