export interface ExtractionResult {
  url: string;
  siret: string | null;
  siren: string | null;
  tva: string | null;
  status: 'success' | 'no_data' | 'error';
  error: string | null;
  processing_time: number;
  worker_id: number | null;
  proxy_used: string | null;
  data?: {
    siret: string | null;
    siren: string | null;
    tva: string | null;
    mention_legale: string | null;
  } | null;
}

export interface SingleExtractionResponse {
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
}
