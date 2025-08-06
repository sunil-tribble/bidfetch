"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNGMClient = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const pg_1 = require("pg");
const config_1 = require("../../../config");
const logger_1 = require("../../../utils/logger");
const rate_limiter_1 = require("../../data-ingestion/rate-limiter");
class UNGMClient {
    rateLimiter;
    db;
    baseUrl = 'https://www.ungm.org';
    constructor() {
        this.rateLimiter = new rate_limiter_1.AdaptiveRateLimiter();
        this.db = new pg_1.Pool({
            connectionString: config_1.config.database.postgres.url,
            ...config_1.config.database.postgres.pool,
        });
    }
    async fetchNoticesList(params = {}) {
        await this.rateLimiter.waitForQuota({
            source: 'ungm',
            limit: 100, // Conservative rate limit for scraping
            window: 3600000,
        });
        const notices = [];
        try {
            // UNGM provides a public tender search interface
            const searchUrl = `${this.baseUrl}/Public/Notice`;
            const response = await axios_1.default.get(searchUrl, {
                params: {
                    PageIndex: params.page || 0,
                    PageSize: 50,
                    DateFrom: params.dateFrom,
                    DateTo: params.dateTo,
                    OrderBy: 'DatePublished',
                    OrderDirection: 'DESC',
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; BidFetch/1.0)',
                },
                timeout: 30000,
            });
            const $ = cheerio.load(response.data);
            // Parse the notice list
            $('.notice-row, .tableRow').each((index, element) => {
                const $el = $(element);
                const notice = {
                    referenceNo: $el.find('.reference-no, .noticeRef').text().trim(),
                    title: $el.find('.notice-title, .noticeTitle').text().trim(),
                    organization: $el.find('.organization, .noticeOrg').text().trim(),
                    publishedDate: $el.find('.published-date, .noticePublished').text().trim(),
                    deadline: $el.find('.deadline, .noticeDeadline').text().trim(),
                    type: $el.find('.notice-type, .noticeType').text().trim(),
                    category: $el.find('.category, .noticeCategory').text().trim(),
                    description: $el.find('.description, .noticeDesc').text().trim(),
                    location: $el.find('.location, .noticeLocation').text().trim(),
                };
                // Extract document URL if available
                const docLink = $el.find('a[href*="/Notice/"]').attr('href');
                if (docLink) {
                    notice.documentUrl = docLink.startsWith('http') ? docLink : `${this.baseUrl}${docLink}`;
                }
                if (notice.referenceNo && notice.title) {
                    notices.push(notice);
                }
            });
            logger_1.logger.info(`Fetched ${notices.length} UNGM notices from page ${params.page || 0}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch UNGM notices list', error);
            throw error;
        }
        return notices;
    }
    async fetchNoticeDetails(noticeUrl) {
        await this.rateLimiter.waitForQuota({
            source: 'ungm',
            limit: 100,
            window: 3600000,
        });
        try {
            const response = await axios_1.default.get(noticeUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; BidFetch/1.0)',
                },
                timeout: 30000,
            });
            const $ = cheerio.load(response.data);
            // Extract detailed information
            const notice = {
                referenceNo: $('.reference-number, #ReferenceNo').text().trim(),
                title: $('.notice-title, h1').first().text().trim(),
                organization: $('.organization-name, .org-name').text().trim(),
                publishedDate: $('.published-date, .date-published').text().trim(),
                deadline: $('.submission-deadline, .deadline').text().trim(),
                type: $('.procurement-type, .notice-type').text().trim(),
                category: $('.procurement-category, .category').text().trim(),
                description: $('.notice-description, .description').text().trim(),
                value: $('.estimated-value, .contract-value').text().trim(),
                location: $('.delivery-location, .location').text().trim(),
            };
            // Extract UNSPSC codes if available
            const unspscCodes = [];
            $('.unspsc-code, .commodity-code').each((i, el) => {
                const code = $(el).text().trim();
                if (code)
                    unspscCodes.push(code);
            });
            notice.unspscCodes = unspscCodes;
            // Extract document links
            $('.document-link, a[href*=".pdf"], a[href*="/Download/"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href && !notice.documentUrl) {
                    notice.documentUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                }
            });
            return notice;
        }
        catch (error) {
            logger_1.logger.error(`Failed to fetch UNGM notice details from ${noticeUrl}`, error);
            return null;
        }
    }
    async fetchAllNotices(params = {}) {
        const allNotices = [];
        const maxPages = params.maxPages || 10;
        // Default to last 30 days
        if (!params.dateFrom) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            params.dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
        }
        for (let page = 0; page < maxPages; page++) {
            try {
                const notices = await this.fetchNoticesList({
                    ...params,
                    page,
                });
                if (notices.length === 0) {
                    break; // No more results
                }
                // Fetch detailed information for each notice
                for (const notice of notices) {
                    if (notice.documentUrl) {
                        const detailed = await this.fetchNoticeDetails(notice.documentUrl);
                        if (detailed) {
                            Object.assign(notice, detailed);
                        }
                    }
                    allNotices.push(notice);
                    // Rate limiting between detail fetches
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                logger_1.logger.info(`UNGM Progress: ${allNotices.length} notices fetched`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to fetch UNGM page ${page}`, error);
                break;
            }
        }
        return allNotices;
    }
    parseDate(dateStr) {
        if (!dateStr)
            return null;
        // Try various date formats
        const formats = [
            /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/, // DD/MM/YYYY or DD-MM-YYYY
            /(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
            /(\w+)\s+(\d{1,2}),?\s+(\d{4})/, // Month DD, YYYY
        ];
        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                try {
                    return new Date(dateStr);
                }
                catch {
                    continue;
                }
            }
        }
        return null;
    }
    parseValue(valueStr) {
        if (!valueStr)
            return null;
        // Remove currency symbols and parse
        const cleaned = valueStr.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    }
    async saveNotice(notice) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Get source ID
            const sourceResult = await client.query('SELECT id FROM sources WHERE name = $1', ['UNGM']);
            const sourceId = sourceResult.rows[0]?.id;
            if (!sourceId) {
                throw new Error('UNGM source not found in database');
            }
            // Upsert organization
            const orgResult = await client.query(`
        INSERT INTO organizations (name, type, metadata)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE
        SET updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
                notice.organization || 'Unknown UN Organization',
                'agency',
                JSON.stringify({
                    type: 'un_organization',
                    location: notice.location,
                }),
            ]);
            const agencyId = orgResult.rows[0].id;
            // Parse dates
            const publishedDate = this.parseDate(notice.publishedDate);
            const deadline = this.parseDate(notice.deadline);
            const now = new Date();
            const status = !deadline || deadline < now ? 'closed' : 'active';
            // Save opportunity
            await client.query(`
        INSERT INTO opportunities (
          source_id, external_id, title, description, type, status,
          agency_id, agency_name, posted_date, response_deadline,
          estimated_value, country, raw_data, metadata, documents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (source_id, external_id) DO UPDATE
        SET 
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          response_deadline = EXCLUDED.response_deadline,
          estimated_value = EXCLUDED.estimated_value,
          raw_data = EXCLUDED.raw_data,
          metadata = EXCLUDED.metadata,
          documents = EXCLUDED.documents,
          updated_at = CURRENT_TIMESTAMP
      `, [
                sourceId,
                notice.referenceNo,
                notice.title,
                notice.description,
                notice.type?.toLowerCase() || 'solicitation',
                status,
                agencyId,
                notice.organization,
                publishedDate,
                deadline,
                this.parseValue(notice.value || ''),
                'UN', // International
                JSON.stringify(notice),
                JSON.stringify({
                    category: notice.category,
                    location: notice.location,
                    unspscCodes: notice.unspscCodes,
                }),
                JSON.stringify(notice.documentUrl ? [notice.documentUrl] : []),
            ]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Failed to save UNGM notice', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async syncNotices(params = {}) {
        logger_1.logger.info('Starting UNGM sync...');
        const startTime = Date.now();
        let processedCount = 0;
        let errorCount = 0;
        try {
            const notices = await this.fetchAllNotices(params);
            logger_1.logger.info(`Found ${notices.length} UNGM notices to process`);
            for (const notice of notices) {
                try {
                    await this.saveNotice(notice);
                    processedCount++;
                    if (processedCount % 20 === 0) {
                        logger_1.logger.info(`Processed ${processedCount}/${notices.length} UNGM notices`);
                    }
                }
                catch (error) {
                    errorCount++;
                    logger_1.logger.error(`Failed to process UNGM notice ${notice.referenceNo}`, error);
                }
            }
            // Update last sync date
            await this.db.query('UPDATE sources SET last_sync_at = $1 WHERE name = $2', [new Date(), 'UNGM']);
            // Log processing results
            await this.db.query(`
        INSERT INTO processing_logs (
          source_id, job_type, status, started_at, completed_at,
          records_processed, records_created, errors_count
        ) VALUES (
          (SELECT id FROM sources WHERE name = 'UNGM'),
          'sync', 'completed', $1, $2, $3, $4, $5
        )
      `, [
                new Date(startTime),
                new Date(),
                notices.length,
                processedCount,
                errorCount,
            ]);
            logger_1.logger.info(`UNGM sync completed. Processed: ${processedCount}, Errors: ${errorCount}, Time: ${Date.now() - startTime}ms`);
        }
        catch (error) {
            logger_1.logger.error('UNGM sync failed', error);
            throw error;
        }
    }
    async downloadDataExport() {
        // Alternative approach: Download bulk data export if available
        try {
            const exportUrl = 'https://www.ungm.org/Public/Notice/Export';
            const response = await axios_1.default.get(exportUrl, {
                params: {
                    format: 'json',
                    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dateTo: new Date().toISOString().split('T')[0],
                },
                headers: {
                    'User-Agent': 'BidFetch/1.0',
                },
                timeout: 60000,
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to download UNGM data export', error);
            // Fall back to scraping
            return null;
        }
    }
    async close() {
        await this.rateLimiter.close();
        await this.db.end();
    }
}
exports.UNGMClient = UNGMClient;
// Export for direct execution
if (require.main === module) {
    const client = new UNGMClient();
    client.syncNotices()
        .then(() => {
        console.log('UNGM sync completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('UNGM sync failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map