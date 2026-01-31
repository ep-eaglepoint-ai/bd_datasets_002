import * as opentelemetry from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
// Simplified telemetry for demo/test without needing a real collector
import { ConsoleSpanExporter, SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';

export const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'graphql-gateway',
  }),
  // Use InMemory (silent) for tests, Console for local dev/demo
  traceExporter: process.env.NODE_ENV === 'test' ? new InMemorySpanExporter() : new ConsoleSpanExporter(),
  instrumentations: [],
});

export const tracer = opentelemetry.trace.getTracer('graphql-gateway');
