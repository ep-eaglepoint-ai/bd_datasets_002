/**
 * Web Worker for heavy statistical computations
 * Offloads CPU-intensive work to prevent UI blocking
 */

import { SurveyResponse } from '@/lib/schemas/survey';

// This would be in a separate worker file in production
// For now, we'll create a wrapper that can be used with Web Workers

export interface StatisticsWorkerMessage {
  type: 'compute-summary' | 'compute-crosstab' | 'compute-segmentation';
  payload: {
    responses: SurveyResponse[];
    questionId: string;
    questionId2?: string;
    segmentFilter?: unknown;
  };
}

export interface StatisticsWorkerResponse {
  type: 'result' | 'error' | 'progress';
  payload: unknown;
  progress?: number;
}

/**
 * Creates a statistics worker
 */
export function createStatisticsWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    console.warn('Web Workers not supported');
    return null;
  }

  try {
    // Load the worker file from public directory
    const worker = new Worker('/statistics.worker.js');
    return worker;
  } catch (error) {
    console.warn('Failed to create worker:', error);
    return null;
  }
}

/**
 * Computes statistics in a worker (fallback to sync if workers unavailable)
 */
export async function computeStatisticsInWorker(
  responses: SurveyResponse[],
  questionId: string,
  computeFn: (responses: SurveyResponse[], questionId: string) => unknown
): Promise<unknown> {
  const worker = createStatisticsWorker();
  
  if (!worker) {
    // Fallback to synchronous computation
    return computeFn(responses, questionId);
  }

  return new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<StatisticsWorkerResponse>) => {
      if (e.data.type === 'result') {
        resolve(e.data.payload);
      } else if (e.data.type === 'error') {
        reject(new Error(String(e.data.payload)));
      }
    };

    worker.onerror = (error) => {
      reject(error);
    };

    worker.postMessage({
      type: 'compute-summary',
      payload: { responses, questionId },
    } as StatisticsWorkerMessage);
  });
}
