export interface ExtractionResult {
  url: string;
  siret: string | null;
  siren: string | null;
  tva: string | null;
  status: 'success' | 'no_data' | 'error';
  error: string | null;
  processing_time: number;
}

export interface BatchExtractionResponse {
  results: ExtractionResult[];
}
