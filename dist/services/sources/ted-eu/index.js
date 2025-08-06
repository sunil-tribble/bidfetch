"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEDEuropaClient = void 0;
const axios_1 = __importDefault(require("axios"));
const pg_1 = require("pg");
const config_1 = require("../../../config");
const logger_1 = require("../../../utils/logger");
const rate_limiter_1 = require("../../data-ingestion/rate-limiter");
class TEDEuropaClient {
    axios;
    rateLimiter;
    db;
    constructor() {
        this.axios = axios_1.default.create({
            baseURL: 'https://api.ted.europa.eu/v3',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        // Add API key if available
        if (config_1.config.apis.tedEu.apiKey) {
            this.axios.defaults.headers.common['Authorization'] = `Bearer ${config_1.config.apis.tedEu.apiKey}`;
        }
        this.rateLimiter = new rate_limiter_1.AdaptiveRateLimiter();
        this.db = new pg_1.Pool({
            connectionString: config_1.config.database.postgres.url,
            ...config_1.config.database.postgres.pool,
        });
    }
    buildSearchQuery(params) {
        const queryParts = [];
        // Date range filter
        if (params.fromDate || params.toDate) {
            const from = params.fromDate || '2020-01-01';
            const to = params.toDate || new Date().toISOString().split('T')[0];
            queryParts.push(`PD=[${from} TO ${to}]`);
        }
        // Country filter
        if (params.countries && params.countries.length > 0) {
            const countryFilter = params.countries.map(c => `CY=${c}`).join(' OR ');
            queryParts.push(`(${countryFilter})`);
        }
        // CPV codes filter (Common Procurement Vocabulary)
        if (params.cpvCodes && params.cpvCodes.length > 0) {
            const cpvFilter = params.cpvCodes.map(c => `CPV=${c}*`).join(' OR ');
            queryParts.push(`(${cpvFilter})`);
        }
        // Value range filter
        if (params.minValue || params.maxValue) {
            const min = params.minValue || 0;
            const max = params.maxValue || 999999999999;
            queryParts.push(`TV=[${min} TO ${max}]`);
        }
        // Include only active notices (not awards)
        queryParts.push('TD=(CN OR PIN OR PRI)'); // Contract Notice, Prior Information Notice, Periodic Indicative
        return queryParts.join(' AND ');
    }
    async searchNotices(params = {}) {
        await this.rateLimiter.waitForQuota({
            source: 'ted_eu',
            limit: config_1.config.apis.tedEu.rateLimit,
            window: config_1.config.apis.tedEu.rateWindow,
        });
        const query = this.buildSearchQuery(params);
        const page = params.page || 1;
        const pageSize = Math.min(params.pageSize || 100, 100); // Max 100 per request
        try {
            const response = await this.axios.post('/notices/search', {
                query,
                fields: ['ND', 'TI', 'DS', 'PD', 'DD', 'AC', 'TY', 'NC', 'PR', 'TD', 'RP', 'TV', 'CY', 'AA', 'CPV', 'URI', 'LG'],
                page,
                pageSize,
                sortField: 'PD',
                sortOrder: 'DESC',
            });
            logger_1.logger.info(`Fetched ${response.data.notices?.length || 0} notices from TED Europa`);
            return {
                notices: response.data.notices || [],
                total: response.data.total || 0,
                page: response.data.page || page,
                pageSize: response.data.pageSize || pageSize,
            };
        }
        catch (error) {
            if (error.response?.status === 429) {
                logger_1.logger.warn('TED Europa rate limit hit');
                throw new Error('Rate limit exceeded');
            }
            logger_1.logger.error('Failed to search TED notices', error);
            throw error;
        }
    }
    async fetchNoticeDetails(noticeId) {
        await this.rateLimiter.waitForQuota({
            source: 'ted_eu',
            limit: config_1.config.apis.tedEu.rateLimit,
            window: config_1.config.apis.tedEu.rateWindow,
        });
        try {
            const response = await this.axios.get(`/notices/${noticeId}`);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error(`Failed to fetch notice details for ${noticeId}`, error);
            throw error;
        }
    }
    async fetchAllNotices(params = {}) {
        const allNotices = [];
        const maxRecords = params.maxRecords || 5000;
        let page = 1;
        const pageSize = 100;
        while (allNotices.length < maxRecords) {
            try {
                const response = await this.searchNotices({
                    ...params,
                    page,
                    pageSize,
                });
                if (response.notices.length === 0) {
                    break; // No more results
                }
                allNotices.push(...response.notices);
                logger_1.logger.info(`TED Progress: ${allNotices.length}/${response.total} notices`);
                if (allNotices.length >= response.total) {
                    break; // Retrieved all available notices
                }
                page++;
                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            catch (error) {
                logger_1.logger.error(`Failed to fetch TED page ${page}`, error);
                break;
            }
        }
        return allNotices.slice(0, maxRecords);
    }
    parseCPVCodes(cpvString) {
        if (!cpvString)
            return [];
        // CPV codes are typically separated by commas or spaces
        return cpvString.split(/[,\s]+/).filter(code => code.length >= 8);
    }
    parseValue(valueString) {
        if (!valueString)
            return null;
        // Remove currency symbols and parse
        const cleaned = valueString.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    }
    mapCountryToISO(country) {
        // Map TED country codes to ISO codes if needed
        const countryMap = {
            'UK': 'GB',
            'EL': 'GR', // Greece
            // Add more mappings as needed
        };
        return countryMap[country] || country;
    }
    async saveNotice(notice) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Get source ID
            const sourceResult = await client.query('SELECT id FROM sources WHERE name = $1', ['TED Europa']);
            const sourceId = sourceResult.rows[0]?.id;
            if (!sourceId) {
                throw new Error('TED Europa source not found in database');
            }
            // Upsert organization
            const orgResult = await client.query(`
        INSERT INTO organizations (name, type, country, metadata)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE
        SET updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
                notice.AC || 'Unknown Authority',
                'agency',
                this.mapCountryToISO(notice.CY),
                JSON.stringify({
                    authorityType: notice.AA,
                    region: notice.NC,
                }),
            ]);
            const agencyId = orgResult.rows[0].id;
            // Parse deadline
            const deadline = notice.DD ? new Date(notice.DD) : null;
            const now = new Date();
            const status = !deadline || deadline < now ? 'closed' : 'active';
            // Parse CPV codes
            const cpvCodes = this.parseCPVCodes(notice.CPV?.join(' ') || '');
            // Map contract type
            const contractType = this.mapContractType(notice.TY);
            // Save opportunity
            await client.query(`
        INSERT INTO opportunities (
          source_id, external_id, title, description, type, status,
          agency_id, agency_name, posted_date, response_deadline,
          estimated_value, currency, country, cpv_codes,
          raw_data, metadata, documents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (source_id, external_id) DO UPDATE
        SET 
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          response_deadline = EXCLUDED.response_deadline,
          estimated_value = EXCLUDED.estimated_value,
          cpv_codes = EXCLUDED.cpv_codes,
          raw_data = EXCLUDED.raw_data,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP
      `, [
                sourceId,
                notice.ND,
                notice.TI || 'Untitled',
                notice.DS || '',
                contractType,
                status,
                agencyId,
                notice.AC || 'Unknown Authority',
                notice.PD ? new Date(notice.PD) : null,
                deadline,
                this.parseValue(notice.TV),
                'EUR',
                this.mapCountryToISO(notice.CY),
                cpvCodes,
                JSON.stringify(notice),
                JSON.stringify({
                    procedure: notice.PR,
                    regulation: notice.RP,
                    documentType: notice.TD,
                    nutsCode: notice.NC,
                    language: notice.LG,
                }),
                JSON.stringify([notice.URI]),
            ]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Failed to save TED notice', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    mapContractType(tedType) {
        const typeMap = {
            'WORKS': 'construction',
            'SUPPLIES': 'supplies',
            'SERVICES': 'services',
            'COMBINED': 'mixed',
        };
        return typeMap[tedType] || 'solicitation';
    }
    async syncNotices(params = {}) {
        logger_1.logger.info('Starting TED Europa sync...');
        const startTime = Date.now();
        let processedCount = 0;
        let errorCount = 0;
        // Default to last 7 days if no date range specified
        if (!params.fromDate) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            params.fromDate = sevenDaysAgo.toISOString().split('T')[0];
        }
        // Default to major EU countries if none specified
        if (!params.countries || params.countries.length === 0) {
            params.countries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'PL', 'AT', 'SE', 'DK'];
        }
        try {
            const notices = await this.fetchAllNotices(params);
            logger_1.logger.info(`Found ${notices.length} TED notices to process`);
            for (const notice of notices) {
                try {
                    await this.saveNotice(notice);
                    processedCount++;
                    if (processedCount % 50 === 0) {
                        logger_1.logger.info(`Processed ${processedCount}/${notices.length} TED notices`);
                    }
                }
                catch (error) {
                    errorCount++;
                    logger_1.logger.error(`Failed to process TED notice ${notice.ND}`, error);
                }
            }
            // Update last sync date
            await this.db.query('UPDATE sources SET last_sync_at = $1 WHERE name = $2', [new Date(), 'TED Europa']);
            // Log processing results
            await this.db.query(`
        INSERT INTO processing_logs (
          source_id, job_type, status, started_at, completed_at,
          records_processed, records_created, errors_count, metadata
        ) VALUES (
          (SELECT id FROM sources WHERE name = 'TED Europa'),
          'sync', 'completed', $1, $2, $3, $4, $5, $6
        )
      `, [
                new Date(startTime),
                new Date(),
                notices.length,
                processedCount,
                errorCount,
                JSON.stringify({ countries: params.countries }),
            ]);
            logger_1.logger.info(`TED Europa sync completed. Processed: ${processedCount}, Errors: ${errorCount}, Time: ${Date.now() - startTime}ms`);
        }
        catch (error) {
            logger_1.logger.error('TED Europa sync failed', error);
            throw error;
        }
    }
    async close() {
        await this.rateLimiter.close();
        await this.db.end();
    }
}
exports.TEDEuropaClient = TEDEuropaClient;
// Export for direct execution
if (require.main === module) {
    const client = new TEDEuropaClient();
    client.syncNotices()
        .then(() => {
        console.log('TED Europa sync completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('TED Europa sync failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map