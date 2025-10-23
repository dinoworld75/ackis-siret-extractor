import { Link } from 'react-router-dom';
import { PageLayout } from '../components/Layout/PageLayout';

export function NotFound() {
  return (
    <PageLayout maxWidth="2xl">
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          {/* 404 Illustration */}
          <div className="mb-8">
            <svg
              className="w-32 h-32 mx-auto text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Error Code */}
          <h1 className="text-8xl font-bold text-gray-900 mb-4">404</h1>

          {/* Error Message */}
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">
            Page Not Found
          </h2>

          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Back to Home
            </Link>

            <Link
              to="/history"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
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
              View History
            </Link>
          </div>

          {/* Helpful Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">Maybe one of these pages will help:</p>
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <Link to="/docs" className="text-blue-600 hover:text-blue-700 hover:underline">
                API Documentation
              </Link>
              <Link to="/about" className="text-blue-600 hover:text-blue-700 hover:underline">
                About
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
