import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    const client = new Redis(redisUrl, {
      // Commands issued while Redis is disconnected fail immediately instead of
      // being queued, so callers get a quick null-safe signal to skip caching.
      enableOfflineQueue: false,
    });

    client.on('connect', () => {
      console.log('[Redis] Connected to Redis server');
    });

    client.on('ready', () => {
      console.log('[Redis] Redis client is ready');
    });

    client.on('error', (err: Error) => {
      // Log the error but keep the client reference intact so that ioredis can
      // attempt reconnection automatically. The singleton is not cleared here to
      // prevent multiple client instances from being created on each call.
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient = client;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Redis] Failed to create Redis client:', message);
    return null;
  }

  return redisClient;
}
