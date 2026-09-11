import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Instantiate an ioredis client properly for Upstash Redis
// maxRetriesPerRequest: null and enableReadyCheck: false are required by BullMQ + Upstash
export const redisConnection = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, { 
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

export const gradeQueue = new Queue('GradeQueue', { 
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { age: 300, count: 100 }, // Keep results for 5 min so frontend can poll
    removeOnFail: false,
  }
});
