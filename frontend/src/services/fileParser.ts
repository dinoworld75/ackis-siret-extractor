import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UploadedFile, ValidationResult } from '../types/file.types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

export function validateFile(file: File): ValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only CSV and XLSX files are allowed.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
  }
  return { valid: true };
}

export async function parseCSV(file: File): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as any[][];
        const headers = data[0] as string[];

        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          data: data,
          headers: headers,
          rowCount: data.length - 1, // Exclude header
        });
      },
      error: (error) => reject(error),
    });
  });
}

export async function parseXLSX(file: File): Promise<UploadedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const headers = data[0] as string[];

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    data: data,
    headers: headers,
    rowCount: data.length - 1,
  };
}

export async function parseFile(file: File): Promise<UploadedFile> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (file.type === 'text/csv') {
    return parseCSV(file);
  } else {
    return parseXLSX(file);
  }
}
