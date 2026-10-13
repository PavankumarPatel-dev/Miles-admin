import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_DASHBOARD_VERSION_KEYS = {
  users: 'dashboard:version:users',
  bookings: 'dashboard:version:bookings',
  transactions: 'dashboard:version:transactions',
} as const;

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const token = config.get<string>('REDIS_TOKEN');
    const redisUrl =
      config.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
    const options = {
      ...(token ? { password: token } : {}),
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt: number) => Math.min(attempt * 500, 5000),
    };
    const endpoint = new URL(redisUrl);
    const redis =
      endpoint.protocol === 'https:'
        ? new Redis({
            ...options,
            host: endpoint.hostname,
            port: 6379,
            username: 'default',
            password: token || endpoint.password,
            tls: {},
          })
        : new Redis(redisUrl, options);
    redis.on('error', () => undefined);
    return redis;
  },
};
