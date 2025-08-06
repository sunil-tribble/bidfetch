"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CACHE_CONFIG = exports.CacheManager = void 0;
const ioredis_1 = require("ioredis");
class CacheManager {
    logger;
    config;
    redis;
    hotCache;
    warmCache;
    coldCache;
    hitStats = new Map();
    constructor(logger, config) {
        this.logger = logger;
        this.config = config;
        this.initializeRedisConnections();
        this.setupEventHandlers();
    }
    initializeRedisConnections() {
        const baseConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true
        };
        // Main cache instance
        this.redis = new ioredis_1.Redis(baseConfig);
        // Hot cache - frequently accessed data (opportunities, recent contracts)
        this.hotCache = new ioredis_1.Redis({
            ...baseConfig,
            db: 1,
            maxMemoryPolicy: this.config.tiers.hot.evictionPolicy,
            keyPrefix: this.config.tiers.hot.keyPrefix
        });
        // Warm cache - moderately accessed data (analytics results, aggregations)
        this.warmCache = new ioredis_1.Redis({
            ...baseConfig,
            db: 2,
            maxMemoryPolicy: this.config.tiers.warm.evictionPolicy,
            keyPrefix: this.config.tiers.warm.keyPrefix
        });
        // Cold cache - infrequently accessed data (historical data, processed documents)
        this.coldCache = new ioredis_1.Redis({
            ...baseConfig,
            db: 3,
            maxMemoryPolicy: this.config.tiers.cold.evictionPolicy,
            keyPrefix: this.config.tiers.cold.keyPrefix
        });
    }
    setupEventHandlers() {
        [this.redis, this.hotCache, this.warmCache, this.coldCache].forEach((client, index) => {
            client.on('connect', () => {
                this.logger.info(`Redis connection established for cache tier ${index}`);
            });
            client.on('error', (error) => {
                this.logger.error(`Redis error on cache tier ${index}:`, error);
            });
            client.on('ready', () => {
                this.logger.info(`Redis ready on cache tier ${index}`);
            });
        });
    }
    /**
     * Get data from cache with automatic tier promotion
     */
    async get(key, tier) {
        const startTime = Date.now();
        try {
            let result = null;
            let foundTier = '';
            if (tier) {
                // Get from specific tier
                result = await this.getCacheClient(tier).get(key);
                foundTier = tier;
            }
            else {
                // Check hot cache first, then warm, then cold
                for (const tierName of ['hot', 'warm', 'cold']) {
                    result = await this.getCacheClient(tierName).get(key);
                    if (result) {
                        foundTier = tierName;
                        break;
                    }
                }
            }
            if (result) {
                this.recordHit(key);
                // Promote frequently accessed data to hotter tier
                if (foundTier !== 'hot' && this.shouldPromote(key)) {
                    await this.promoteToHotTier(key, result);
                }
                const data = this.deserialize(result);
                this.logger.debug(`Cache hit for key: ${key} in ${foundTier} tier (${Date.now() - startTime}ms)`);
                return data;
            }
            this.recordMiss(key);
            this.logger.debug(`Cache miss for key: ${key} (${Date.now() - startTime}ms)`);
            return null;
        }
        catch (error) {
            this.logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    /**
     * Set data in cache with automatic tier assignment
     */
    async set(key, value, options) {
        try {
            const tier = options?.tier || this.determineTier(key, value);
            const ttl = options?.ttl || this.config.tiers[tier].ttl;
            const serialized = this.serialize(value);
            const client = this.getCacheClient(tier);
            if (ttl > 0) {
                await client.setex(key, ttl, serialized);
            }
            else {
                await client.set(key, serialized);
            }
            // Set tags for cache invalidation
            if (options?.tags) {
                await this.tagKeys(key, options.tags);
            }
            this.logger.debug(`Cache set for key: ${key} in ${tier} tier (TTL: ${ttl}s)`);
            return true;
        }
        catch (error) {
            this.logger.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * Delete from all cache tiers
     */
    async del(key) {
        try {
            const results = await Promise.all([
                this.hotCache.del(key),
                this.warmCache.del(key),
                this.coldCache.del(key)
            ]);
            const totalDeleted = results.reduce((sum, deleted) => sum + deleted, 0);
            this.logger.debug(`Deleted ${totalDeleted} keys matching: ${key}`);
            return totalDeleted;
        }
        catch (error) {
            this.logger.error(`Cache delete error for key ${key}:`, error);
            return 0;
        }
    }
    /**
     * Invalidate cache by tags
     */
    async invalidateByTags(tags) {
        try {
            const keys = new Set();
            for (const tag of tags) {
                const tagKeys = await this.redis.smembers(`tag:${tag}`);
                tagKeys.forEach(key => keys.add(key));
            }
            if (keys.size > 0) {
                const keyArray = Array.from(keys);
                await Promise.all([
                    this.hotCache.del(...keyArray),
                    this.warmCache.del(...keyArray),
                    this.coldCache.del(...keyArray)
                ]);
                // Clean up tag sets
                const pipeline = this.redis.pipeline();
                tags.forEach(tag => pipeline.del(`tag:${tag}`));
                await pipeline.exec();
                this.logger.info(`Invalidated ${keys.size} cache keys by tags: ${tags.join(', ')}`);
            }
        }
        catch (error) {
            this.logger.error('Cache invalidation by tags error:', error);
        }
    }
    /**
     * Get or set pattern - fetch data if not in cache
     */
    async getOrSet(key, fetcher, options) {
        let data = await this.get(key, options?.tier);
        if (data === null) {
            data = await fetcher();
            await this.set(key, data, options);
        }
        return data;
    }
    /**
     * Batch operations for performance
     */
    async mget(keys, tier) {
        try {
            let client = this.hotCache;
            if (tier) {
                client = this.getCacheClient(tier);
            }
            const results = await client.mget(...keys);
            return results.map((result, index) => {
                if (result) {
                    this.recordHit(keys[index]);
                    return this.deserialize(result);
                }
                else {
                    this.recordMiss(keys[index]);
                    return null;
                }
            });
        }
        catch (error) {
            this.logger.error('Batch cache get error:', error);
            return keys.map(() => null);
        }
    }
    async mset(entries) {
        try {
            const pipeline = this.hotCache.pipeline();
            entries.forEach(({ key, value, options = {} }) => {
                const tier = options.tier || this.determineTier(key, value);
                const ttl = options.ttl || this.config.tiers[tier].ttl;
                const serialized = this.serialize(value);
                if (ttl > 0) {
                    pipeline.setex(key, ttl, serialized);
                }
                else {
                    pipeline.set(key, serialized);
                }
            });
            await pipeline.exec();
            return true;
        }
        catch (error) {
            this.logger.error('Batch cache set error:', error);
            return false;
        }
    }
    /**
     * Cache warming for predictable data access patterns
     */
    async warmCache(patterns) {
        // Sort by priority
        patterns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        const promises = patterns.map(async ({ key, fetcher, tier, priority }) => {
            try {
                const exists = await this.get(key);
                if (!exists) {
                    const data = await fetcher();
                    await this.set(key, data, { tier });
                    this.logger.debug(`Warmed cache for key: ${key} (priority: ${priority || 0})`);
                }
            }
            catch (error) {
                this.logger.error(`Cache warming failed for key ${key}:`, error);
            }
        });
        await Promise.all(promises);
        this.logger.info(`Cache warming completed for ${patterns.length} patterns`);
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        const [hotInfo, warmInfo, coldInfo] = await Promise.all([
            this.hotCache.memory('usage'),
            this.warmCache.memory('usage'),
            this.coldCache.memory('usage')
        ]);
        const hitRates = {};
        for (const [key, stats] of this.hitStats) {
            const total = stats.hits + stats.misses;
            hitRates[key] = {
                hitRate: total > 0 ? stats.hits / total : 0,
                totalRequests: total
            };
        }
        return {
            memory: {
                hot: hotInfo,
                warm: warmInfo,
                cold: coldInfo
            },
            performance: {
                totalKeys: this.hitStats.size,
                avgHitRate: Object.values(hitRates).reduce((sum, rate) => sum + rate.hitRate, 0) / Object.keys(hitRates).length
            },
            hitRates
        };
    }
    // Private helper methods
    getCacheClient(tier) {
        switch (tier) {
            case 'hot': return this.hotCache;
            case 'warm': return this.warmCache;
            case 'cold': return this.coldCache;
            default: return this.hotCache;
        }
    }
    determineTier(key, value) {
        // Smart tier assignment based on key patterns and data characteristics
        if (key.includes('opportunity:') || key.includes('active:') || key.includes('search:')) {
            return 'hot';
        }
        if (key.includes('analytics:') || key.includes('prediction:') || key.includes('aggregate:')) {
            return 'warm';
        }
        return 'cold';
    }
    shouldPromote(key) {
        const stats = this.hitStats.get(key);
        if (!stats)
            return false;
        const total = stats.hits + stats.misses;
        const hitRate = stats.hits / total;
        return total > 10 && hitRate > 0.8; // Promote if >80% hit rate with >10 requests
    }
    async promoteToHotTier(key, value) {
        await this.hotCache.setex(key, this.config.tiers.hot.ttl, value);
        this.logger.debug(`Promoted key to hot tier: ${key}`);
    }
    async tagKeys(key, tags) {
        const pipeline = this.redis.pipeline();
        tags.forEach(tag => {
            pipeline.sadd(`tag:${tag}`, key);
            pipeline.expire(`tag:${tag}`, 86400); // Tags expire in 24 hours
        });
        await pipeline.exec();
    }
    serialize(data) {
        if (this.config.serialization === 'json') {
            return JSON.stringify(data);
        }
        // Other serialization methods can be added here
        return JSON.stringify(data);
    }
    deserialize(data) {
        if (this.config.serialization === 'json') {
            return JSON.parse(data);
        }
        // Other deserialization methods can be added here
        return JSON.parse(data);
    }
    recordHit(key) {
        if (!this.hitStats.has(key)) {
            this.hitStats.set(key, { hits: 0, misses: 0 });
        }
        this.hitStats.get(key).hits++;
    }
    recordMiss(key) {
        if (!this.hitStats.has(key)) {
            this.hitStats.set(key, { hits: 0, misses: 0 });
        }
        this.hitStats.get(key).misses++;
    }
    /**
     * Cleanup and close connections
     */
    async cleanup() {
        await Promise.all([
            this.redis.disconnect(),
            this.hotCache.disconnect(),
            this.warmCache.disconnect(),
            this.coldCache.disconnect()
        ]);
    }
}
exports.CacheManager = CacheManager;
// Default cache configuration
exports.DEFAULT_CACHE_CONFIG = {
    tiers: {
        hot: {
            enabled: true,
            ttl: 300, // 5 minutes
            maxSize: '1gb',
            evictionPolicy: 'allkeys-lru',
            keyPrefix: 'hot:'
        },
        warm: {
            enabled: true,
            ttl: 3600, // 1 hour
            maxSize: '2gb',
            evictionPolicy: 'allkeys-lru',
            keyPrefix: 'warm:'
        },
        cold: {
            enabled: true,
            ttl: 86400, // 24 hours
            maxSize: '4gb',
            evictionPolicy: 'allkeys-lfu',
            keyPrefix: 'cold:'
        }
    },
    defaultTTL: 3600,
    compression: false,
    serialization: 'json'
};
//# sourceMappingURL=cache-config.js.map