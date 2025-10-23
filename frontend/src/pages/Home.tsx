import { useState } from 'react';
import { FileUpload } from '../components/FileUpload/FileUpload';
import { ColumnSelector } from '../components/ColumnSelector/ColumnSelector';
import { UploadedFile } from '../types/file.types';
import { ColumnSelection } from '../types/column.types';

export function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [columnSelections, setColumnSelections] = useState<ColumnSelection[]>([]);

  const handleFileUploaded = (file: UploadedFile) => {
    setUploadedFile(file);
    console.log('File uploaded:', file);
  };

  const handleSelectionChange = (selections: ColumnSelection[]) => {
    setColumnSelections(selections);
    console.log('Column selections:', selections);
  };

  const canStartProcessing = columnSelections.some((s) => s.selected);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">SIRET Extractor</h1>

      <div className="space-y-8">
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
              className="w-full bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-hover transition-colors"
              onClick={() => console.log('Start processing')}
            >
              Start Processing
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
