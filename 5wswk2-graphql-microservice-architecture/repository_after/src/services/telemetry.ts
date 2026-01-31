import * as opentelemetry from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
// Simplified telemetry for demo/test without needing a real collector
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

export const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'graphql-gateway',
  }),
  traceExporter: new ConsoleSpanExporter(), // Use Console instead of OTLP to avoid connection error in tests
  instrumentations: [],
});

export const tracer = opentelemetry.trace.getTracer('graphql-gateway');
