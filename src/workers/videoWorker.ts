import { Worker, Job } from 'bullmq';
import { videoQueue } from '@/lib/queue'; // Import the same queue instance
import { processVideoJob } from '@/lib/videoGenerationService';
import { VideoJobData } from '@/types';

const CONCURRENCY = parseInt(process.env.VIDEO_WORKER_CONCURRENCY || '1', 10);

console.log(`[VideoWorker] Starting up with concurrency: ${CONCURRENCY}`);

// Define the worker
const worker = new Worker<VideoJobData, void>(
  videoQueue.name, // Important: Use the queue name from the imported queue instance
  async (job: Job<VideoJobData, void>) => {
    console.log(`[VideoWorker JOB ${job.id}] Picked up job. Data:`, job.data);
    try {
      await processVideoJob(job.data); // job.data should match VideoJobData
      console.log(`[VideoWorker JOB ${job.id}] Job completed successfully.`);
    } catch (error) {
      console.error(`[VideoWorker JOB ${job.id}] Job failed:`, error);
      // The error will be re-thrown by processVideoJob if it occurs there
      // BullMQ will handle job failure states based on this error
      throw error; // Re-throw the error to mark the job as failed in BullMQ
    }
  },
  {
    connection: videoQueue.opts.connection, // Reuse connection options from the queue
    concurrency: CONCURRENCY, // Number of jobs to process concurrently
    removeOnComplete: { count: 1000, age: 24 * 3600 }, // Keep completed jobs for 24 hours
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },    // Keep failed jobs for 7 days
  }
);

worker.on('completed', (job: Job, result: any) => {
  console.log(`[VideoWorker JOB ${job.id}] Completed. Result:`, result);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[VideoWorker JOB ${job?.id || 'unknown'}] Failed:`, err.message, err.stack);
});

worker.on('error', err => {
  console.error('[VideoWorker] Worker error:', err);
});

console.log('[VideoWorker] Worker initialized and listening for jobs...');

// Graceful shutdown (optional but good practice)
process.on('SIGINT', async () => {
  console.log('[VideoWorker] SIGINT received, shutting down worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[VideoWorker] SIGTERM received, shutting down worker...');
  await worker.close();
  process.exit(0);
}); 