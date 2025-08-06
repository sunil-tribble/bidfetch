import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { DatabaseService } from '../database/database-service';
import { DocumentService } from '../document/document-service';
import { AnalyticsService } from '../analytics/analytics-service';
/**
 * Central processing service that handles data transformation, enrichment,
 * cross-referencing, and quality validation of ingested government data.
 */
export declare class ProcessingService extends EventEmitter {
    private logger;
    private databaseService;
    private documentService;
    private analyticsService;
    private processingQueue;
    private enrichmentQueue;
    private analyticsQueue;
    private processors;
    constructor(logger: Logger, databaseService: DatabaseService, documentService: DocumentService, analyticsService: AnalyticsService);
    /**
     * Initialize job queues for different processing stages
     */
    private initializeQueues;
    /**
     * Initialize data processors for different entity types
     */
    private initializeProcessors;
    /**
     * Setup queue processors with concurrency controls
     */
    private setupQueueProcessors;
    /**
     * Process raw data from ingestion service
     */
    processRawData(rawData: any): Promise<void>;
    /**
     * Process opportunities data
     */
    private processOpportunities;
    /**
     * Process contracts data
     */
    private processContracts;
    /**
     * Process associated documents
     */
    private processDocuments;
    /**
     * Enrich processed data with additional intelligence
     */
    private enrichData;
    /**
     * Cross-reference data between sources for intelligence
     */
    private crossReferenceData;
    /**
     * Generate predictive analytics
     */
    private generatePredictions;
    /**
     * Update analytics and metrics
     */
    private updateAnalytics;
    /**
     * Add processing job to queue with appropriate priority
     */
    private addProcessingJob;
    /**
     * Determine job priority based on data characteristics
     */
    private getJobPriority;
    /**
     * Determine data type from raw data structure
     */
    private determineDataType;
    /**
     * Split large datasets into manageable chunks
     */
    private chunkData;
    /**
     * Setup event handlers for monitoring and alerting
     */
    private setupEventHandlers;
    /**
     * Get processing statistics
     */
    getProcessingStats(): Promise<{
        queues: Record<string, any>;
        processors: Record<string, any>;
    }>;
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=processing-service.d.ts.map