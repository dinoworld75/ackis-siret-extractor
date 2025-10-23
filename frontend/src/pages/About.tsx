import { Link } from 'react-router-dom';
import { PageLayout } from '../components/Layout/PageLayout';

export function About() {
  return (
    <PageLayout title="About SIRET Extractor" maxWidth="4xl">
      <div className="space-y-8">
        {/* Project Description */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Automated SIRET, SIREN, and TVA Extraction
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            SIRET Extractor is a powerful web application designed to automatically extract
            French business identification numbers (SIRET, SIREN, and TVA) from company websites.
            Simply upload a CSV or XLSX file containing URLs, and the system will process them
            in bulk, returning enriched data with extracted business identifiers.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Built for efficiency and ease of use, this tool streamlines the process of collecting
            business information for market research, sales prospecting, and data enrichment workflows.
          </p>
        </div>

        {/* Key Features */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Features</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Bulk Extraction</h3>
                <p className="text-sm text-gray-600">
                  Process up to 100 URLs per batch with automatic batching for larger files
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Multiple File Formats</h3>
                <p className="text-sm text-gray-600">
                  Support for CSV and XLSX files with intelligent column detection
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Column Prioritization</h3>
                <p className="text-sm text-gray-600">
                  Select and prioritize columns with drag-and-drop interface
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Processing History</h3>
                <p className="text-sm text-gray-600">
                  Local storage of processing history with IndexedDB for offline access
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Export Results</h3>
                <p className="text-sm text-gray-600">
                  Download enriched data in CSV or XLSX format
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Real-time Progress</h3>
                <p className="text-sm text-gray-600">
                  Live updates with batch progress tracking and success rates
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Technology Stack</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Frontend</h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  React 19
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  TypeScript 5.9
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Vite 7.1
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Tailwind CSS 4.1
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  React Router 7.9
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Backend</h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  FastAPI
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Python 3.12
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Playwright
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Data & Storage</h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  IndexedDB
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  Dexie.js 4.2
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  PapaParse
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  XLSX.js
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="space-y-3">
            <Link
              to="/docs"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              API Documentation
            </Link>
            <Link
              to="/history"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Processing History
            </Link>
          </div>
        </div>

        {/* Version & Contact */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600">
                <strong className="text-gray-900">Version:</strong> 1.0.0
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong className="text-gray-900">Last Updated:</strong> October 2025
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>Built with precision and care</p>
              <p className="mt-1">For questions or support, please contact your administrator</p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
