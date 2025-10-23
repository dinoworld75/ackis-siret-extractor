export interface ExtractionResult {
  url: string;
  siret: string | null;
  siren: string | null;
  tva: string | null;
  success: boolean;
  error: string | null;
  processing_time: number;
}

export interface BatchExtractionResponse {
  results: ExtractionResult[];
  total: number;
  successful: number;
  failed: number;
}
