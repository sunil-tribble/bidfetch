"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingService = void 0;
const events_1 = require("events");
const opportunity_processor_1 = require("./processors/opportunity-processor");
const contract_processor_1 = require("./processors/contract-processor");
const data_enricher_1 = require("./enrichment/data-enricher");
/**
 * Central processing service that handles data transformation, enrichment,
 * cross-referencing, and quality validation of ingested government data.
 */
class ProcessingService extends events_1.EventEmitter {
    logger;
    databaseService;
    documentService;
    analyticsService;
    processingQueue;
    enrichmentQueue;
    analyticsQueue;
    processors = new Map();
    constructor(logger, databaseService, documentService, analyticsService) {
        super();
        this.logger = logger;
        this.databaseService = databaseService;
        this.documentService = documentService;
        this.analyticsService = analyticsService;
        this.initializeQueues();
        this.initializeProcessors();
        this.setupEventHandlers();
    }
    /**
     * Initialize job queues for different processing stages
     */
    initializeQueues() {
        const redisConfig = {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD
            }
        };
        this.processingQueue = new bull_1.Queue('data-processing', redisConfig);
        this.enrichmentQueue = new bull_1.Queue('data-enrichment', redisConfig);
        this.analyticsQueue = new bull_1.Queue('analytics-processing', redisConfig);
        this.setupQueueProcessors();
    }
    /**
     * Initialize data processors for different entity types
     */
    initializeProcessors() {
        this.processors.set('opportunity', new opportunity_processor_1.OpportunityProcessor(this.logger));
        this.processors.set('contract', new contract_processor_1.ContractProcessor(this.logger));
        this.processors.set('enricher', new data_enricher_1.DataEnricher(this.logger, this.databaseService));
    }
    /**
     * Setup queue processors with concurrency controls
     */
    setupQueueProcessors() {
        // Main processing queue - handles data validation and normalization
        this.processingQueue.process('process-opportunities', 5, this.processOpportunities.bind(this));
        this.processingQueue.process('process-contracts', 3, this.processContracts.bind(this));
        this.processingQueue.process('process-documents', 2, this.processDocuments.bind(this));
        // Enrichment queue - handles cross-referencing and intelligence gathering
        this.enrichmentQueue.process('enrich-data', 3, this.enrichData.bind(this));
        this.enrichmentQueue.process('cross-reference', 2, this.crossReferenceData.bind(this));
        // Analytics queue - handles predictions and analysis
        this.analyticsQueue.process('generate-predictions', 1, this.generatePredictions.bind(this));
        this.analyticsQueue.process('update-analytics', 2, this.updateAnalytics.bind(this));
    }
    /**
     * Process raw data from ingestion service
     */
    async processRawData(rawData) {
        this.logger.info(`Processing raw data from source: ${rawData.sourceName}`);
        try {
            // Determine data type and route to appropriate processor
            const dataType = this.determineDataType(rawData);
            const jobs = [];
            // Split large datasets into smaller processing jobs
            const chunks = this.chunkData(rawData.data, 100); // Process 100 records at a time
            for (let i = 0; i < chunks.length; i++) {
                const job = {
                    id: `${rawData.sourceId}-${Date.now()}-${i}`,
                    sourceId: rawData.sourceId,
                    sourceName: rawData.sourceName,
                    dataType,
                    data: chunks[i],
                    metadata: {
                        chunkIndex: i,
                        totalChunks: chunks.length,
                        originalSize: rawData.data.length
                    }
                };
                jobs.push(job);
            }
            // Add jobs to processing queue with priority
            for (const job of jobs) {
                await this.addProcessingJob(job);
            }
            this.emit('raw_data_queued', {
                sourceId: rawData.sourceId,
                jobCount: jobs.length,
                recordCount: rawData.data.length
            });
        }
        catch (error) {
            this.logger.error('Error processing raw data:', error);
            this.emit('processing_error', { rawData, error });
        }
    }
    /**
     * Process opportunities data
     */
    async processOpportunities(job) {
        const startTime = Date.now();
        const { data: jobData } = job.data;
        this.logger.info(`Processing ${jobData.data.length} opportunities from ${jobData.sourceName}`);
        try {
            const processor = this.processors.get('opportunity');
            const processedOpportunities = [];
            const errors = [];
            for (const rawOpportunity of jobData.data) {
                try {
                    const processed = await processor.process(rawOpportunity, jobData.sourceId);
                    processedOpportunities.push(processed);
                }
                catch (error) {
                    errors.push({ record: rawOpportunity, error: error.message });
                }
            }
            // Bulk insert processed opportunities
            const insertedCount = await this.databaseService.bulkInsertOpportunities(processedOpportunities);
            // Queue for enrichment
            if (processedOpportunities.length > 0) {
                await this.enrichmentQueue.add('enrich-data', {
                    type: 'opportunities',
                    ids: processedOpportunities.map(o => o.id),
                    sourceId: jobData.sourceId
                });
            }
            const result = {
                success: true,
                processedCount: insertedCount,
                errorCount: errors.length,
                processingTime: Date.now() - startTime,
                errors
            };
            this.emit('opportunities_processed', result);
            return result;
        }
        catch (error) {
            this.logger.error('Error in opportunity processing:', error);
            throw error;
        }
    }
    /**
     * Process contracts data
     */
    async processContracts(job) {
        const startTime = Date.now();
        const { data: jobData } = job.data;
        this.logger.info(`Processing ${jobData.data.length} contracts from ${jobData.sourceName}`);
        try {
            const processor = this.processors.get('contract');
            const processedContracts = [];
            const errors = [];
            for (const rawContract of jobData.data) {
                try {
                    const processed = await processor.process(rawContract, jobData.sourceId);
                    processedContracts.push(processed);
                }
                catch (error) {
                    errors.push({ record: rawContract, error: error.message });
                }
            }
            // Bulk insert processed contracts
            const insertedCount = await this.databaseService.bulkInsertContracts(processedContracts);
            // Queue for enrichment and analytics
            if (processedContracts.length > 0) {
                await this.enrichmentQueue.add('enrich-data', {
                    type: 'contracts',
                    ids: processedContracts.map(c => c.id),
                    sourceId: jobData.sourceId
                });
                await this.analyticsQueue.add('update-analytics', {
                    type: 'contracts',
                    ids: processedContracts.map(c => c.id)
                });
            }
            const result = {
                success: true,
                processedCount: insertedCount,
                errorCount: errors.length,
                processingTime: Date.now() - startTime,
                errors
            };
            this.emit('contracts_processed', result);
            return result;
        }
        catch (error) {
            this.logger.error('Error in contract processing:', error);
            throw error;
        }
    }
    /**
     * Process associated documents
     */
    async processDocuments(job) {
        const startTime = Date.now();
        const { data: jobData } = job.data;
        this.logger.info(`Processing ${jobData.data.length} documents`);
        try {
            const results = await this.documentService.processDocuments(jobData.data);
            const result = {
                success: true,
                processedCount: results.processedCount,
                errorCount: results.errorCount,
                processingTime: Date.now() - startTime,
                errors: results.errors
            };
            this.emit('documents_processed', result);
            return result;
        }
        catch (error) {
            this.logger.error('Error in document processing:', error);
            throw error;
        }
    }
    /**
     * Enrich processed data with additional intelligence
     */
    async enrichData(job) {
        const { type, ids, sourceId } = job.data;
        this.logger.info(`Enriching ${ids.length} ${type} records`);
        try {
            const enricher = this.processors.get('enricher');
            const results = await enricher.enrichBatch(type, ids);
            // Queue cross-referencing
            await this.enrichmentQueue.add('cross-reference', {
                type,
                ids,
                sourceId
            });
            this.emit('data_enriched', { type, count: ids.length, results });
            return results;
        }
        catch (error) {
            this.logger.error('Error in data enrichment:', error);
            throw error;
        }
    }
    /**
     * Cross-reference data between sources for intelligence
     */
    async crossReferenceData(job) {
        const { type, ids, sourceId } = job.data;
        this.logger.info(`Cross-referencing ${ids.length} ${type} records`);
        try {
            const enricher = this.processors.get('enricher');
            const results = await enricher.crossReference(type, ids);
            // Queue for predictive analytics if opportunities
            if (type === 'opportunities') {
                await this.analyticsQueue.add('generate-predictions', {
                    opportunityIds: ids
                });
            }
            this.emit('data_cross_referenced', { type, count: ids.length, results });
            return results;
        }
        catch (error) {
            this.logger.error('Error in cross-referencing:', error);
            throw error;
        }
    }
    /**
     * Generate predictive analytics
     */
    async generatePredictions(job) {
        const { opportunityIds } = job.data;
        this.logger.info(`Generating predictions for ${opportunityIds.length} opportunities`);
        try {
            const results = await this.analyticsService.generatePredictions(opportunityIds);
            this.emit('predictions_generated', { count: opportunityIds.length, results });
            return results;
        }
        catch (error) {
            this.logger.error('Error generating predictions:', error);
            throw error;
        }
    }
    /**
     * Update analytics and metrics
     */
    async updateAnalytics(job) {
        const { type, ids } = job.data;
        try {
            await this.analyticsService.updateMetrics(type, ids);
            this.emit('analytics_updated', { type, count: ids.length });
        }
        catch (error) {
            this.logger.error('Error updating analytics:', error);
            throw error;
        }
    }
    /**
     * Add processing job to queue with appropriate priority
     */
    async addProcessingJob(job) {
        const queueName = `process-${job.dataType}`;
        const priority = this.getJobPriority(job);
        await this.processingQueue.add(queueName, job, {
            priority,
            attempts: 3,
            backoff: 'exponential',
            delay: job.metadata?.delay || 0
        });
    }
    /**
     * Determine job priority based on data characteristics
     */
    getJobPriority(job) {
        // Higher priority for newer data and critical sources
        let priority = 0;
        if (job.sourceName.includes('SAM.gov'))
            priority += 10;
        if (job.dataType === 'opportunities')
            priority += 5;
        if (job.metadata?.urgent)
            priority += 20;
        return priority;
    }
    /**
     * Determine data type from raw data structure
     */
    determineDataType(rawData) {
        // Simple heuristic - in production, this would be more sophisticated
        if (rawData.sourceName.includes('SAM.gov') && rawData.data[0]?.solicitation) {
            return 'opportunities';
        }
        else if (rawData.sourceName.includes('FPDS') && rawData.data[0]?.contract) {
            return 'contracts';
        }
        else if (rawData.data[0]?.document || rawData.data[0]?.file) {
            return 'documents';
        }
        return 'unknown';
    }
    /**
     * Split large datasets into manageable chunks
     */
    chunkData(data, chunkSize) {
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks;
    }
    /**
     * Setup event handlers for monitoring and alerting
     */
    setupEventHandlers() {
        this.processingQueue.on('completed', (job, result) => {
            this.logger.info(`Job ${job.id} completed:`, result);
        });
        this.processingQueue.on('failed', (job, error) => {
            this.logger.error(`Job ${job.id} failed:`, error);
            this.emit('job_failed', { job, error });
        });
        this.processingQueue.on('stalled', (job) => {
            this.logger.warn(`Job ${job.id} stalled`);
            this.emit('job_stalled', { job });
        });
    }
    /**
     * Get processing statistics
     */
    async getProcessingStats() {
        const queueStats = {
            processing: {
                waiting: await this.processingQueue.getWaiting().then(jobs => jobs.length),
                active: await this.processingQueue.getActive().then(jobs => jobs.length),
                completed: await this.processingQueue.getCompleted().then(jobs => jobs.length),
                failed: await this.processingQueue.getFailed().then(jobs => jobs.length)
            },
            enrichment: {
                waiting: await this.enrichmentQueue.getWaiting().then(jobs => jobs.length),
                active: await this.enrichmentQueue.getActive().then(jobs => jobs.length),
                completed: await this.enrichmentQueue.getCompleted().then(jobs => jobs.length),
                failed: await this.enrichmentQueue.getFailed().then(jobs => jobs.length)
            },
            analytics: {
                waiting: await this.analyticsQueue.getWaiting().then(jobs => jobs.length),
                active: await this.analyticsQueue.getActive().then(jobs => jobs.length),
                completed: await this.analyticsQueue.getCompleted().then(jobs => jobs.length),
                failed: await this.analyticsQueue.getFailed().then(jobs => jobs.length)
            }
        };
        return {
            queues: queueStats,
            processors: Object.fromEntries(Array.from(this.processors.keys()).map(key => [key, 'active']))
        };
    }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        this.logger.info('Shutting down processing service');
        await Promise.all([
            this.processingQueue.close(),
            this.enrichmentQueue.close(),
            this.analyticsQueue.close()
        ]);
        this.removeAllListeners();
    }
}
exports.ProcessingService = ProcessingService;
//# sourceMappingURL=processing-service.js.map