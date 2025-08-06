import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { SourceConfig } from '../types/source-config';
/**
 * Core data ingestion service that handles polling multiple government APIs
 * with rate limiting, error handling, and retry logic.
 */
export declare class DataIngestionService extends EventEmitter {
    private logger;
    private sourceConfigs;
    private maxConcurrentPolls;
    private rateLimiters;
    private parsers;
    private activePolls;
    constructor(logger: Logger, sourceConfigs: SourceConfig[], maxConcurrentPolls?: number);
    /**
     * Start polling all configured sources
     */
    start(): Promise<void>;
    /**
     * Stop all polling activities
     */
    stop(): Promise<void>;
    /**
     * Schedule polling for a specific source
     */
    private schedulePolling;
    /**
     * Poll a specific data source
     */
    private pollSource;
    /**
     * Fetch data with exponential backoff retry logic
     */
    private fetchWithRetry;
    /**
     * Actual data fetching implementation
     */
    private fetchData;
    /**
     * Build URL with pagination and filters
     */
    private buildUrl;
    /**
     * Initialize rate limiters for each source
     */
    private initializeRateLimiters;
    /**
     * Initialize parsers for different data formats
     */
    private initializeParsers;
    /**
     * Get current status of all sources
     */
    getSourceStatus(): Array<{
        id: string;
        name: string;
        enabled: boolean;
        lastPoll: string | null;
        nextPoll: string | null;
        rateLimitStatus: {
            remaining: number;
            resetTime: string;
        };
    }>;
    /**
     * Update source configuration
     */
    updateSourceConfig(sourceId: string, updates: Partial<SourceConfig>): Promise<void>;
}
//# sourceMappingURL=ingestion-service.d.ts.map