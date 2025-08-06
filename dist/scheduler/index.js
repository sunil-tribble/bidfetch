"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const sam_gov_1 = require("../services/sources/sam-gov");
const fpds_1 = require("../services/sources/fpds");
class SchedulerService {
    tasks = [];
    start() {
        // SAM.gov polling - every 15 minutes
        if (config_1.config.apis.samGov.pollInterval) {
            const samTask = node_cron_1.default.schedule('*/15 * * * *', async () => {
                logger_1.logger.info('Starting scheduled SAM.gov sync');
                const client = new sam_gov_1.SamGovClient();
                try {
                    await client.syncOpportunities();
                }
                catch (error) {
                    logger_1.logger.error('SAM.gov scheduled sync failed', error);
                }
                finally {
                    await client.close();
                }
            });
            this.tasks.push(samTask);
            logger_1.logger.info('SAM.gov scheduler started (every 15 minutes)');
        }
        // FPDS polling - every hour
        if (config_1.config.apis.fpds.pollInterval) {
            const fpdsTask = node_cron_1.default.schedule('0 * * * *', async () => {
                logger_1.logger.info('Starting scheduled FPDS sync');
                const client = new fpds_1.FPDSClient();
                try {
                    await client.syncContracts();
                }
                catch (error) {
                    logger_1.logger.error('FPDS scheduled sync failed', error);
                }
                finally {
                    await client.close();
                }
            });
            this.tasks.push(fpdsTask);
            logger_1.logger.info('FPDS scheduler started (every hour)');
        }
        // Daily competitive intelligence update - 2 AM
        const intelligenceTask = node_cron_1.default.schedule('0 2 * * *', async () => {
            logger_1.logger.info('Starting daily competitive intelligence update');
            // Run competitive analysis for all active opportunities
        });
        this.tasks.push(intelligenceTask);
    }
    stop() {
        this.tasks.forEach(task => task.stop());
        logger_1.logger.info('Scheduler service stopped');
    }
}
exports.schedulerService = new SchedulerService();
//# sourceMappingURL=index.js.map