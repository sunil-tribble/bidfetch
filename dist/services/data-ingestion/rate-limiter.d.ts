export interface RateLimitConfig {
    source: string;
    limit: number;
    window: number;
}
export declare class RateLimiter {
    private redis;
    constructor();
    checkLimit(config: RateLimitConfig): Promise<boolean>;
    getRemainingQuota(config: RateLimitConfig): Promise<number>;
    getResetTime(config: RateLimitConfig): Promise<number>;
    reset(source: string): Promise<void>;
    close(): Promise<void>;
}
export declare class AdaptiveRateLimiter extends RateLimiter {
    private adaptiveFactors;
    checkLimitWithBackoff(config: RateLimitConfig): Promise<boolean>;
    private adjustFactor;
    waitForQuota(config: RateLimitConfig): Promise<void>;
}
//# sourceMappingURL=rate-limiter.d.ts.map