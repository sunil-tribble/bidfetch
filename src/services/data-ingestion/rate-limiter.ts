import Redis from 'ioredis';
import { config } from '../../config';

export interface RateLimitConfig {
  source: string;
  limit: number;
  window: number; // in milliseconds
}

export class RateLimiter {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(config.database.redis.url);
  }
  
  async checkLimit(config: RateLimitConfig): Promise<boolean> {
    const key = `rate_limit:${config.source}`;
    const now = Date.now();
    const windowStart = now - config.window;
    
    // Use Lua script for atomic operation
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window_start = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      
      -- Remove old entries
      redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
      
      -- Count current entries
      local current = redis.call('ZCARD', key)
      
      if current < limit then
        -- Add new entry
        redis.call('ZADD', key, now, now)
        redis.call('EXPIRE', key, math.ceil(ARGV[4] / 1000))
        return 1
      else
        return 0
      end
    `;
    
    const result = await this.redis.eval(
      luaScript,
      1,
      key,
      now,
      windowStart,
      config.limit,
      config.window
    ) as number;
    
    return result === 1;
  }
  
  async getRemainingQuota(config: RateLimitConfig): Promise<number> {
    const key = `rate_limit:${config.source}`;
    const now = Date.now();
    const windowStart = now - config.window;
    
    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current entries
    const current = await this.redis.zcard(key);
    
    return Math.max(0, config.limit - current);
  }
  
  async getResetTime(config: RateLimitConfig): Promise<number> {
    const key = `rate_limit:${config.source}`;
    const oldestEntry = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
    
    if (oldestEntry.length === 0) {
      return 0;
    }
    
    const oldestTimestamp = parseInt(oldestEntry[1], 10);
    return oldestTimestamp + config.window;
  }
  
  async reset(source: string): Promise<void> {
    const key = `rate_limit:${source}`;
    await this.redis.del(key);
  }
  
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export class AdaptiveRateLimiter extends RateLimiter {
  private adaptiveFactors: Map<string, number> = new Map();
  
  async checkLimitWithBackoff(config: RateLimitConfig): Promise<boolean> {
    const factor = this.adaptiveFactors.get(config.source) || 1;
    const adjustedLimit = Math.floor(config.limit * factor);
    
    const allowed = await this.checkLimit({
      ...config,
      limit: adjustedLimit,
    });
    
    if (!allowed) {
      // Reduce factor on rate limit hit
      this.adjustFactor(config.source, 0.9);
    } else {
      // Slowly increase factor when successful
      this.adjustFactor(config.source, 1.01);
    }
    
    return allowed;
  }
  
  private adjustFactor(source: string, multiplier: number): void {
    const current = this.adaptiveFactors.get(source) || 1;
    const newFactor = Math.max(0.5, Math.min(1, current * multiplier));
    this.adaptiveFactors.set(source, newFactor);
  }
  
  async waitForQuota(config: RateLimitConfig): Promise<void> {
    while (!(await this.checkLimit(config))) {
      const resetTime = await this.getResetTime(config);
      const waitTime = Math.max(1000, resetTime - Date.now());
      
      console.log(`Rate limit reached for ${config.source}. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000)));
    }
  }
}