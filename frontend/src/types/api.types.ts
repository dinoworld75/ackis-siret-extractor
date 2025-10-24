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
  worker_id: number | null;
  proxy_used: string | null;
}

export interface BatchStartResponse {
  batch_id: string;
  message: string;
  total_urls: number;
}

export interface LogEntry {
  timestamp: number;
  url: string;
  status: 'processing' | 'success' | 'no_data' | 'error';
  message: string;
  worker_id: number | null;
}

export interface BatchProgress {
  batch_id: string;
  total_urls: number;
  completed: number;
  success: number;
  failed: number;
  in_progress: boolean;
  start_time: number;
  elapsed_time: number;
  estimated_time_remaining: number | null;
  recent_logs: LogEntry[];
}

export interface BatchExtractionResponse {
  batch_id: string;
  results: ExtractionResult[];
  total: number;
  successful: number;
  failed: number;
}
