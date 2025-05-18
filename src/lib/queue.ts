import { VideoJobData } from '../types';

// Simple in-memory queue mock
// In a production app, you'd use BullMQ or a similar queue system
class SimpleQueue {
  private jobs: Record<string, VideoJobData> = {};
  private listeners: ((job: VideoJobData) => Promise<void>)[] = [];

  async add(jobName: string, job: VideoJobData): Promise<string> {
    this.jobs[jobName] = job;
    console.log(`[Queue] Added job ${jobName} to queue`);
    
    // Process the job immediately to simulate a queue
    for (const listener of this.listeners) {
      listener(job).catch(error => {
        console.error(`[Queue] Error processing job ${jobName}:`, error);
      });
    }
    
    return job.jobId;
  }

  process(callback: (job: VideoJobData) => Promise<void>) {
    this.listeners.push(callback);
    return this;
  }

  getJobs(): VideoJobData[] {
    return Object.values(this.jobs); // Return a copy to prevent modification
  }
}

// Export a singleton instance of the queue
export const videoQueue = new SimpleQueue(); 