import { useState } from 'react';
import { Home } from './pages/Home';
import { History } from './pages/History';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'history'>('home');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Navigation for Testing (will be replaced with React Router in Phase 6) */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">SIRET Extractor</h1>
              </div>
              <div className="ml-6 flex space-x-8">
                <button
                  onClick={() => setCurrentPage('home')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentPage === 'home'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => setCurrentPage('history')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentPage === 'history'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  History
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {currentPage === 'home' && <Home />}
      {currentPage === 'history' && <History />}
    </div>
  );
}

export default App;
