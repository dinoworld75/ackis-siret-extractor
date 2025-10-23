import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseFile } from '../../services/fileParser';
import { UploadedFile } from '../../types/file.types';

interface FileUploadProps {
  onFileUploaded: (file: UploadedFile) => void;
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError(null);
    setUploading(true);

    try {
      const parsedFile = await parseFile(file);
      onFileUploaded(parsedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setUploading(false);
    }
  }, [onFileUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-blue-50'
            : 'border-gray-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {uploading ? (
            <p className="text-gray-600">Uploading and parsing file...</p>
          ) : isDragActive ? (
            <p className="text-primary font-medium">Drop the file here</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium">
                Drag & drop a CSV or XLSX file here
              </p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">Max file size: 10MB</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
