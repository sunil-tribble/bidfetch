import Bull from 'bull';
import { config } from '../config';
import { logger } from '../utils/logger';
import { SamGovClient } from '../services/sources/sam-gov';
import { GrantsGovClient } from '../services/sources/grants-gov';
import { FPDSClient } from '../services/sources/fpds';
import { TEDEuropaClient } from '../services/sources/ted-eu';
import { UKContractsClient } from '../services/sources/uk-contracts';
import { UNGMClient } from '../services/sources/ungm';
import { CompetitiveIntelligenceEngine } from '../services/analytics/competitive-intelligence';
import { MLPredictionService } from '../services/analytics/ml-predictions';

// Create job queues
const ingestionQueue = new Bull('data-ingestion', config.database.redis.url);
const analysisQueue = new Bull('analysis', config.database.redis.url);
const exportQueue = new Bull('export', config.database.redis.url);
const alertQueue = new Bull('alerts', config.database.redis.url);

// Data source clients
const clients = {
  samGov: new SamGovClient(),
  grantsGov: new GrantsGovClient(),
  fpds: new FPDSClient(),
  tedEu: new TEDEuropaClient(),
  ukContracts: new UKContractsClient(),
  ungm: new UNGMClient(),
};

const intelligence = new CompetitiveIntelligenceEngine();
const mlService = new MLPredictionService();

// Process data ingestion jobs
ingestionQueue.process('sync-sam-gov', async (job) => {
  logger.info('Processing SAM.gov sync job', job.data);
  try {
    await clients.samGov.syncOpportunities();
    return { success: true, timestamp: new Date() };
  } catch (error) {
    logger.error('SAM.gov sync failed', error);
    throw error;
  }
});

ingestionQueue.process('sync-grants-gov', async (job) => {
  logger.info('Processing Grants.gov sync job', job.data);
  try {
    await clients.grantsGov.syncGrants();
    return { success: true, timestamp: new Date() };
  } catch (error) {
    logger.error('Grants.gov sync failed', error);
    throw error;
  }
});

ingestionQueue.process('sync-fpds', async (job) => {
  logger.info('Processing FPDS sync job', job.data);
  try {
    await clients.fpds.syncContracts(job.data);
    return { success: true, timestamp: new Date() };
  } catch (error) {
    logger.error('FPDS sync failed', error);
    throw error;
  }
});

ingestionQueue.process('sync-ted-eu', async (job) => {
  logger.info('Processing TED EU sync job', job.data);
  try {
    await clients.tedEu.syncNotices(job.data);
    return { success: true, timestamp: new Date() };
  } catch (error) {
    logger.error('TED EU sync failed', error);
    throw error;
  }
});

ingestionQueue.process('sync-uk-contracts', async (job) => {
  logger.info('Processing UK Contracts sync job', job.data);
  try {
    await clients.ukContracts.syncContracts(job.data);
    return { success: true, timestamp: new Date() };
  } catch (error) {
    logger.error('UK Contracts sync failed', error);
    throw error;
  }
});

ingestionQueue.process('sync-ungm', async (job) => {
  logger.info('Processing UNGM sync job', job.data);
  try {
    await clients.ungm.syncNotices(job.data);
    return { success: true, timestamp: new Date() };
  } catch (error) {
    logger.error('UNGM sync failed', error);
    throw error;
  }
});

// Process analysis jobs
analysisQueue.process('competitive-intelligence', async (job) => {
  const { opportunityId } = job.data;
  logger.info(`Processing competitive intelligence for opportunity ${opportunityId}`);
  
  try {
    const analysis = await intelligence.analyzeOpportunity(opportunityId);
    return analysis;
  } catch (error) {
    logger.error('Competitive intelligence analysis failed', error);
    throw error;
  }
});

analysisQueue.process('ml-prediction', async (job) => {
  const { opportunityId } = job.data;
  logger.info(`Processing ML predictions for opportunity ${opportunityId}`);
  
  try {
    const predictions = await mlService.predictOpportunity(opportunityId);
    return predictions;
  } catch (error) {
    logger.error('ML prediction failed', error);
    throw error;
  }
});

analysisQueue.process('recompete-prediction', async (job) => {
  const { monthsAhead = 12 } = job.data;
  logger.info(`Processing recompete predictions for ${monthsAhead} months`);
  
  try {
    const predictions = await intelligence.predictRecompete(monthsAhead);
    return predictions;
  } catch (error) {
    logger.error('Recompete prediction failed', error);
    throw error;
  }
});

// Process export jobs
exportQueue.process('export-opportunities', async (job) => {
  const { format, filters, userId } = job.data;
  logger.info(`Processing export job for user ${userId}`);
  
  try {
    // Implement export logic
    // Generate CSV/Excel/JSON file
    // Upload to S3
    // Send notification
    return { success: true, url: 'export-url' };
  } catch (error) {
    logger.error('Export failed', error);
    throw error;
  }
});

// Process alert jobs
alertQueue.process('watchlist-check', async (job) => {
  const { watchlistId } = job.data;
  logger.info(`Processing watchlist check for ${watchlistId}`);
  
  try {
    // Check for new opportunities matching watchlist criteria
    // Send email notifications
    return { success: true, matches: 0 };
  } catch (error) {
    logger.error('Watchlist check failed', error);
    throw error;
  }
});

// Schedule recurring jobs
export async function scheduleJobs(): Promise<void> {
  // SAM.gov - every 15 minutes
  await ingestionQueue.add(
    'sync-sam-gov',
    {},
    {
      repeat: { cron: '*/15 * * * *' },
      removeOnComplete: 10,
      removeOnFail: 50,
    }
  );
  
  // Grants.gov - daily at 2 AM
  await ingestionQueue.add(
    'sync-grants-gov',
    {},
    {
      repeat: { cron: '0 2 * * *' },
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );
  
  // FPDS - every hour
  await ingestionQueue.add(
    'sync-fpds',
    {},
    {
      repeat: { cron: '0 * * * *' },
      removeOnComplete: 10,
      removeOnFail: 20,
    }
  );
  
  // TED EU - every 4 hours
  await ingestionQueue.add(
    'sync-ted-eu',
    { countries: ['DE', 'FR', 'IT', 'ES', 'NL'] },
    {
      repeat: { cron: '0 */4 * * *' },
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );
  
  // UK Contracts - twice daily
  await ingestionQueue.add(
    'sync-uk-contracts',
    {},
    {
      repeat: { cron: '0 6,18 * * *' },
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );
  
  // UNGM - daily at 3 AM
  await ingestionQueue.add(
    'sync-ungm',
    {},
    {
      repeat: { cron: '0 3 * * *' },
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );
  
  // Recompete predictions - weekly
  await analysisQueue.add(
    'recompete-prediction',
    { monthsAhead: 18 },
    {
      repeat: { cron: '0 0 * * 0' }, // Sunday midnight
      removeOnComplete: 2,
      removeOnFail: 5,
    }
  );
  
  logger.info('Scheduled recurring jobs');
}

// Queue event handlers
ingestionQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed`, result);
});

ingestionQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed`, err);
});

analysisQueue.on('completed', (job, result) => {
  logger.info(`Analysis job ${job.id} completed`);
});

analysisQueue.on('failed', (job, err) => {
  logger.error(`Analysis job ${job.id} failed`, err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing queues');
  
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
      logger.info('Worker started with scheduled jobs');
    })
    .catch((error) => {
      logger.error('Failed to start worker', error);
      process.exit(1);
    });
}