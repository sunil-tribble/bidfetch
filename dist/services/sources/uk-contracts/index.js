"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UKContractsClient = void 0;
const axios_1 = __importDefault(require("axios"));
const pg_1 = require("pg");
const config_1 = require("../../../config");
const logger_1 = require("../../../utils/logger");
const rate_limiter_1 = require("../../data-ingestion/rate-limiter");
class UKContractsClient {
    axios;
    rateLimiter;
    db;
    accessToken = null;
    tokenExpiry = null;
    constructor() {
        this.axios = axios_1.default.create({
            baseURL: config_1.config.apis.ukContracts.baseUrl,
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
    }
    async getAccessToken() {
        // Check if we have a valid token
        if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
            return this.accessToken;
        }
        try {
            const response = await axios_1.default.post(config_1.config.apis.ukContracts.tokenUrl || 'https://www.contractsfinder.service.gov.uk/token', new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: config_1.config.apis.ukContracts.clientId,
                client_secret: config_1.config.apis.ukContracts.clientSecret,
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            this.accessToken = response.data.access_token;
            // Token valid for 1 hour, refresh after 50 minutes
            this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);
            logger_1.logger.info('UK Contracts OAuth token refreshed');
            return this.accessToken;
        }
        catch (error) {
            logger_1.logger.error('Failed to get UK Contracts access token', error);
            // Continue without auth if credentials not available
            return '';
        }
    }
    async searchContracts(params = {}) {
        await this.rateLimiter.waitForQuota({
            source: 'uk_contracts',
            limit: config_1.config.apis.ukContracts.rateLimit,
            window: config_1.config.apis.ukContracts.rateWindow,
        });
        // Get auth token if available
        const token = await this.getAccessToken();
        if (token) {
            this.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        try {
            // UK Contracts Finder uses OCDS format
            const queryParams = new URLSearchParams();
            if (params.publishedFrom) {
                queryParams.append('publishedFrom', params.publishedFrom);
            }
            if (params.publishedTo) {
                queryParams.append('publishedTo', params.publishedTo);
            }
            if (params.minValue) {
                queryParams.append('minValue', params.minValue.toString());
            }
            if (params.maxValue) {
                queryParams.append('maxValue', params.maxValue.toString());
            }
            if (params.status) {
                queryParams.append('status', params.status);
            }
            queryParams.append('limit', (params.limit || 100).toString());
            queryParams.append('offset', (params.offset || 0).toString());
            const response = await this.axios.get(`/notices/search?${queryParams.toString()}`);
            logger_1.logger.info(`Fetched ${response.data.releases?.length || 0} UK contracts`);
            return response.data;
        }
        catch (error) {
            if (error.response?.status === 429) {
                logger_1.logger.warn('UK Contracts rate limit hit');
                throw new Error('Rate limit exceeded');
            }
            logger_1.logger.error('Failed to search UK contracts', error);
            throw error;
        }
    }
    async fetchAllContracts(params = {}) {
        const allContracts = [];
        const maxRecords = params.maxRecords || 2000;
        let offset = 0;
        const limit = 100;
        // Default to last 30 days
        if (!params.publishedFrom) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            params.publishedFrom = thirtyDaysAgo.toISOString().split('T')[0];
        }
        while (allContracts.length < maxRecords) {
            try {
                const response = await this.searchContracts({
                    ...params,
                    limit,
                    offset,
                });
                const releases = response.releases || [];
                if (releases.length === 0) {
                    break; // No more results
                }
                allContracts.push(...releases);
                offset += limit;
                logger_1.logger.info(`UK Contracts Progress: ${allContracts.length} contracts fetched`);
                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            catch (error) {
                logger_1.logger.error(`Failed to fetch UK contracts page at offset ${offset}`, error);
                break;
            }
        }
        return allContracts.slice(0, maxRecords);
    }
    parseOCDSValue(value) {
        if (!value)
            return null;
        if (typeof value === 'object' && value.amount) {
            return parseFloat(value.amount);
        }
        if (typeof value === 'number')
            return value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    }
    async saveContract(release) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Get source ID
            const sourceResult = await client.query('SELECT id FROM sources WHERE name = $1', ['UK Contracts Finder']);
            const sourceId = sourceResult.rows[0]?.id;
            if (!sourceId) {
                throw new Error('UK Contracts Finder source not found in database');
            }
            // Extract tender information
            const tender = release.tender || {};
            const buyer = release.buyer || {};
            // Upsert organization
            const orgResult = await client.query(`
        INSERT INTO organizations (name, type, identifier, country, metadata)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO UPDATE
        SET updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
                buyer.name || tender.procuringEntity?.name || 'Unknown Buyer',
                'agency',
                buyer.id || tender.procuringEntity?.id,
                'GB',
                JSON.stringify({
                    address: tender.procuringEntity?.address,
                }),
            ]);
            const agencyId = orgResult.rows[0].id;
            // Determine status
            const tenderPeriod = tender.tenderPeriod || {};
            const deadline = tenderPeriod.endDate ? new Date(tenderPeriod.endDate) : null;
            const now = new Date();
            let status = 'active';
            if (release.tag?.includes('award')) {
                status = 'awarded';
            }
            else if (release.tag?.includes('cancelled')) {
                status = 'cancelled';
            }
            else if (deadline && deadline < now) {
                status = 'closed';
            }
            // Extract value
            const value = this.parseOCDSValue(tender.value);
            const minValue = this.parseOCDSValue(tender.minValue);
            const maxValue = this.parseOCDSValue(tender.maxValue);
            // Extract documents
            const documents = tender.documents || [];
            // Extract classification codes (CPV)
            const cpvCodes = [];
            if (tender.items) {
                for (const item of tender.items) {
                    if (item.classification?.id) {
                        cpvCodes.push(item.classification.id);
                    }
                }
            }
            // Save opportunity
            await client.query(`
        INSERT INTO opportunities (
          source_id, external_id, title, description, type, status,
          agency_id, agency_name, posted_date, response_deadline,
          estimated_value, value_min, value_max, currency, country,
          cpv_codes, raw_data, metadata, documents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (source_id, external_id) DO UPDATE
        SET 
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          response_deadline = EXCLUDED.response_deadline,
          estimated_value = EXCLUDED.estimated_value,
          value_min = EXCLUDED.value_min,
          value_max = EXCLUDED.value_max,
          cpv_codes = EXCLUDED.cpv_codes,
          raw_data = EXCLUDED.raw_data,
          metadata = EXCLUDED.metadata,
          documents = EXCLUDED.documents,
          updated_at = CURRENT_TIMESTAMP
      `, [
                sourceId,
                release.ocid,
                tender.title || 'Untitled',
                tender.description || '',
                tender.mainProcurementCategory || 'solicitation',
                status,
                agencyId,
                buyer.name || 'Unknown Buyer',
                release.date ? new Date(release.date) : null,
                deadline,
                value,
                minValue,
                maxValue,
                'GBP',
                'GB',
                cpvCodes,
                JSON.stringify(release),
                JSON.stringify({
                    releaseId: release.id,
                    tags: release.tag,
                    procurementMethod: tender.procurementMethod,
                    initiationType: release.initiationType,
                    additionalCategories: tender.additionalProcurementCategories,
                }),
                JSON.stringify(documents.map((d) => ({
                    title: d.title,
                    url: d.url,
                    format: d.format,
                }))),
            ]);
            // Save document references
            if (documents.length > 0) {
                const oppResult = await client.query('SELECT id FROM opportunities WHERE source_id = $1 AND external_id = $2', [sourceId, release.ocid]);
                const opportunityId = oppResult.rows[0]?.id;
                if (opportunityId) {
                    for (const doc of documents) {
                        if (doc.url) {
                            await client.query(`
                INSERT INTO documents (opportunity_id, original_url, filename, metadata)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (opportunity_id, original_url) DO NOTHING
              `, [
                                opportunityId,
                                doc.url,
                                doc.title || 'Document',
                                JSON.stringify({
                                    documentType: doc.documentType,
                                    format: doc.format,
                                    datePublished: doc.datePublished,
                                }),
                            ]);
                        }
                    }
                }
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Failed to save UK contract', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async syncContracts(params = {}) {
        logger_1.logger.info('Starting UK Contracts sync...');
        const startTime = Date.now();
        let processedCount = 0;
        let errorCount = 0;
        try {
            const contracts = await this.fetchAllContracts(params);
            logger_1.logger.info(`Found ${contracts.length} UK contracts to process`);
            for (const contract of contracts) {
                try {
                    await this.saveContract(contract);
                    processedCount++;
                    if (processedCount % 50 === 0) {
                        logger_1.logger.info(`Processed ${processedCount}/${contracts.length} UK contracts`);
                    }
                }
                catch (error) {
                    errorCount++;
                    logger_1.logger.error(`Failed to process UK contract ${contract.ocid}`, error);
                }
            }
            // Update last sync date
            await this.db.query('UPDATE sources SET last_sync_at = $1 WHERE name = $2', [new Date(), 'UK Contracts Finder']);
            // Log processing results
            await this.db.query(`
        INSERT INTO processing_logs (
          source_id, job_type, status, started_at, completed_at,
          records_processed, records_created, errors_count
        ) VALUES (
          (SELECT id FROM sources WHERE name = 'UK Contracts Finder'),
          'sync', 'completed', $1, $2, $3, $4, $5
        )
      `, [
                new Date(startTime),
                new Date(),
                contracts.length,
                processedCount,
                errorCount,
            ]);
            logger_1.logger.info(`UK Contracts sync completed. Processed: ${processedCount}, Errors: ${errorCount}, Time: ${Date.now() - startTime}ms`);
        }
        catch (error) {
            logger_1.logger.error('UK Contracts sync failed', error);
            throw error;
        }
    }
    async close() {
        await this.rateLimiter.close();
        await this.db.end();
    }
}
exports.UKContractsClient = UKContractsClient;
// Export for direct execution
if (require.main === module) {
    const client = new UKContractsClient();
    client.syncContracts()
        .then(() => {
        console.log('UK Contracts sync completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('UK Contracts sync failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map