import { useState } from 'react';
import { PageLayout } from '../components/Layout/PageLayout';

export function ApiDocs() {
  const [iframeError, setIframeError] = useState(false);
  // Use !== undefined to allow empty string (for relative URLs in production)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:8000';
  const docsUrl = `${apiBaseUrl}/docs`;

  return (
    <PageLayout title="API Documentation">
      <div className="space-y-6">
        {/* Description */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Interactive API Documentation
          </h2>
          <p className="text-gray-600 mb-4">
            Explore and test the SIRET Extractor API endpoints powered by FastAPI.
            The documentation below is interactive - you can try out API calls directly
            from your browser.
          </p>
          <div className="flex gap-4">
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Open in New Tab
            </a>
          </div>
        </div>

        {/* API Endpoints Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Endpoints</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                GET
              </span>
              <div>
                <code className="text-sm font-mono text-gray-900">/api/health</code>
                <p className="text-sm text-gray-600 mt-1">Health check endpoint</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                POST
              </span>
              <div>
                <code className="text-sm font-mono text-gray-900">/api/extract</code>
                <p className="text-sm text-gray-600 mt-1">Extract SIRET/SIREN/TVA from a single URL</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                POST
              </span>
              <div>
                <code className="text-sm font-mono text-gray-900">/api/extract/batch</code>
                <p className="text-sm text-gray-600 mt-1">Batch extract from multiple URLs (max 100)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Embedded API Docs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {iframeError ? (
            <div className="p-12 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unable to Load API Documentation
              </h3>
              <p className="text-gray-600 mb-4">
                The API server may not be running or is not accessible at {apiBaseUrl}
              </p>
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Try Opening Directly
              </a>
            </div>
          ) : (
            <iframe
              src={docsUrl}
              className="w-full h-[calc(100vh-400px)] min-h-[600px] border-0"
              title="API Documentation"
              onError={() => setIframeError(true)}
            />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
