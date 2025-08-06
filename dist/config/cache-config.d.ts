import { Logger } from 'winston';
/**
 * Multi-tier caching configuration for BidFetcher system
 * Implements hot, warm, and cold data strategies with intelligent cache invalidation
 */
export interface CacheConfig {
    tiers: {
        hot: CacheTierConfig;
        warm: CacheTierConfig;
        cold: CacheTierConfig;
    };
    defaultTTL: number;
    compression: boolean;
    serialization: 'json' | 'msgpack' | 'protobuf';
}
export interface CacheTierConfig {
    enabled: boolean;
    ttl: number;
    maxSize: string;
    evictionPolicy: 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru' | 'volatile-lfu';
    keyPrefix: string;
}
export declare class CacheManager {
    private logger;
    private config;
    private redis;
    private hotCache;
    private warmCache;
    private coldCache;
    private hitStats;
    constructor(logger: Logger, config: CacheConfig);
    private initializeRedisConnections;
    private setupEventHandlers;
    /**
     * Get data from cache with automatic tier promotion
     */
    get<T>(key: string, tier?: 'hot' | 'warm' | 'cold'): Promise<T | null>;
    /**
     * Set data in cache with automatic tier assignment
     */
    set<T>(key: string, value: T, options?: {
        tier?: 'hot' | 'warm' | 'cold';
        ttl?: number;
        tags?: string[];
    }): Promise<boolean>;
    /**
     * Delete from all cache tiers
     */
    del(key: string): Promise<number>;
    /**
     * Invalidate cache by tags
     */
    invalidateByTags(tags: string[]): Promise<void>;
    /**
     * Get or set pattern - fetch data if not in cache
     */
    getOrSet<T>(key: string, fetcher: () => Promise<T>, options?: {
        tier?: 'hot' | 'warm' | 'cold';
        ttl?: number;
        tags?: string[];
    }): Promise<T>;
    /**
     * Batch operations for performance
     */
    mget<T>(keys: string[], tier?: 'hot' | 'warm' | 'cold'): Promise<Array<T | null>>;
    mset(entries: Array<{
        key: string;
        value: any;
        options?: any;
    }>): Promise<boolean>;
    /**
     * Cache warming for predictable data access patterns
     */
    warmCache(patterns: Array<{
        key: string;
        fetcher: () => Promise<any>;
        tier?: 'hot' | 'warm' | 'cold';
        priority?: number;
    }>): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        memory: Record<string, any>;
        performance: Record<string, any>;
        hitRates: Record<string, {
            hitRate: number;
            totalRequests: number;
        }>;
    }>;
    private getCacheClient;
    private determineTier;
    private shouldPromote;
    private promoteToHotTier;
    private tagKeys;
    private serialize;
    private deserialize;
    private recordHit;
    private recordMiss;
    /**
     * Cleanup and close connections
     */
    cleanup(): Promise<void>;
}
export declare const DEFAULT_CACHE_CONFIG: CacheConfig;
//# sourceMappingURL=cache-config.d.ts.map