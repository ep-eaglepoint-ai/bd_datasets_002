import { Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import redis from '../config/redis';
import { config } from '../config';
import { JobData } from '../config/queue';
import { createJobEventsPublisher, publishJobEvent } from '../config/jobEvents';
import { createParser } from './parsers';
import { ValidationService, transformRecord } from '../services/validationService';

const BATCH_SIZE = 100;
const PROGRESS_UPDATE_INTERVAL = 2000; // 2 seconds

const jobEventsPublisher = createJobEventsPublisher();

function broadcast(jobId: string, message: Record<string, unknown>): void {
  publishJobEvent(jobEventsPublisher, jobId, message).catch((e) =>
    console.error('jobEvents publish error', e)
  );
}

export const worker = new Worker<JobData>(
  'document-processing',
  async (job: Job<JobData>) => {
    const { jobId, filename, fileType, schemaId } = job.data;
    
    console.log(`Processing job ${jobId}: ${filename}`);

    try {
      // Update job status to PROCESSING
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });

      // Fetch schema
      const schema = await prisma.schema.findUnique({
        where: { id: schemaId },
      });

      if (!schema) {
        throw new Error('Schema not found');
      }

      const fields = schema.fields as any[];
      const validator = new ValidationService(fields);
      const parser = createParser(filename, fileType);

      let recordsProcessed = 0;
      let recordsFailed = 0;
      let batch: any[] = [];
      let lastProgressUpdate = Date.now();

      // Process records
      for await (const { data: rawRecord, index } of parser.parse()) {
        // Check for cancellation
        const currentJob = await prisma.job.findUnique({
          where: { id: jobId },
          select: { status: true },
        });

        if (currentJob?.status === 'CANCELLED') {
          console.log(`Job ${jobId} was cancelled`);
          return;
        }

        // Transform record
        const transformedRecord = transformRecord(rawRecord, fields);

        // Validate record
        const validationResult = validator.validate(transformedRecord);

        if (validationResult.success) {
          batch.push(validationResult.data);
          recordsProcessed++;

          // Insert batch when it reaches BATCH_SIZE (100 records)
          if (batch.length >= BATCH_SIZE) {
            const startIndex = recordsProcessed + recordsFailed - batch.length;
            await insertBatch(jobId, startIndex, batch);
            batch = [];
          }
        } else {
          recordsFailed++;

          // Log each validation error
          for (const error of validationResult.errors || []) {
            await prisma.processingError.create({
              data: {
                jobId,
                recordIndex: index,
                fieldName: error.field,
                errorCode: error.code,
                errorMessage: error.message,
                rawValue: error.value ? String(error.value) : null,
              },
            });

            broadcast(jobId, {
              type: 'error',
              record_index: index,
              message: error.message,
            });
          }
        }

        // Update progress periodically (every 2 seconds)
        const now = Date.now();
        if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
          const totalSoFar = recordsProcessed + recordsFailed;
          const progress = totalSoFar < 10000 ? Math.floor((totalSoFar / 10000) * 99) : 99;

          await prisma.job.update({
            where: { id: jobId },
            data: {
              recordsProcessed,
              recordsFailed,
              progress,
            },
          });

          broadcast(jobId, {
            type: 'progress',
            progress,
            records_processed: recordsProcessed,
          });

          lastProgressUpdate = now;
        }
      }

      // Insert remaining batch
      if (batch.length > 0) {
        const startIndex = recordsProcessed + recordsFailed - batch.length;
        await insertBatch(jobId, startIndex, batch);
      }

      // Mark job as completed
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          recordsProcessed,
          recordsFailed,
          recordsTotal: recordsProcessed + recordsFailed,
          completedAt: new Date(),
        },
      });

      broadcast(jobId, {
        type: 'completed',
        status: 'COMPLETED',
        records_processed: recordsProcessed,
        records_failed: recordsFailed,
      });

      // Clean up uploaded file
      const filePath = path.join(config.upload.dir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      console.log(`Job ${jobId} completed: ${recordsProcessed} processed, ${recordsFailed} failed`);
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      broadcast(jobId, {
        type: 'completed',
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: config.worker.concurrency,
  }
);

async function insertBatch(jobId: string, startRecordIndex: number, records: any[]): Promise<void> {
  if (records.length === 0) return;
  await prisma.processedRecord.createMany({
    data: records.map((data, i) => ({
      jobId,
      recordIndex: startRecordIndex + i,
      data,
    })),
  });
}

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

// Graceful shutdown: complete current batch, then close
const shutdown = async () => {
  console.log('Worker shutting down...');
  jobEventsPublisher.quit();
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default worker;
