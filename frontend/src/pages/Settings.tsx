import { useState, useEffect } from 'react';

interface SettingsData {
  concurrentWorkers: number;
  batchSize: number;
  timeout: number;
}

const DEFAULT_SETTINGS: SettingsData = {
  concurrentWorkers: 10,
  batchSize: 100,
  timeout: 180,
};

export function Settings() {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [proxyFile, setProxyFile] = useState<File | null>(null);
  const [proxyCount, setProxyCount] = useState<number>(0);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('extractorSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }

    // Load proxy count if available
    const savedProxyCount = localStorage.getItem('proxyCount');
    if (savedProxyCount) {
      setProxyCount(parseInt(savedProxyCount, 10));
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('extractorSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('extractorSettings');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleProxyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProxyFile(file);
    }
  };

  const handleUploadProxies = async () => {
    if (!proxyFile) return;

    try {
      // Read the file content
      const text = await proxyFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      // Store proxy data (in a real app, this would be sent to the backend)
      localStorage.setItem('proxyData', text);
      localStorage.setItem('proxyCount', lines.length.toString());
      setProxyCount(lines.length);

      alert(`Successfully uploaded ${lines.length} proxies`);
      setProxyFile(null);
    } catch (error) {
      console.error('Failed to upload proxies:', error);
      alert('Failed to upload proxies');
    }
  };

  const handleClearProxies = () => {
    localStorage.removeItem('proxyData');
    localStorage.removeItem('proxyCount');
    setProxyCount(0);
    alert('Proxies cleared');
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-gray-600 mb-8">Configure extraction parameters and proxy settings</p>

      <div className="space-y-8">
        {/* Processing Settings */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Processing Settings
          </h2>

          <div className="space-y-6">
            {/* Concurrent Workers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concurrent Workers: {settings.concurrentWorkers}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={settings.concurrentWorkers}
                onChange={(e) => setSettings({ ...settings, concurrentWorkers: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of parallel workers for extraction (1-50). Higher values = faster processing but more resources.
              </p>
            </div>

            {/* Batch Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Size
              </label>
              <input
                type="number"
                min="50"
                max="200"
                value={settings.batchSize}
                onChange={(e) => setSettings({ ...settings, batchSize: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of URLs to process per batch (50-200)
              </p>
            </div>

            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min="60"
                max="600"
                value={settings.timeout}
                onChange={(e) => setSettings({ ...settings, timeout: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum time to wait for each URL extraction (60-600 seconds)
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveSettings}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>

          {saved && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              Settings saved successfully!
            </div>
          )}
        </section>

        {/* Proxy Management */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Proxy Management
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Current Status:</strong> {proxyCount > 0 ? `${proxyCount} proxies loaded` : 'No proxies configured'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Proxy List (.csv or .txt format)
              </label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleProxyFileChange}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleUploadProxies}
                  disabled={!proxyFile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Upload
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                .csv or .txt file with one proxy per line (format: host:port:username:password)
              </p>
            </div>

            {proxyCount > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleClearProxies}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Clear All Proxies
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-sm text-gray-800 mb-2">About Proxy Configuration</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Proxies help avoid rate limiting and IP blocks</li>
              <li>• Each worker will rotate through available proxies</li>
              <li>• Supported formats: HTTP/HTTPS proxies</li>
              <li>• Note: Proxy configuration in this UI is for frontend storage only. Backend integration required for full functionality.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
