import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload/FileUpload';
import { ColumnSelector } from '../components/ColumnSelector/ColumnSelector';
import { ProcessingQueue } from '../components/Processing/ProcessingQueue';
import { ResultsTable } from '../components/Results/ResultsTable';
import { ResultsDownload } from '../components/Results/ResultsDownload';
import { UploadedFile } from '../types/file.types';
import { ColumnSelection } from '../types/column.types';
import { useProcessing } from '../hooks/useProcessing';
import { saveHistory } from '../services/historyStorage';

export function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [columnSelections, setColumnSelections] = useState<ColumnSelection[]>([]);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [historySaved, setHistorySaved] = useState(false);
  const { state, startProcessing, reset, cancel } = useProcessing();

  const handleFileUploaded = (file: UploadedFile) => {
    setUploadedFile(file);
    console.log('File uploaded:', file);
  };

  const handleSelectionChange = (selections: ColumnSelection[]) => {
    setColumnSelections(selections);
    console.log('Column selections:', selections);
  };

  const handleStartProcessing = async () => {
    if (!uploadedFile) {
      return;
    }

    try {
      setProcessingStartTime(Date.now());
      setHistorySaved(false);
      await startProcessing(uploadedFile, columnSelections);
    } catch (error) {
      console.error('Processing failed:', error);
    }
  };

  // Auto-save to history when processing completes successfully
  useEffect(() => {
    const saveToHistory = async () => {
      if (
        state.status === 'completed' &&
        uploadedFile &&
        state.results.length > 0 &&
        processingStartTime &&
        !historySaved
      ) {
        const processingEndTime = Date.now();
        const processingTime = (processingEndTime - processingStartTime) / 1000; // seconds

        const selectedColumnNames = columnSelections
          .filter((c) => c.selected)
          .map((c) => c.columnName);

        try {
          await saveHistory({
            fileName: uploadedFile.name,
            fileSize: uploadedFile.size,
            fileType: uploadedFile.type,
            processedAt: new Date(),
            totalUrls: state.progress.totalUrls,
            successCount: state.progress.successCount,
            noDataCount: state.progress.noDataCount,
            errorCount: state.progress.errorCount,
            processingTime,
            selectedColumns: selectedColumnNames,
            results: state.results,
            originalFileData: uploadedFile.data,
          });

          setHistorySaved(true);
          console.log('[History] Results saved to history');
        } catch (error) {
          console.error('[History] Failed to save to history:', error);
        }
      }
    };

    saveToHistory();
  }, [state.status, uploadedFile, state.results, processingStartTime, historySaved, columnSelections, state.progress]);

  const handleReset = () => {
    reset();
    setUploadedFile(null);
    setColumnSelections([]);
    setProcessingStartTime(null);
    setHistorySaved(false);
  };

  const canStartProcessing =
    columnSelections.some((s) => s.selected) &&
    state.status !== 'processing';

  const showUploadSection = state.status === 'idle' || state.status === 'error';
  const showProcessingQueue = state.status === 'processing' || state.status === 'completed';

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">SIRET Extractor</h1>

      <div className="space-y-8">
        {showUploadSection && (
          <>
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Upload File</h2>
              <FileUpload onFileUploaded={handleFileUploaded} />
            </section>

            {uploadedFile && (
              <section>
                <h2 className="text-xl font-semibold mb-4">2. Select Columns</h2>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>File:</strong> {uploadedFile.name} ({uploadedFile.rowCount} rows)
                  </p>
                </div>
                <ColumnSelector
                  columns={uploadedFile.headers}
                  onSelectionChange={handleSelectionChange}
                />
              </section>
            )}

            {uploadedFile && canStartProcessing && (
              <section>
                <button
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  onClick={handleStartProcessing}
                >
                  Start Processing
                </button>
              </section>
            )}
          </>
        )}

        {showProcessingQueue && (
          <>
            <section>
              <h2 className="text-xl font-semibold mb-4">
                {state.status === 'processing' ? '3. Processing' : '3. Results'}
              </h2>
              <ProcessingQueue state={state} onCancel={cancel} />
            </section>

            {state.status === 'completed' && uploadedFile && (
              <>
                <section>
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium mb-2">
                      Processing complete! {state.progress.processedUrls} URLs processed.
                    </p>
                    {historySaved && (
                      <p className="text-green-700 text-sm">
                        Results saved to history. <Link to="/history" className="underline hover:text-green-900">View all history</Link>
                      </p>
                    )}
                  </div>

                  <ResultsTable results={state.results} />
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">4. Download Results</h2>
                  <ResultsDownload originalFile={uploadedFile} results={state.results} />
                </section>

                <section>
                  <button
                    className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    onClick={handleReset}
                  >
                    Process Another File
                  </button>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
