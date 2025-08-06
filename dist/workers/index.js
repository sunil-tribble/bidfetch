"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleJobs = scheduleJobs;
const bull_1 = __importDefault(require("bull"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const sam_gov_1 = require("../services/sources/sam-gov");
const grants_gov_1 = require("../services/sources/grants-gov");
const fpds_1 = require("../services/sources/fpds");
const ted_eu_1 = require("../services/sources/ted-eu");
const uk_contracts_1 = require("../services/sources/uk-contracts");
const ungm_1 = require("../services/sources/ungm");
const competitive_intelligence_1 = require("../services/analytics/competitive-intelligence");
const ml_predictions_1 = require("../services/analytics/ml-predictions");
// Create job queues
const ingestionQueue = new bull_1.default('data-ingestion', config_1.config.database.redis.url);
const analysisQueue = new bull_1.default('analysis', config_1.config.database.redis.url);
const exportQueue = new bull_1.default('export', config_1.config.database.redis.url);
const alertQueue = new bull_1.default('alerts', config_1.config.database.redis.url);
// Data source clients
const clients = {
    samGov: new sam_gov_1.SamGovClient(),
    grantsGov: new grants_gov_1.GrantsGovClient(),
    fpds: new fpds_1.FPDSClient(),
    tedEu: new ted_eu_1.TEDEuropaClient(),
    ukContracts: new uk_contracts_1.UKContractsClient(),
    ungm: new ungm_1.UNGMClient(),
};
const intelligence = new competitive_intelligence_1.CompetitiveIntelligenceEngine();
const mlService = new ml_predictions_1.MLPredictionService();
// Process data ingestion jobs
ingestionQueue.process('sync-sam-gov', async (job) => {
    logger_1.logger.info('Processing SAM.gov sync job', job.data);
    try {
        await clients.samGov.syncOpportunities();
        return { success: true, timestamp: new Date() };
    }
    catch (error) {
        logger_1.logger.error('SAM.gov sync failed', error);
        throw error;
    }
});
ingestionQueue.process('sync-grants-gov', async (job) => {
    logger_1.logger.info('Processing Grants.gov sync job', job.data);
    try {
        await clients.grantsGov.syncGrants();
        return { success: true, timestamp: new Date() };
    }
    catch (error) {
        logger_1.logger.error('Grants.gov sync failed', error);
        throw error;
    }
});
ingestionQueue.process('sync-fpds', async (job) => {
    logger_1.logger.info('Processing FPDS sync job', job.data);
    try {
        await clients.fpds.syncContracts(job.data);
        return { success: true, timestamp: new Date() };
    }
    catch (error) {
        logger_1.logger.error('FPDS sync failed', error);
        throw error;
    }
});
ingestionQueue.process('sync-ted-eu', async (job) => {
    logger_1.logger.info('Processing TED EU sync job', job.data);
    try {
        await clients.tedEu.syncNotices(job.data);
        return { success: true, timestamp: new Date() };
    }
    catch (error) {
        logger_1.logger.error('TED EU sync failed', error);
        throw error;
    }
});
ingestionQueue.process('sync-uk-contracts', async (job) => {
    logger_1.logger.info('Processing UK Contracts sync job', job.data);
    try {
        await clients.ukContracts.syncContracts(job.data);
        return { success: true, timestamp: new Date() };
    }
    catch (error) {
        logger_1.logger.error('UK Contracts sync failed', error);
        throw error;
    }
});
ingestionQueue.process('sync-ungm', async (job) => {
    logger_1.logger.info('Processing UNGM sync job', job.data);
    try {
        await clients.ungm.syncNotices(job.data);
        return { success: true, timestamp: new Date() };
    }
    catch (error) {
        logger_1.logger.error('UNGM sync failed', error);
        throw error;
    }
});
// Process analysis jobs
analysisQueue.process('competitive-intelligence', async (job) => {
    const { opportunityId } = job.data;
    logger_1.logger.info(`Processing competitive intelligence for opportunity ${opportunityId}`);
    try {
        const analysis = await intelligence.analyzeOpportunity(opportunityId);
        return analysis;
    }
    catch (error) {
        logger_1.logger.error('Competitive intelligence analysis failed', error);
        throw error;
    }
});
analysisQueue.process('ml-prediction', async (job) => {
    const { opportunityId } = job.data;
    logger_1.logger.info(`Processing ML predictions for opportunity ${opportunityId}`);
    try {
        const predictions = await mlService.predictOpportunity(opportunityId);
        return predictions;
    }
    catch (error) {
        logger_1.logger.error('ML prediction failed', error);
        throw error;
    }
});
analysisQueue.process('recompete-prediction', async (job) => {
    const { monthsAhead = 12 } = job.data;
    logger_1.logger.info(`Processing recompete predictions for ${monthsAhead} months`);
    try {
        const predictions = await intelligence.predictRecompete(monthsAhead);
        return predictions;
    }
    catch (error) {
        logger_1.logger.error('Recompete prediction failed', error);
        throw error;
    }
});
// Process export jobs
exportQueue.process('export-opportunities', async (job) => {
    const { format, filters, userId } = job.data;
    logger_1.logger.info(`Processing export job for user ${userId}`);
    try {
        // Implement export logic
        // Generate CSV/Excel/JSON file
        // Upload to S3
        // Send notification
        return { success: true, url: 'export-url' };
    }
    catch (error) {
        logger_1.logger.error('Export failed', error);
        throw error;
    }
});
// Process alert jobs
alertQueue.process('watchlist-check', async (job) => {
    const { watchlistId } = job.data;
    logger_1.logger.info(`Processing watchlist check for ${watchlistId}`);
    try {
        // Check for new opportunities matching watchlist criteria
        // Send email notifications
        return { success: true, matches: 0 };
    }
    catch (error) {
        logger_1.logger.error('Watchlist check failed', error);
        throw error;
    }
});
// Schedule recurring jobs
async function scheduleJobs() {
    // SAM.gov - every 15 minutes
    await ingestionQueue.add('sync-sam-gov', {}, {
        repeat: { cron: '*/15 * * * *' },
        removeOnComplete: 10,
        removeOnFail: 50,
    });
    // Grants.gov - daily at 2 AM
    await ingestionQueue.add('sync-grants-gov', {}, {
        repeat: { cron: '0 2 * * *' },
        removeOnComplete: 5,
        removeOnFail: 10,
    });
    // FPDS - every hour
    await ingestionQueue.add('sync-fpds', {}, {
        repeat: { cron: '0 * * * *' },
        removeOnComplete: 10,
        removeOnFail: 20,
    });
    // TED EU - every 4 hours
    await ingestionQueue.add('sync-ted-eu', { countries: ['DE', 'FR', 'IT', 'ES', 'NL'] }, {
        repeat: { cron: '0 */4 * * *' },
        removeOnComplete: 5,
        removeOnFail: 10,
    });
    // UK Contracts - twice daily
    await ingestionQueue.add('sync-uk-contracts', {}, {
        repeat: { cron: '0 6,18 * * *' },
        removeOnComplete: 5,
        removeOnFail: 10,
    });
    // UNGM - daily at 3 AM
    await ingestionQueue.add('sync-ungm', {}, {
        repeat: { cron: '0 3 * * *' },
        removeOnComplete: 5,
        removeOnFail: 10,
    });
    // Recompete predictions - weekly
    await analysisQueue.add('recompete-prediction', { monthsAhead: 18 }, {
        repeat: { cron: '0 0 * * 0' }, // Sunday midnight
        removeOnComplete: 2,
        removeOnFail: 5,
    });
    logger_1.logger.info('Scheduled recurring jobs');
}
// Queue event handlers
ingestionQueue.on('completed', (job, result) => {
    logger_1.logger.info(`Job ${job.id} completed`, result);
});
ingestionQueue.on('failed', (job, err) => {
    logger_1.logger.error(`Job ${job.id} failed`, err);
});
analysisQueue.on('completed', (job, result) => {
    logger_1.logger.info(`Analysis job ${job.id} completed`);
});
analysisQueue.on('failed', (job, err) => {
    logger_1.logger.error(`Analysis job ${job.id} failed`, err);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, closing queues');
    await ingestionQueue.close();
    await analysisQueue.close();
    await exportQueue.close();
    await alertQueue.close();
    // Close client connections
    await Promise.all([
        clients.samGov.close(),
        clients.grantsGov.close(),
        clients.fpds.close(),
        clients.tedEu.close(),
        clients.ukContracts.close(),
        clients.ungm.close(),
        intelligence.close(),
    ]);
    process.exit(0);
});
// Start worker if run directly
if (require.main === module) {
    scheduleJobs()
        .then(() => {
        logger_1.logger.info('Worker started with scheduled jobs');
    })
        .catch((error) => {
        logger_1.logger.error('Failed to start worker', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map