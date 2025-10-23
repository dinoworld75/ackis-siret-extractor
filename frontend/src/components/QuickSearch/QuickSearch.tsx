import { useState } from 'react';
import { extractSiretData } from '../../services/api';
import { LoadingSpinner } from '../Shared/LoadingSpinner';
import type { ExtractionResult } from '../../types/extraction.types';

export function QuickSearch() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      setError('Invalid URL format');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      const data = await extractSiretData(normalizedUrl);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract data');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  const handleReset = () => {
    setUrl('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-800">Quick URL Search</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Extract SIRET/SIREN/TVA data from a single URL without uploading a file
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter website URL (e.g., example.com or https://example.com)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !url.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Extracting...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Extract</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-gray-800">Extraction Result</h4>
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              New Search
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">URL:</span>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline max-w-xs truncate"
              >
                {result.url}
              </a>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${
                result.status === 'success' ? 'text-green-600' :
                result.status === 'no_data' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {result.status === 'success' ? 'Success' :
                 result.status === 'no_data' ? 'No Data Found' : 'Error'}
              </span>
            </div>

            {result.status === 'success' && result.data && (
              <>
                {result.data.siret && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">SIRET:</span>
                    <span className="font-mono font-semibold text-gray-800">{result.data.siret}</span>
                  </div>
                )}

                {result.data.siren && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">SIREN:</span>
                    <span className="font-mono font-semibold text-gray-800">{result.data.siren}</span>
                  </div>
                )}

                {result.data.tva && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">TVA:</span>
                    <span className="font-mono font-semibold text-gray-800">{result.data.tva}</span>
                  </div>
                )}

                {result.data.mention_legale && (
                  <div className="py-2">
                    <span className="text-gray-600 block mb-1">Legal Notice Page:</span>
                    <a
                      href={result.data.mention_legale}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs break-all"
                    >
                      {result.data.mention_legale}
                    </a>
                  </div>
                )}
              </>
            )}

            {result.status === 'error' && result.error && (
              <div className="py-2 text-red-600">
                <span className="font-medium">Error:</span> {result.error}
              </div>
            )}

            <div className="flex justify-between py-2 text-xs text-gray-500">
              <span>Processing Time:</span>
              <span>{result.processing_time.toFixed(2)}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
