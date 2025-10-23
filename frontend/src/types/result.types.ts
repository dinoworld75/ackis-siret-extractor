export type ResultStatus = 'success' | 'no_data' | 'error';
export type ResultFilter = 'all' | ResultStatus;
export type SortField = 'url' | 'siret' | 'siren' | 'tva' | 'status' | 'processing_time';
export type SortDirection = 'asc' | 'desc';

export interface ResultsStatistics {
  total: number;
  success: number;
  successPercentage: number;
  noData: number;
  noDataPercentage: number;
  error: number;
  errorPercentage: number;
  averageTime: number;
  totalTime: number;
}
