"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIngestionService = void 0;
const events_1 = require("events");
const rate_limiter_1 = require("./rate-limiter");
/**
 * Core data ingestion service that handles polling multiple government APIs
 * with rate limiting, error handling, and retry logic.
 */
class DataIngestionService extends events_1.EventEmitter {
    logger;
    sourceConfigs;
    maxConcurrentPolls;
    rateLimiters = new Map();
    parsers = new Map();
    activePolls = new Map();
    constructor(logger, sourceConfigs, maxConcurrentPolls = 5) {
        super();
        this.logger = logger;
        this.sourceConfigs = sourceConfigs;
        this.maxConcurrentPolls = maxConcurrentPolls;
        this.initializeRateLimiters();
        this.initializeParsers();
    }
    /**
     * Start polling all configured sources
     */
    async start() {
        this.logger.info('Starting data ingestion service');
        for (const config of this.sourceConfigs) {
            if (config.enabled) {
                await this.schedulePolling(config);
            }
        }
    }
    /**
     * Stop all polling activities
     */
    async stop() {
        this.logger.info('Stopping data ingestion service');
        this.activePolls.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.activePolls.clear();
    }
    /**
     * Schedule polling for a specific source
     */
    async schedulePolling(config) {
        const pollSource = async () => {
            try {
                await this.pollSource(config);
            }
            catch (error) {
                this.logger.error(`Error polling source ${config.name}:`, error);
                this.emit('poll_error', config, error);
            }
            finally {
                // Schedule next poll
                const timeout = setTimeout(pollSource, config.pollIntervalMinutes * 60 * 1000);
                this.activePolls.set(config.id, timeout);
            }
        };
        // Start initial poll
        await pollSource();
    }
    /**
     * Poll a specific data source
     */
    async pollSource(config) {
        const startTime = Date.now();
        this.logger.info(`Polling source: ${config.name}`);
        try {
            // Check rate limiting
            const rateLimiter = this.rateLimiters.get(config.id);
            if (!rateLimiter || !await rateLimiter.checkLimit()) {
                this.logger.warn(`Rate limit exceeded for source: ${config.name}`);
                return;
            }
            // Get data with retry logic
            const rawData = await this.fetchWithRetry(config);
            // Parse the data
            const parser = this.parsers.get(config.type);
            if (!parser) {
                throw new Error(`No parser available for source type: ${config.type}`);
            }
            const parsedData = await parser.parse(rawData, config);
            // Emit parsed data for processing
            this.emit('data_received', {
                sourceId: config.id,
                sourceName: config.name,
                data: parsedData,
                recordCount: parsedData.length,
                processingTime: Date.now() - startTime
            });
            this.logger.info(`Successfully polled ${config.name}: ${parsedData.length} records`);
        }
        catch (error) {
            this.logger.error(`Failed to poll source ${config.name}:`, error);
            throw error;
        }
    }
    /**
     * Fetch data with exponential backoff retry logic
     */
    async fetchWithRetry(config, retryCount = 0) {
        try {
            const response = await this.fetchData(config);
            return response;
        }
        catch (error) {
            if (retryCount < config.maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30s
                const jitter = Math.random() * 1000; // Add jitter
                this.logger.warn(`Retry ${retryCount + 1}/${config.maxRetries} for ${config.name} in ${delay + jitter}ms`);
                await new Promise(resolve => setTimeout(resolve, delay + jitter));
                return this.fetchWithRetry(config, retryCount + 1);
            }
            throw error;
        }
    }
    /**
     * Actual data fetching implementation
     */
    async fetchData(config) {
        const headers = {
            'User-Agent': 'BidFetcher/1.0'
        };
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        // Add source-specific headers
        if (config.config.customHeaders) {
            Object.assign(headers, config.config.customHeaders);
        }
        const url = this.buildUrl(config);
        const response = await fetch(url, {
            method: 'GET',
            headers,
            timeout: 30000 // 30 second timeout
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const contentType = response.headers.get('content-type') || '';
        let data;
        if (contentType.includes('application/json')) {
            data = await response.json();
        }
        else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
            data = await response.text();
        }
        else if (contentType.includes('text/csv')) {
            data = await response.text();
        }
        else {
            data = await response.text();
        }
        return {
            sourceId: config.id,
            contentType,
            data,
            lastModified: response.headers.get('last-modified'),
            etag: response.headers.get('etag'),
            fetchedAt: new Date().toISOString()
        };
    }
    /**
     * Build URL with pagination and filters
     */
    buildUrl(config) {
        const url = new URL(config.baseUrl);
        // Add common query parameters
        if (config.config.apiVersion) {
            url.searchParams.append('api_version', config.config.apiVersion);
        }
        // Add source-specific parameters
        if (config.config.defaultParams) {
            Object.entries(config.config.defaultParams).forEach(([key, value]) => {
                url.searchParams.append(key, String(value));
            });
        }
        // Add timestamp-based filtering for incremental updates
        if (config.lastPollAt) {
            const lastPoll = new Date(config.lastPollAt);
            url.searchParams.append('modified_since', lastPoll.toISOString());
        }
        return url.toString();
    }
    /**
     * Initialize rate limiters for each source
     */
    initializeRateLimiters() {
        this.sourceConfigs.forEach(config => {
            const rateLimiter = new rate_limiter_1.RateLimiter(config.rateLimitPerHour, config.rateLimitBurst || 10, config.id);
            this.rateLimiters.set(config.id, rateLimiter);
        });
    }
    /**
     * Initialize parsers for different data formats
     */
    initializeParsers() {
        // This would be populated with actual parser implementations
        // For now, showing the interface structure
        this.logger.info('Initializing data parsers');
    }
    /**
     * Get current status of all sources
     */
    getSourceStatus() {
        return this.sourceConfigs.map(config => {
            const rateLimiter = this.rateLimiters.get(config.id);
            return {
                id: config.id,
                name: config.name,
                enabled: config.enabled,
                lastPoll: config.lastPollAt,
                nextPoll: config.nextPollAt,
                rateLimitStatus: {
                    remaining: rateLimiter?.getRemainingRequests() || 0,
                    resetTime: rateLimiter?.getResetTime() || new Date().toISOString()
                }
            };
        });
    }
    /**
     * Update source configuration
     */
    async updateSourceConfig(sourceId, updates) {
        const configIndex = this.sourceConfigs.findIndex(c => c.id === sourceId);
        if (configIndex === -1) {
            throw new Error(`Source not found: ${sourceId}`);
        }
        // Update configuration
        this.sourceConfigs[configIndex] = {
            ...this.sourceConfigs[configIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        // Update rate limiter if needed
        if (updates.rateLimitPerHour || updates.rateLimitBurst) {
            const config = this.sourceConfigs[configIndex];
            const rateLimiter = new rate_limiter_1.RateLimiter(config.rateLimitPerHour, config.rateLimitBurst || 10, config.id);
            this.rateLimiters.set(config.id, rateLimiter);
        }
        // Reschedule polling if interval changed
        if (updates.pollIntervalMinutes) {
            const timeout = this.activePolls.get(sourceId);
            if (timeout) {
                clearTimeout(timeout);
                await this.schedulePolling(this.sourceConfigs[configIndex]);
            }
        }
        this.logger.info(`Updated configuration for source: ${sourceId}`);
    }
}
exports.DataIngestionService = DataIngestionService;
//# sourceMappingURL=ingestion-service.js.map