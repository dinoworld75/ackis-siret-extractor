import axios, { AxiosInstance, AxiosError } from 'axios';
import { BatchExtractionResponse, BatchStartResponse, BatchProgress, SingleExtractionResponse, ExtractionResult } from '../types/api.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BATCH_SIZE = Number(import.meta.env.VITE_BATCH_SIZE) || 100;

interface RetryConfig {
  __retryCount?: number;
}

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 180000, // 3 minutes
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[API] Response from ${response.config.url}:`, response.data);
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as (typeof error.config & RetryConfig);

        if (!config) {
          console.error('[API] No config available for retry');
          return Promise.reject(error);
        }

        // Initialize retry count
        if (config.__retryCount === undefined) {
          config.__retryCount = 0;
        }

        // Max 3 retries
        if (config.__retryCount >= 3) {
          console.error(`[API] Max retries (3) reached for ${config.url}`);
          return Promise.reject(error);
        }

        config.__retryCount += 1;
        const delay = 1000 * Math.pow(2, config.__retryCount - 1); // Exponential backoff

        console.warn(
          `[API] Retry ${config.__retryCount}/3 for ${config.url} after ${delay}ms`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.client(config);
      }
    );
  }

  async extractSingle(url: string): Promise<ExtractionResult> {
    try {
      const response = await this.client.post<SingleExtractionResponse>(
        '/api/extract',
        { url }
      );

      // Map backend response to frontend format
      const data = response.data;
      const hasData = data.siret || data.siren || data.tva;

      return {
        url: data.url,
        siret: data.siret,
        siren: data.siren,
        tva: data.tva,
        status: data.success ? 'success' : (hasData ? 'success' : (data.error ? 'error' : 'no_data')),
        error: data.error,
        processing_time: data.processing_time,
        worker_id: data.worker_id ?? null,
        proxy_used: data.proxy_used ?? null,
        data: {
          siret: data.siret,
          siren: data.siren,
          tva: data.tva,
          mention_legale: null, // Backend doesn't return this yet
        },
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('[API] Single extraction error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  async extractBatch(
    urls: string[],
    concurrentWorkers?: number,
    proxies?: Array<{host: string; port: number; username?: string; password?: string}>
  ): Promise<BatchStartResponse> {
    try {
      const payload: any = { urls };

      // Add concurrent workers if specified
      if (concurrentWorkers !== undefined) {
        payload.concurrent_workers = concurrentWorkers;
        console.log(`[API] Using ${concurrentWorkers} concurrent workers`);
      }

      // Add proxies if specified
      if (proxies && proxies.length > 0) {
        payload.proxies = proxies;
        console.log(`[API] Using ${proxies.length} proxies for rotation`);
      }

      const response = await this.client.post<BatchStartResponse>(
        '/api/extract/batch',
        payload
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('[API] Batch extraction error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  async getBatchProgress(batchId: string): Promise<BatchProgress> {
    try {
      const response = await this.client.get<BatchProgress>(
        `/api/extract/batch/${batchId}/progress`
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('[API] Get batch progress error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  async getBatchResults(batchId: string): Promise<BatchExtractionResponse> {
    try {
      const response = await this.client.get<BatchExtractionResponse>(
        `/api/extract/batch/${batchId}/results`
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('[API] Get batch results error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  async health(): Promise<{ status: string; version: string }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('[API] Health check error:', error);
      throw error;
    }
  }
}

export const apiClient = new APIClient();

// Export convenience functions
export const extractSiretData = (url: string) => apiClient.extractSingle(url);
export const extractBatch = (
  urls: string[],
  concurrentWorkers?: number,
  proxies?: Array<{host: string; port: number; username?: string; password?: string}>
) => apiClient.extractBatch(urls, concurrentWorkers, proxies);

export { BATCH_SIZE };
