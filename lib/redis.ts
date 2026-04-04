import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    const client = new Redis(redisUrl, {
      lazyConnect: false,
      enableOfflineQueue: false,
    });

    client.on('connect', () => {
      console.log('[Redis] Connected to Redis server');
    });

    client.on('ready', () => {
      console.log('[Redis] Redis client is ready');
    });

    client.on('error', (err: Error) => {
      console.error('[Redis] Connection error:', err.message);
      redisClient = null;
    });

    redisClient = client;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Redis] Failed to create Redis client:', message);
    return null;
  }

  return redisClient;
}
