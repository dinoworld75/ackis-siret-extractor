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

export interface ProcessingState {
  status: ProcessingStatus;
  progress: ProcessingProgress;
  results: ExtractionResult[];
  error: string | null;
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
  });

  const startProcessing = useCallback(
    async (file: UploadedFile, selectedColumns: ColumnSelection[]) => {
      console.log('[Processing] Starting processing...');
      console.log('[Processing] File:', file.name);
      console.log('[Processing] Selected columns:', selectedColumns.filter((c) => c.selected));

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
        });
        return;
      }

      const urls = extractedUrls.map((e) => e.url);
      const batches = chunkArray(urls, BATCH_SIZE);
      const totalBatches = batches.length;
      const totalUrls = urls.length;

      console.log(`[Processing] Extracted ${totalUrls} URLs, split into ${totalBatches} batches`);

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
      });

      const allResults: ExtractionResult[] = [];
      const startTime = Date.now();

      try {
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const batchStartTime = Date.now();

          console.log(`[Processing] Processing batch ${i + 1}/${totalBatches} (${batch.length} URLs)`);

          try {
            const response = await apiClient.extractBatch(batch);
            allResults.push(...response.results);

            const batchEndTime = Date.now();
            const batchDuration = (batchEndTime - batchStartTime) / 1000; // seconds
            console.log(`[Processing] Batch ${i + 1} completed in ${batchDuration.toFixed(2)}s`);

            // Calculate statistics
            const successCount = allResults.filter((r) => r.status === 'success').length;
            const errorCount = allResults.filter((r) => r.status === 'error').length;
            const noDataCount = allResults.filter((r) => r.status === 'no_data').length;

            // Calculate estimated time remaining
            const elapsedTime = (Date.now() - startTime) / 1000; // seconds
            const processedUrls = allResults.length;
            const remainingUrls = totalUrls - processedUrls;
            const avgTimePerUrl = elapsedTime / processedUrls;
            const estimatedTimeRemaining = remainingUrls * avgTimePerUrl;

            setState({
              status: 'processing',
              progress: {
                currentBatch: i + 1,
                totalBatches,
                processedUrls: allResults.length,
                totalUrls,
                successCount,
                errorCount,
                noDataCount,
                percentage: ((i + 1) / totalBatches) * 100,
                estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
              },
              results: allResults,
              error: null,
            });
          } catch (batchError) {
            console.error(`[Processing] Batch ${i + 1} failed:`, batchError);

            // Retry the failed batch once
            console.log(`[Processing] Retrying batch ${i + 1}...`);
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before retry

            try {
              const response = await apiClient.extractBatch(batch);
              allResults.push(...response.results);
              console.log(`[Processing] Batch ${i + 1} retry succeeded`);

              // Update state after successful retry
              const successCount = allResults.filter((r) => r.status === 'success').length;
              const errorCount = allResults.filter((r) => r.status === 'error').length;
              const noDataCount = allResults.filter((r) => r.status === 'no_data').length;

              const elapsedTime = (Date.now() - startTime) / 1000;
              const processedUrls = allResults.length;
              const remainingUrls = totalUrls - processedUrls;
              const avgTimePerUrl = elapsedTime / processedUrls;
              const estimatedTimeRemaining = remainingUrls * avgTimePerUrl;

              setState({
                status: 'processing',
                progress: {
                  currentBatch: i + 1,
                  totalBatches,
                  processedUrls: allResults.length,
                  totalUrls,
                  successCount,
                  errorCount,
                  noDataCount,
                  percentage: ((i + 1) / totalBatches) * 100,
                  estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
                },
                results: allResults,
                error: null,
              });
            } catch (retryError) {
              console.error(`[Processing] Batch ${i + 1} retry failed:`, retryError);
              throw new Error(
                `Batch ${i + 1} failed after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`
              );
            }
          }
        }

        // Processing complete
        const totalTime = (Date.now() - startTime) / 1000;
        console.log(`[Processing] Complete! Processed ${totalUrls} URLs in ${totalTime.toFixed(2)}s`);
        console.log(
          `[Processing] Results: ${state.progress.successCount} success, ${state.progress.errorCount} errors, ${state.progress.noDataCount} no data`
        );

        const successCount = allResults.filter((r) => r.status === 'success').length;
        const errorCount = allResults.filter((r) => r.status === 'error').length;
        const noDataCount = allResults.filter((r) => r.status === 'no_data').length;

        setState({
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
        });

        return allResults;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Processing failed';
        console.error('[Processing] Error:', errorMessage);

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
