export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data: any[][];
  headers: string[];
  rowCount: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
