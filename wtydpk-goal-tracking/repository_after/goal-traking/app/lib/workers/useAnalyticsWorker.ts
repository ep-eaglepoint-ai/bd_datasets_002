'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WorkerMessage, WorkerResponse } from './analytics.worker';
import { Goal, Milestone, ProgressUpdate, Dependency } from '../types';

interface AnalyticsWorkerHook {
  isReady: boolean;
  computeTrendAnalysis: (goals: Goal[], updates: ProgressUpdate[]) => Promise<TrendResult | null>;
  computePrediction: (
    goal: Goal,
    milestones: Milestone[],
    updates: ProgressUpdate[],
    deps: Dependency[],
    rate: number
  ) => Promise<PredictionResult | null>;
  computeBatchAnalytics: (
    goals: Goal[],
    milestones: Milestone[],
    updates: ProgressUpdate[]
  ) => Promise<BatchResult | null>;
}

interface TrendResult {
  consistencyScore: number;
  motivationTrend: 'improving' | 'declining' | 'stable' | 'volatile';
  completionReliability: number;
  abandonmentRate: number;
  burnoutRisk: 'low' | 'medium' | 'high' | 'critical';
  averageVelocity: number;
}

interface PredictionResult {
  probability: number;
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  estimatedCompletionDate?: string;
  riskFactors: string[];
  positiveFactors: string[];
}

interface BatchResult {
  velocities: Map<string, number>;
  predictions: Map<string, number>;
}

export function useAnalyticsWorker(): AnalyticsWorkerHook {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingRequests = useRef<Map<string, (value: unknown) => void>>(new Map());
  const requestIdCounter = useRef(0);

  useEffect(() => {
    // Create worker only in browser environment
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        // Dynamic import for the worker to avoid SSR issues
        workerRef.current = new Worker(
          new URL('./analytics.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { type, payload } = event.data;
          const resolver = pendingRequests.current.get(type);
          if (resolver) {
            resolver(payload);
            pendingRequests.current.delete(type);
          }
        };
        
        workerRef.current.onerror = (error) => {
          console.error('Analytics worker error:', error);
        };
        
        setIsReady(true);
      } catch (error) {
        console.warn('Web Workers not supported, falling back to main thread');
        setIsReady(false);
      }
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(<T>(message: WorkerMessage, responseType: string): Promise<T | null> => {
    return new Promise((resolve) => {
      if (!workerRef.current || !isReady) {
        resolve(null);
        return;
      }
      
      pendingRequests.current.set(responseType, resolve as (value: unknown) => void);
      workerRef.current.postMessage(message);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (pendingRequests.current.has(responseType)) {
          pendingRequests.current.delete(responseType);
          resolve(null);
        }
      }, 10000);
    });
  }, [isReady]);

  const computeTrendAnalysis = useCallback(
    (goals: Goal[], updates: ProgressUpdate[]) => {
      return sendMessage<TrendResult>(
        { type: 'COMPUTE_TREND_ANALYSIS', payload: { goals, updates } },
        'TREND_RESULT'
      );
    },
    [sendMessage]
  );

  const computePrediction = useCallback(
    (goal: Goal, milestones: Milestone[], updates: ProgressUpdate[], deps: Dependency[], rate: number) => {
      return sendMessage<PredictionResult>(
        { type: 'COMPUTE_PREDICTION', payload: { goal, milestones, updates, deps, rate } },
        'PREDICTION_RESULT'
      );
    },
    [sendMessage]
  );

  const computeBatchAnalytics = useCallback(
    (goals: Goal[], milestones: Milestone[], updates: ProgressUpdate[]) => {
      return sendMessage<BatchResult>(
        { type: 'COMPUTE_BATCH_ANALYTICS', payload: { goals, milestones, updates } },
        'BATCH_RESULT'
      );
    },
    [sendMessage]
  );

  return {
    isReady,
    computeTrendAnalysis,
    computePrediction,
    computeBatchAnalytics,
  };
}
