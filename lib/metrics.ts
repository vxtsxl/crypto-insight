import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Create a dedicated registry for this app
const register = new Registry();

// Collect default Node.js metrics (event loop lag, heap size, GC, etc.)
collectDefaultMetrics({ register, prefix: 'crypto_insight_' });

// HTTP request counter — tracks every request by method, route, status code
export const httpRequestsTotal = new Counter({
  name: 'crypto_insight_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP request duration — tracks latency as a histogram (p50, p95, p99)
export const httpRequestDuration = new Histogram({
  name: 'crypto_insight_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// CoinGecko API call duration
export const coinGeckoApiDuration = new Histogram({
  name: 'crypto_insight_coingecko_api_duration_seconds',
  help: 'CoinGecko API call duration in seconds',
  labelNames: ['endpoint', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Redis cache hits and misses
export const redisCacheHits = new Counter({
  name: 'crypto_insight_redis_cache_hits_total',
  help: 'Total Redis cache hits',
  labelNames: ['key_type'],
  registers: [register],
});

export const redisCacheMisses = new Counter({
  name: 'crypto_insight_redis_cache_misses_total',
  help: 'Total Redis cache misses',
  labelNames: ['key_type'],
  registers: [register],
});

// Currently active requests
export const activeRequests = new Gauge({
  name: 'crypto_insight_active_requests',
  help: 'Number of active HTTP requests being processed',
  registers: [register],
});

export { register };