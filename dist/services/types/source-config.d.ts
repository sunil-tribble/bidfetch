/**
 * Configuration interface for external data sources
 */
export interface SourceConfig {
    id: string;
    name: string;
    type: SourceType;
    baseUrl: string;
    enabled: boolean;
    apiKey?: string;
    authType?: 'bearer' | 'api_key' | 'oauth2' | 'basic';
    authConfig?: Record<string, any>;
    rateLimitPerHour: number;
    rateLimitBurst?: number;
    pollIntervalMinutes: number;
    lastPollAt?: string;
    nextPollAt?: string;
    maxRetries: number;
    retryDelayMs?: number;
    config: SourceSpecificConfig;
    status: 'active' | 'inactive' | 'error' | 'maintenance';
    errorCount: number;
    lastError?: string;
    createdAt: string;
    updatedAt: string;
}
export type SourceType = 'sam_gov' | 'fpds' | 'ted_eu' | 'uk_contracts' | 'un_procurement' | 'grants_gov' | 'fbo_archive' | 'custom_api' | 'rss_feed' | 'csv_download' | 'xml_feed';
export interface SourceSpecificConfig {
    apiVersion?: string;
    format?: 'json' | 'xml' | 'csv' | 'atom';
    defaultParams?: Record<string, any>;
    customHeaders?: Record<string, string>;
    paginationMethod?: 'offset' | 'cursor' | 'page' | 'none';
    pageSize?: number;
    maxPages?: number;
    dateField?: string;
    incrementalSync?: boolean;
    syncLookbackDays?: number;
    fieldMappings?: Record<string, string>;
    downloadDocuments?: boolean;
    documentUrlField?: string;
    documentTypes?: string[];
    maxDocumentSize?: number;
    requiredFields?: string[];
    validationRules?: ValidationRule[];
    samGov?: {
        noticeType?: string[];
        setAside?: string[];
        state?: string[];
        classificationCode?: string[];
    };
    fpds?: {
        contractType?: string[];
        agencyCode?: string[];
        dateRange?: {
            start: string;
            end: string;
        };
    };
    tedEu?: {
        country?: string[];
        cpvCode?: string[];
        procedureType?: string[];
    };
}
export interface ValidationRule {
    field: string;
    type: 'required' | 'format' | 'range' | 'custom';
    value?: any;
    message?: string;
}
/**
 * Raw data structure from external sources
 */
export interface RawData {
    sourceId: string;
    contentType: string;
    data: any;
    lastModified?: string | null;
    etag?: string | null;
    fetchedAt: string;
    metadata?: Record<string, any>;
}
/**
 * Processed data after parsing and validation
 */
export interface ProcessedData {
    sourceId: string;
    recordType: 'opportunity' | 'contract' | 'document' | 'organization';
    records: any[];
    totalCount: number;
    processedAt: string;
    quality: {
        validRecords: number;
        invalidRecords: number;
        warnings: string[];
        errors: string[];
    };
}
/**
 * Source performance metrics
 */
export interface SourceMetrics {
    sourceId: string;
    sourceName: string;
    uptime: number;
    lastSuccessfulPoll: string;
    consecutiveFailures: number;
    averageResponseTime: number;
    rateLimitUtilization: number;
    recordsProcessed: number;
    recordsRejected: number;
    qualityScore: number;
    dailyVolume: number;
    weeklyVolume: number;
    monthlyVolume: number;
    costPerRecord?: number;
    monthlyAPIUsage?: number;
    periodStart: string;
    periodEnd: string;
}
/**
 * Source discovery configuration for finding new sources
 */
export interface SourceDiscoveryConfig {
    enabled: boolean;
    searchTerms: string[];
    excludePatterns: string[];
    autoValidation: boolean;
    notificationWebhook?: string;
}
/**
 * Source health check configuration
 */
export interface HealthCheckConfig {
    enabled: boolean;
    intervalMinutes: number;
    timeout: number;
    expectedStatusCode?: number;
    expectedHeaders?: Record<string, string>;
    expectedBodyPattern?: string;
    alertThresholds: {
        consecutiveFailures: number;
        responseTimeMs: number;
    };
}
/**
 * Data source registry for managing multiple sources
 */
export declare class SourceRegistry {
    private sources;
    private metrics;
    addSource(config: SourceConfig): void;
    getSource(id: string): SourceConfig | undefined;
    getAllSources(): SourceConfig[];
    getEnabledSources(): SourceConfig[];
    getSourcesByType(type: SourceType): SourceConfig[];
    updateSource(id: string, updates: Partial<SourceConfig>): boolean;
    removeSource(id: string): boolean;
    updateMetrics(sourceId: string, metrics: Partial<SourceMetrics>): void;
    getMetrics(sourceId: string): SourceMetrics | undefined;
    getAllMetrics(): SourceMetrics[];
}
/**
 * Default configurations for common sources
 */
export declare const DEFAULT_SOURCE_CONFIGS: Partial<Record<SourceType, Partial<SourceConfig>>>;
//# sourceMappingURL=source-config.d.ts.map