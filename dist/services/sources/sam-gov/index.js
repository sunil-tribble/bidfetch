"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SamGovClient = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../../config");
const rate_limiter_1 = require("../../data-ingestion/rate-limiter");
const logger_1 = require("../../../utils/logger");
const pg_1 = require("pg");
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
class SamGovClient {
    axios;
    rateLimiter;
    db;
    s3Client;
    lastModifiedDate = null;
    constructor() {
        this.axios = axios_1.default.create({
            baseURL: config_1.config.apis.samGov.baseUrl,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        this.rateLimiter = new rate_limiter_1.AdaptiveRateLimiter();
        this.db = new pg_1.Pool({
            connectionString: config_1.config.database.postgres.url,
            ...config_1.config.database.postgres.pool,
        });
        this.s3Client = new client_s3_1.S3Client({
            endpoint: config_1.config.storage.s3.endpoint,
            region: config_1.config.storage.s3.region,
            credentials: {
                accessKeyId: config_1.config.storage.s3.accessKey,
                secretAccessKey: config_1.config.storage.s3.secretKey,
            },
            forcePathStyle: true,
        });
        this.loadLastSyncDate();
    }
    async loadLastSyncDate() {
        try {
            const result = await this.db.query('SELECT last_sync_at FROM sources WHERE name = $1', ['SAM.gov']);
            if (result.rows[0]?.last_sync_at) {
                this.lastModifiedDate = new Date(result.rows[0].last_sync_at);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to load last sync date', error);
        }
    }
    async fetchOpportunities(params = {}) {
        // Check rate limit
        await this.rateLimiter.waitForQuota({
            source: 'sam_gov',
            limit: config_1.config.apis.samGov.rateLimit,
            window: config_1.config.apis.samGov.rateWindow,
        });
        // Default to fetching updates since last sync
        if (!params.modifiedFrom && this.lastModifiedDate) {
            params.modifiedFrom = this.lastModifiedDate.toISOString().split('.')[0] + 'Z';
        }
        if (!params.modifiedTo) {
            params.modifiedTo = new Date().toISOString().split('.')[0] + 'Z';
        }
        const queryParams = new URLSearchParams({
            api_key: config_1.config.apis.samGov.apiKey,
            limit: (params.limit || 1000).toString(),
            offset: (params.offset || 0).toString(),
            ...params,
        });
        try {
            const response = await this.axios.get('/search', {
                params: queryParams,
            });
            logger_1.logger.info(`Fetched ${response.data.opportunitiesData.length} opportunities from SAM.gov`);
            return response.data;
        }
        catch (error) {
            if (error.response?.status === 429) {
                logger_1.logger.warn('SAM.gov rate limit hit, backing off');
                throw new Error('Rate limit exceeded');
            }
            logger_1.logger.error('Failed to fetch SAM.gov opportunities', error);
            throw error;
        }
    }
    async fetchAllOpportunities() {
        const allOpportunities = [];
        let offset = 0;
        const limit = 1000;
        let hasMore = true;
        while (hasMore) {
            try {
                const response = await this.fetchOpportunities({
                    limit,
                    offset,
                });
                allOpportunities.push(...response.opportunitiesData);
                // Check if there are more pages
                hasMore = response.totalRecords > offset + limit;
                offset += limit;
                logger_1.logger.info(`Progress: ${allOpportunities.length}/${response.totalRecords} opportunities`);
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
                logger_1.logger.error(`Failed to fetch page at offset ${offset}`, error);
                break;
            }
        }
        return allOpportunities;
    }
    async downloadDocument(url, opportunityId) {
        try {
            const response = await axios_1.default.get(url, {
                responseType: 'arraybuffer',
                timeout: 60000,
            });
            const buffer = Buffer.from(response.data);
            const hash = (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
            const filename = url.split('/').pop() || `document_${Date.now()}`;
            const key = `opportunities/${opportunityId}/${filename}`;
            // Upload to S3
            await this.s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: config_1.config.storage.s3.bucket,
                Key: key,
                Body: buffer,
                ContentType: response.headers['content-type'] || 'application/octet-stream',
                Metadata: {
                    'opportunity-id': opportunityId,
                    'source-url': url,
                    'content-hash': hash,
                },
            }));
            logger_1.logger.info(`Downloaded document for opportunity ${opportunityId}: ${filename}`);
            return key;
        }
        catch (error) {
            logger_1.logger.error(`Failed to download document from ${url}`, error);
            return null;
        }
    }
    async saveOpportunity(opportunity) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Get source ID
            const sourceResult = await client.query('SELECT id FROM sources WHERE name = $1', ['SAM.gov']);
            const sourceId = sourceResult.rows[0]?.id;
            if (!sourceId) {
                throw new Error('SAM.gov source not found in database');
            }
            // Upsert organization
            const orgResult = await client.query(`
        INSERT INTO organizations (name, type, metadata)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE
        SET updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
                opportunity.department,
                'agency',
                JSON.stringify({
                    subTier: opportunity.subTier,
                    office: opportunity.office,
                }),
            ]);
            const agencyId = orgResult.rows[0].id;
            // Prepare opportunity data
            const opportunityData = {
                source_id: sourceId,
                external_id: opportunity.noticeId,
                title: opportunity.title,
                description: opportunity.description,
                type: opportunity.type?.toLowerCase().replace(' ', '_'),
                status: opportunity.active === 'Yes' ? 'active' : 'closed',
                agency_id: agencyId,
                agency_name: opportunity.department,
                office: opportunity.office,
                naics_codes: opportunity.naicsCodes || [opportunity.naicsCode].filter(Boolean),
                psc_codes: opportunity.classificationCode ? [opportunity.classificationCode] : [],
                posted_date: opportunity.postedDate ? new Date(opportunity.postedDate) : null,
                response_deadline: opportunity.responseDeadLine ? new Date(opportunity.responseDeadLine) : null,
                award_date: opportunity.award?.date ? new Date(opportunity.award.date) : null,
                estimated_value: opportunity.award?.amount ? parseFloat(opportunity.award.amount.replace(/[^0-9.-]/g, '')) : null,
                set_aside_type: opportunity.typeOfSetAside,
                raw_data: JSON.stringify(opportunity),
                documents: JSON.stringify(opportunity.resourceLinks || []),
            };
            // Upsert opportunity
            const opportunityResult = await client.query(`
        INSERT INTO opportunities (
          source_id, external_id, title, description, type, status,
          agency_id, agency_name, office, naics_codes, psc_codes,
          posted_date, response_deadline, award_date, estimated_value,
          set_aside_type, raw_data, documents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (source_id, external_id) DO UPDATE
        SET 
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          response_deadline = EXCLUDED.response_deadline,
          award_date = EXCLUDED.award_date,
          estimated_value = EXCLUDED.estimated_value,
          raw_data = EXCLUDED.raw_data,
          documents = EXCLUDED.documents,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
                opportunityData.source_id,
                opportunityData.external_id,
                opportunityData.title,
                opportunityData.description,
                opportunityData.type,
                opportunityData.status,
                opportunityData.agency_id,
                opportunityData.agency_name,
                opportunityData.office,
                opportunityData.naics_codes,
                opportunityData.psc_codes,
                opportunityData.posted_date,
                opportunityData.response_deadline,
                opportunityData.award_date,
                opportunityData.estimated_value,
                opportunityData.set_aside_type,
                opportunityData.raw_data,
                opportunityData.documents,
            ]);
            const opportunityId = opportunityResult.rows[0].id;
            // Download associated documents
            if (opportunity.resourceLinks && opportunity.resourceLinks.length > 0) {
                for (const link of opportunity.resourceLinks) {
                    const storagePath = await this.downloadDocument(link, opportunityId);
                    if (storagePath) {
                        await client.query(`
              INSERT INTO documents (opportunity_id, original_url, storage_path, filename)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (opportunity_id, original_url) DO NOTHING
            `, [
                            opportunityId,
                            link,
                            storagePath,
                            link.split('/').pop(),
                        ]);
                    }
                }
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Failed to save opportunity', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async syncOpportunities() {
        logger_1.logger.info('Starting SAM.gov sync...');
        const startTime = Date.now();
        let processedCount = 0;
        let errorCount = 0;
        try {
            const opportunities = await this.fetchAllOpportunities();
            for (const opportunity of opportunities) {
                try {
                    await this.saveOpportunity(opportunity);
                    processedCount++;
                    if (processedCount % 100 === 0) {
                        logger_1.logger.info(`Processed ${processedCount}/${opportunities.length} opportunities`);
                    }
                }
                catch (error) {
                    errorCount++;
                    logger_1.logger.error(`Failed to process opportunity ${opportunity.noticeId}`, error);
                }
            }
            // Update last sync date
            await this.db.query('UPDATE sources SET last_sync_at = $1 WHERE name = $2', [new Date(), 'SAM.gov']);
            // Log processing results
            await this.db.query(`
        INSERT INTO processing_logs (
          source_id, job_type, status, started_at, completed_at,
          records_processed, records_created, errors_count
        ) VALUES (
          (SELECT id FROM sources WHERE name = 'SAM.gov'),
          'full_sync', 'completed', $1, $2, $3, $4, $5
        )
      `, [
                new Date(startTime),
                new Date(),
                opportunities.length,
                processedCount,
                errorCount,
            ]);
            logger_1.logger.info(`SAM.gov sync completed. Processed: ${processedCount}, Errors: ${errorCount}, Time: ${Date.now() - startTime}ms`);
        }
        catch (error) {
            logger_1.logger.error('SAM.gov sync failed', error);
            // Log failure
            await this.db.query(`
        INSERT INTO processing_logs (
          source_id, job_type, status, started_at, completed_at,
          errors_count, error_details
        ) VALUES (
          (SELECT id FROM sources WHERE name = 'SAM.gov'),
          'full_sync', 'failed', $1, $2, 1, $3
        )
      `, [
                new Date(startTime),
                new Date(),
                JSON.stringify({ error: error.message }),
            ]);
            throw error;
        }
    }
    async close() {
        await this.rateLimiter.close();
        await this.db.end();
    }
}
exports.SamGovClient = SamGovClient;
// Export for direct execution
if (require.main === module) {
    const client = new SamGovClient();
    client.syncOpportunities()
        .then(() => {
        console.log('Sync completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Sync failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map