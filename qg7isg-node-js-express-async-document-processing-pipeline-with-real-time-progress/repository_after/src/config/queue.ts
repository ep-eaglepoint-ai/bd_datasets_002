import { Queue } from 'bullmq';
import redis from '../config/redis';

export interface JobData {
  jobId: string;
  partnerId: string;
  schemaId: string;
  filename: string;
  fileType: string;
}

export const processingQueue = new Queue<JobData>('document-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 1000,
    },
  },
});

export default processingQueue;
