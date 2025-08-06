/**
 * Configuration interface for external data sources
 */
export interface SourceConfig {
  id: string;
  name: string;
  type: SourceType;
  baseUrl: string;
  enabled: boolean;
  
  // Authentication
  apiKey?: string;
  authType?: 'bearer' | 'api_key' | 'oauth2' | 'basic';
  authConfig?: Record<string, any>;
  
  // Rate limiting
  rateLimitPerHour: number;
  rateLimitBurst?: number;
  
  // Polling configuration
  pollIntervalMinutes: number;
  lastPollAt?: string;
  nextPollAt?: string;
  
  // Retry configuration
  maxRetries: number;
  retryDelayMs?: number;
  
  // Source-specific configuration
  config: SourceSpecificConfig;
  
  // Status tracking
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  errorCount: number;
  lastError?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export type SourceType = 
  | 'sam_gov'           // SAM.gov opportunities
  | 'fpds'              // Federal Procurement Data System
  | 'ted_eu'            // EU Tenders Electronic Daily
  | 'uk_contracts'      // UK Government contracts
  | 'un_procurement'    // UN procurement
  | 'grants_gov'        // Grants.gov
  | 'fbo_archive'       // FedBizOpps archive
  | 'custom_api'        // Custom API source
  | 'rss_feed'          // RSS/Atom feed
  | 'csv_download'      // CSV file download
  | 'xml_feed';         // XML feed

export interface SourceSpecificConfig {
  // API configuration
  apiVersion?: string;
  format?: 'json' | 'xml' | 'csv' | 'atom';
  defaultParams?: Record<string, any>;
  customHeaders?: Record<string, string>;
  
  // Pagination
  paginationMethod?: 'offset' | 'cursor' | 'page' | 'none';
  pageSize?: number;
  maxPages?: number;
  
  // Data filtering
  dateField?: string;
  incrementalSync?: boolean;
  syncLookbackDays?: number;
  
  // Field mappings for normalization
  fieldMappings?: Record<string, string>;
  
  // Document handling
  downloadDocuments?: boolean;
  documentUrlField?: string;
  documentTypes?: string[];
  maxDocumentSize?: number; // in MB
  
  // Quality checks
  requiredFields?: string[];
  validationRules?: ValidationRule[];
  
  // Source-specific settings
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
  
  // Availability metrics
  uptime: number; // percentage
  lastSuccessfulPoll: string;
  consecutiveFailures: number;
  
  // Performance metrics
  averageResponseTime: number; // milliseconds
  rateLimitUtilization: number; // percentage
  
  // Data quality metrics
  recordsProcessed: number;
  recordsRejected: number;
  qualityScore: number; // 0-100
  
  // Volume metrics
  dailyVolume: number;
  weeklyVolume: number;
  monthlyVolume: number;
  
  // Cost metrics (for paid APIs)
  costPerRecord?: number;
  monthlyAPIUsage?: number;
  
  // Time periods
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
export class SourceRegistry {
  private sources: Map<string, SourceConfig> = new Map();
  private metrics: Map<string, SourceMetrics> = new Map();

  addSource(config: SourceConfig): void {
    this.sources.set(config.id, config);
  }

  getSource(id: string): SourceConfig | undefined {
    return this.sources.get(id);
  }

  getAllSources(): SourceConfig[] {
    return Array.from(this.sources.values());
  }

  getEnabledSources(): SourceConfig[] {
    return this.getAllSources().filter(source => source.enabled);
  }

  getSourcesByType(type: SourceType): SourceConfig[] {
    return this.getAllSources().filter(source => source.type === type);
  }

  updateSource(id: string, updates: Partial<SourceConfig>): boolean {
    const source = this.sources.get(id);
    if (!source) return false;

    this.sources.set(id, {
      ...source,
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return true;
  }

  removeSource(id: string): boolean {
    return this.sources.delete(id);
  }

  updateMetrics(sourceId: string, metrics: Partial<SourceMetrics>): void {
    const existing = this.metrics.get(sourceId) || {} as SourceMetrics;
    this.metrics.set(sourceId, { ...existing, ...metrics });
  }

  getMetrics(sourceId: string): SourceMetrics | undefined {
    return this.metrics.get(sourceId);
  }

  getAllMetrics(): SourceMetrics[] {
    return Array.from(this.metrics.values());
  }
}

/**
 * Default configurations for common sources
 */
export const DEFAULT_SOURCE_CONFIGS: Partial<Record<SourceType, Partial<SourceConfig>>> = {
  sam_gov: {
    type: 'sam_gov',
    baseUrl: 'https://api.sam.gov/opportunities/v2/search',
    rateLimitPerHour: 1500,
    rateLimitBurst: 10,
    pollIntervalMinutes: 15,
    maxRetries: 3,
    config: {
      apiVersion: '2.0',
      format: 'json',
      paginationMethod: 'offset',
      pageSize: 100,
      incrementalSync: true,
      downloadDocuments: true,
      requiredFields: ['title', 'solicitation_number', 'posted_date'],
      samGov: {
        noticeType: ['o', 'k'], // Solicitations and Combined Synopsis/Solicitations
        setAside: [], // All set-asides
      }
    }
  },
  
  fpds: {
    type: 'fpds',
    baseUrl: 'https://api.usaspending.gov/api/v2/search/spending_by_award/',
    rateLimitPerHour: 1000,
    rateLimitBurst: 5,
    pollIntervalMinutes: 60,
    maxRetries: 3,
    config: {
      format: 'json',
      paginationMethod: 'offset',
      pageSize: 100,
      incrementalSync: true,
      dateField: 'period_of_performance_start_date',
      requiredFields: ['recipient_name', 'award_amount', 'award_date']
    }
  },
  
  ted_eu: {
    type: 'ted_eu',
    baseUrl: 'https://ted.europa.eu/api/v2.0/notices/search',
    rateLimitPerHour: 500,
    rateLimitBurst: 5,
    pollIntervalMinutes: 30,
    maxRetries: 3,
    config: {
      format: 'json',
      paginationMethod: 'page',
      pageSize: 50,
      incrementalSync: true,
      downloadDocuments: false
    }
  }
};