import { useState } from 'react';
import { FileUpload } from '../components/FileUpload/FileUpload';
import { ColumnSelector } from '../components/ColumnSelector/ColumnSelector';
import { ProcessingQueue } from '../components/Processing/ProcessingQueue';
import { UploadedFile } from '../types/file.types';
import { ColumnSelection } from '../types/column.types';
import { useProcessing } from '../hooks/useProcessing';

export function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [columnSelections, setColumnSelections] = useState<ColumnSelection[]>([]);
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
      await startProcessing(uploadedFile, columnSelections);
    } catch (error) {
      console.error('Processing failed:', error);
    }
  };

  const handleReset = () => {
    reset();
    setUploadedFile(null);
    setColumnSelections([]);
  };

  const canStartProcessing =
    columnSelections.some((s) => s.selected) &&
    state.status !== 'processing';

  const showUploadSection = state.status === 'idle' || state.status === 'error';
  const showProcessingQueue = state.status === 'processing' || state.status === 'completed';

  return (
    <div className="max-w-4xl mx-auto p-8">
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
          <section>
            <h2 className="text-xl font-semibold mb-4">
              {state.status === 'processing' ? '3. Processing' : '3. Results'}
            </h2>
            <ProcessingQueue state={state} onCancel={cancel} />

            {state.status === 'completed' && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Processing complete!</strong> {state.progress.processedUrls} URLs processed.
                  </p>
                  <p className="text-xs text-gray-600">
                    Phase 4 will add results table and download functionality.
                  </p>
                </div>

                <button
                  className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  onClick={handleReset}
                >
                  Process Another File
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
