import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';

const makeLimiter = (windowMs, max, prefix) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix,
    }),
    message: { error: 'Too many requests, slow down.' },
  });

export const publicLimiter = makeLimiter(60_000, 60, 'rl:pub:');
export const authLimiter = makeLimiter(10 * 60_000, 10, 'rl:auth:');
export const chatbotLimiter = makeLimiter(60_000, 15, 'rl:bot:');
export const uploadLimiter = makeLimiter(10 * 60_000, 10, 'rl:upload:');