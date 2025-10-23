import { useState, useCallback } from 'react';
import { apiClient, BATCH_SIZE } from '../services/api';
import { ExtractionResult } from '../types/api.types';
import { UploadedFile } from '../types/file.types';
import { ColumnSelection } from '../types/column.types';
import { extractUrls, chunkArray } from '../utils/urlExtractor';

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface ProcessingProgress {
  currentBatch: number;
  totalBatches: number;
  processedUrls: number;
  totalUrls: number;
  successCount: number;
  errorCount: number;
  noDataCount: number;
  percentage: number;
  estimatedTimeRemaining: number; // in seconds
}

export interface ProcessingLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ProcessingState {
  status: ProcessingStatus;
  progress: ProcessingProgress;
  results: ExtractionResult[];
  error: string | null;
  logs: ProcessingLog[];
  concurrentWorkers?: number;
  proxyCount?: number;
}

const AVERAGE_TIME_PER_URL = 17.63; // seconds, from backend performance data

export function useProcessing() {
  const [state, setState] = useState<ProcessingState>({
    status: 'idle',
    progress: {
      currentBatch: 0,
      totalBatches: 0,
      processedUrls: 0,
      totalUrls: 0,
      successCount: 0,
      errorCount: 0,
      noDataCount: 0,
      percentage: 0,
      estimatedTimeRemaining: 0,
    },
    results: [],
    error: null,
    logs: [],
    concurrentWorkers: undefined,
    proxyCount: undefined,
  });


  const startProcessing = useCallback(
    async (file: UploadedFile, selectedColumns: ColumnSelection[]) => {
      console.log('[Processing] Starting processing...');
      console.log('[Processing] File:', file.name);
      console.log('[Processing] Selected columns:', selectedColumns.filter((c) => c.selected));

      // Load settings from localStorage
      const settingsJson = localStorage.getItem('extractorSettings');
      const settings = settingsJson ? JSON.parse(settingsJson) : { concurrentWorkers: 10 };
      const concurrentWorkers = settings.concurrentWorkers || 10;

      // Load proxies from localStorage
      const proxyDataRaw = localStorage.getItem('proxyData');
      let proxies: Array<{host: string; port: number; username?: string; password?: string}> = [];

      if (proxyDataRaw) {
        const proxyLines = proxyDataRaw.split('\n').filter(line => line.trim());
        proxies = proxyLines.map(line => {
          // Format: host:port:username:password
          const parts = line.trim().split(':');
          if (parts.length >= 2) {
            return {
              host: parts[0],
              port: parseInt(parts[1], 10),
              username: parts[2] || undefined,
              password: parts[3] || undefined,
            };
          }
          return null;
        }).filter(p => p !== null) as Array<{host: string; port: number; username?: string; password?: string}>;
      }

      console.log(`[Processing] Using ${concurrentWorkers} concurrent workers`);
      if (proxies.length > 0) {
        console.log(`[Processing] Using ${proxies.length} proxies for rotation`);
      } else {
        console.log('[Processing] No proxies configured');
      }

      // Extract URLs from file
      const extractedUrls = extractUrls(file, selectedColumns);

      if (extractedUrls.length === 0) {
        setState({
          status: 'error',
          progress: {
            currentBatch: 0,
            totalBatches: 0,
            processedUrls: 0,
            totalUrls: 0,
            successCount: 0,
            errorCount: 0,
            noDataCount: 0,
            percentage: 0,
            estimatedTimeRemaining: 0,
          },
          results: [],
          error: 'No valid URLs found in selected columns',
          logs: [],
          concurrentWorkers: undefined,
          proxyCount: undefined,
        });
        return;
      }

      const urls = extractedUrls.map((e) => e.url);
      const batches = chunkArray(urls, BATCH_SIZE);
      const totalBatches = batches.length;
      const totalUrls = urls.length;

      console.log(`[Processing] Extracted ${totalUrls} URLs, split into ${totalBatches} batches`);

      // Initialize state with logs
      setState({
        status: 'processing',
        progress: {
          currentBatch: 0,
          totalBatches,
          processedUrls: 0,
          totalUrls,
          successCount: 0,
          errorCount: 0,
          noDataCount: 0,
          percentage: 0,
          estimatedTimeRemaining: totalUrls * AVERAGE_TIME_PER_URL,
        },
        results: [],
        error: null,
        logs: [
          {
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
            message: `Starting processing of ${totalUrls} URLs`,
            type: 'info',
          },
          {
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
            message: `Using ${concurrentWorkers} concurrent workers`,
            type: 'info',
          },
          {
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
            message: proxies.length > 0 ? `Using ${proxies.length} proxies for rotation` : 'No proxies configured (direct connection)',
            type: proxies.length > 0 ? 'success' : 'warning',
          },
          {
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
            message: `Split into ${totalBatches} batches of ${BATCH_SIZE} URLs each`,
            type: 'info',
          },
        ],
        concurrentWorkers,
        proxyCount: proxies.length,
      });

      const allResults: ExtractionResult[] = [];
      const startTime = Date.now();
      const pollingIntervals = new Map<string, NodeJS.Timeout>();
      const batchIds: string[] = [];
      const batchCompletedCount = { value: 0 };

      try {
        // Step 1: Start all batches and collect batch_ids
        console.log('[Processing] Starting all batches...');
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];

          setState((prev) => ({
            ...prev,
            logs: [
              ...prev.logs,
              {
                timestamp: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
                message: `Starting batch ${i + 1}/${totalBatches} (${batch.length} URLs)`,
                type: 'info' as const,
              },
            ],
          }));

          const startResponse = await apiClient.extractBatch(batch, concurrentWorkers, proxies.length > 0 ? proxies : undefined);
          batchIds.push(startResponse.batch_id);
          console.log(`[Processing] Batch ${i + 1} started with ID: ${startResponse.batch_id}`);
        }

        console.log(`[Processing] All ${batchIds.length} batches started, beginning polling...`);

        // Step 2: Setup polling for each batch
        const pollBatch = async (batchId: string, batchIndex: number) => {
          try {
            const progress = await apiClient.getBatchProgress(batchId);

            // Calculate global progress from all batches
            const elapsedTime = (Date.now() - startTime) / 1000;
            const avgTimePerUrl = progress.completed > 0 ? elapsedTime / progress.completed : AVERAGE_TIME_PER_URL;
            const remainingUrls = totalUrls - allResults.length;
            const estimatedTimeRemaining = remainingUrls * avgTimePerUrl;

            setState((prev) => ({
              status: 'processing',
              progress: {
                currentBatch: batchCompletedCount.value,
                totalBatches,
                processedUrls: allResults.length,
                totalUrls,
                successCount: allResults.filter((r) => r.status === 'success').length,
                errorCount: allResults.filter((r) => r.status === 'error').length,
                noDataCount: allResults.filter((r) => r.status === 'no_data').length,
                percentage: (allResults.length / totalUrls) * 100,
                estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
              },
              results: allResults,
              error: null,
              logs: prev.logs,
              concurrentWorkers: prev.concurrentWorkers,
              proxyCount: prev.proxyCount,
            }));

            // Check if batch is complete
            if (!progress.in_progress) {
              const interval = pollingIntervals.get(batchId);
              if (interval) {
                clearInterval(interval);
                pollingIntervals.delete(batchId);
              }

              console.log(`[Processing] Batch ${batchIndex + 1} completed, fetching results...`);

              // Fetch results
              const results = await apiClient.getBatchResults(batchId);
              allResults.push(...results.results);
              batchCompletedCount.value++;

              const successCount = allResults.filter((r) => r.status === 'success').length;
              const errorCount = allResults.filter((r) => r.status === 'error').length;
              const noDataCount = allResults.filter((r) => r.status === 'no_data').length;

              setState((prev) => ({
                status: 'processing',
                progress: {
                  currentBatch: batchCompletedCount.value,
                  totalBatches,
                  processedUrls: allResults.length,
                  totalUrls,
                  successCount,
                  errorCount,
                  noDataCount,
                  percentage: (allResults.length / totalUrls) * 100,
                  estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
                },
                results: allResults,
                error: null,
                logs: [
                  ...prev.logs,
                  {
                    timestamp: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
                    message: `Batch ${batchIndex + 1} completed → ${results.successful} success, ${results.failed - (results.total - results.successful - results.failed)} no data, ${results.failed} errors`,
                    type: 'success' as const,
                  },
                ],
                concurrentWorkers: prev.concurrentWorkers,
                proxyCount: prev.proxyCount,
              }));

              // Check if all batches are complete
              if (batchCompletedCount.value === totalBatches) {
                const totalTime = (Date.now() - startTime) / 1000;
                console.log(`[Processing] All batches complete! Processed ${totalUrls} URLs in ${totalTime.toFixed(2)}s`);

                setState((prev) => ({
                  status: 'completed',
                  progress: {
                    currentBatch: totalBatches,
                    totalBatches,
                    processedUrls: totalUrls,
                    totalUrls,
                    successCount,
                    errorCount,
                    noDataCount,
                    percentage: 100,
                    estimatedTimeRemaining: 0,
                  },
                  results: allResults,
                  error: null,
                  logs: [
                    ...prev.logs,
                    {
                      timestamp: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
                      message: `Processing completed! ${totalUrls} URLs processed in ${totalTime.toFixed(2)}s`,
                      type: 'success' as const,
                    },
                    {
                      timestamp: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
                      message: `Final results: ${successCount} success, ${noDataCount} no data, ${errorCount} errors`,
                      type: 'info' as const,
                    },
                  ],
                  concurrentWorkers: prev.concurrentWorkers,
                  proxyCount: prev.proxyCount,
                }));
              }
            }
          } catch (pollError) {
            console.error(`[Processing] Polling error for batch ${batchIndex + 1}:`, pollError);
          }
        };

        // Start polling for each batch
        batchIds.forEach((batchId, index) => {
          const interval = setInterval(() => pollBatch(batchId, index), 1500);
          pollingIntervals.set(batchId, interval);
        });

        // Wait for all batches to complete
        await new Promise<void>((resolve) => {
          const checkCompletion = setInterval(() => {
            if (batchCompletedCount.value === totalBatches) {
              clearInterval(checkCompletion);
              resolve();
            }
          }, 500);
        });

        return allResults;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Processing failed';
        console.error('[Processing] Error:', errorMessage);

        // Clean up all polling intervals
        pollingIntervals.forEach((interval) => clearInterval(interval));
        pollingIntervals.clear();

        setState((prevState) => ({
          ...prevState,
          status: 'error',
          error: errorMessage,
        }));

        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    console.log('[Processing] Resetting state');
    setState({
      status: 'idle',
      progress: {
        currentBatch: 0,
        totalBatches: 0,
        processedUrls: 0,
        totalUrls: 0,
        successCount: 0,
        errorCount: 0,
        noDataCount: 0,
        percentage: 0,
        estimatedTimeRemaining: 0,
      },
      results: [],
      error: null,
      logs: [],
      concurrentWorkers: undefined,
      proxyCount: undefined,
    });
  }, []);

  const cancel = useCallback(() => {
    console.log('[Processing] Cancelling processing');
    setState((prevState) => ({
      ...prevState,
      status: 'idle',
    }));
  }, []);

  return {
    state,
    startProcessing,
    reset,
    cancel,
  };
}
