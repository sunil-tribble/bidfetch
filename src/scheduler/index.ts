import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { SamGovClient } from '../services/sources/sam-gov';
import { FPDSClient } from '../services/sources/fpds';

class SchedulerService {
  private tasks: cron.ScheduledTask[] = [];
  
  start(): void {
    // SAM.gov polling - every 15 minutes
    if (config.apis.samGov.pollInterval) {
      const samTask = cron.schedule('*/15 * * * *', async () => {
        logger.info('Starting scheduled SAM.gov sync');
        const client = new SamGovClient();
        try {
          await client.syncOpportunities();
        } catch (error) {
          logger.error('SAM.gov scheduled sync failed', error);
        } finally {
          await client.close();
        }
      });
      
      this.tasks.push(samTask);
      logger.info('SAM.gov scheduler started (every 15 minutes)');
    }
    
    // FPDS polling - every hour
    if (config.apis.fpds.pollInterval) {
      const fpdsTask = cron.schedule('0 * * * *', async () => {
        logger.info('Starting scheduled FPDS sync');
        const client = new FPDSClient();
        try {
          await client.syncContracts();
        } catch (error) {
          logger.error('FPDS scheduled sync failed', error);
        } finally {
          await client.close();
        }
      });
      
      this.tasks.push(fpdsTask);
      logger.info('FPDS scheduler started (every hour)');
    }
    
    // Daily competitive intelligence update - 2 AM
    const intelligenceTask = cron.schedule('0 2 * * *', async () => {
      logger.info('Starting daily competitive intelligence update');
      // Run competitive analysis for all active opportunities
    });
    
    this.tasks.push(intelligenceTask);
  }
  
  stop(): void {
    this.tasks.forEach(task => task.stop());
    logger.info('Scheduler service stopped');
  }
}

export const schedulerService = new SchedulerService();