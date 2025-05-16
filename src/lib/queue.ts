// console.log('[queue.ts] File loaded.');
// console.log('[queue.ts] Initial REDIS_URL:', process.env.REDIS_URL);

import { Queue } from 'bullmq';
import Redis, { RedisOptions } from 'ioredis';

let connectionConfig: RedisOptions;
const redisURL = process.env.REDIS_URL;

if (redisURL) {
  console.log('[queue.ts] REDIS_URL found:', redisURL);

  // Let ioredis handle TLS based on the URL scheme (redis:// vs rediss://)
  // Create a temporary instance just to get options that ioredis derives from the URL.
  const tempRedisInstanceForOpts = new Redis(redisURL, {
      lazyConnect: true, // Don't connect immediately
      maxRetriesPerRequest: null, // BullMQ handles retries at the job level
      // No explicit TLS options here; ioredis should infer from `rediss://` scheme if present.
  });
  connectionConfig = { ...tempRedisInstanceForOpts.options }; // Clone the options
  tempRedisInstanceForOpts.disconnect(); // Disconnect the temporary instance

  // BullMQ often prefers host, port, password to be explicitly in the connection options,
  // even if ioredis can derive them. `ioredis.options` might be sparse.
  try {
    const parsedUrl = new URL(redisURL);
    if (!connectionConfig.host) {
        connectionConfig.host = parsedUrl.hostname;
    }
    if (!connectionConfig.port) {
        const port = parseInt(parsedUrl.port, 10);
        if (!isNaN(port)) {
            connectionConfig.port = port;
        }
    }
    // ioredis usually handles auth (user:pass@) from URL well, but let's ensure password is set if present in URL
    // especially if the username is 'default' which ioredis might treat as no username.
    if (parsedUrl.password) {
        const decodedPassword = decodeURIComponent(parsedUrl.password);
        if (connectionConfig.password !== decodedPassword) {
            // console.warn("[queue.ts] Overriding password in connectionConfig with value from parsed URL.");
            connectionConfig.password = decodedPassword;
        }
    }
    if (parsedUrl.username && (!connectionConfig.username || connectionConfig.username === 'default')) {
         // If ioredis set username to 'default' from an empty part, or didn't set it, use URL's username
        const decodedUsername = decodeURIComponent(parsedUrl.username);
        if (connectionConfig.username !== decodedUsername) {
            // console.warn("[queue.ts] Overriding username in connectionConfig with value from parsed URL.");
            connectionConfig.username = decodedUsername;
        }
    }

    // If the scheme was rediss://, ensure tls object is present, as ioredis.options might not always add it
    if (parsedUrl.protocol === 'rediss:' && !connectionConfig.tls) {
        console.log('[queue.ts] rediss:// scheme detected, ensuring tls: {} is in connectionConfig.');
        connectionConfig.tls = {};
    }

  } catch (e) {
    console.error('[queue.ts] Error parsing REDIS_URL for fallback config:', e);
  }

  console.log('[queue.ts] Final connection config to be used by BullMQ:', JSON.stringify(connectionConfig, null, 2));

} else {
  console.log('[queue.ts] REDIS_URL not found, using default localhost.');
  connectionConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, 
  };
}

export const videoQueue = new Queue('videoQueue', {
  connection: connectionConfig,
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600,
    },
  },
});

videoQueue.on('error', (err) => {
  console.error('BullMQ Queue Error:', err);
});

if (process.env.NODE_ENV !== 'test') { 
  console.log('[queue.ts] Attempting to connect videoQueue to Redis with derived config...');
  videoQueue.waitUntilReady().then(() => {
    console.log('[queue.ts] videoQueue successfully connected to Redis.');
  }).catch(err => {
    console.error('[queue.ts] Failed to connect videoQueue to Redis:', err);
    console.error('[queue.ts] Connection config used:', JSON.stringify(connectionConfig, null, 2));
  });
} 