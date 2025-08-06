"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FPDSClient = void 0;
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const config_1 = require("../../../config");
const rate_limiter_1 = require("../../data-ingestion/rate-limiter");
const logger_1 = require("../../../utils/logger");
const pg_1 = require("pg");
class FPDSClient {
    rateLimiter;
    db;
    constructor() {
        this.rateLimiter = new rate_limiter_1.AdaptiveRateLimiter();
        this.db = new pg_1.Pool({
            connectionString: config_1.config.database.postgres.url,
            ...config_1.config.database.postgres.pool,
        });
    }
    buildFeedUrl(params = {}) {
        const baseUrl = config_1.config.apis.fpds.baseUrl;
        const queryParams = new URLSearchParams();
        // Build search query
        const searchTerms = [];
        if (params.agency) {
            searchTerms.push(`AGENCY_CODE:"${params.agency}"`);
        }
        if (params.dateFrom || params.dateTo) {
            const from = params.dateFrom || '2020-01-01';
            const to = params.dateTo || new Date().toISOString().split('T')[0];
            searchTerms.push(`SIGNED_DATE:[${from},${to}]`);
        }
        if (params.naics) {
            searchTerms.push(`NAICS_CODE:"${params.naics}"`);
        }
        if (searchTerms.length > 0) {
            queryParams.append('q', searchTerms.join(' AND '));
        }
        queryParams.append('start', (params.offset || 0).toString());
        queryParams.append('limit', '10'); // FPDS limit is 10 per request
        return `${baseUrl}?${queryParams.toString()}`;
    }
    async fetchContracts(params = {}) {
        // Check rate limit
        await this.rateLimiter.waitForQuota({
            source: 'fpds',
            limit: config_1.config.apis.fpds.rateLimit,
            window: config_1.config.apis.fpds.rateWindow,
        });
        const url = this.buildFeedUrl(params);
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    'Accept': 'application/atom+xml',
                },
                timeout: 30000,
            });
            const parsed = await (0, xml2js_1.parseStringPromise)(response.data, {
                explicitArray: false,
                ignoreAttrs: true,
            });
            const feed = parsed.feed;
            if (!feed || !feed.entry) {
                return [];
            }
            const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
            return entries.map(entry => this.parseEntry(entry));
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch FPDS contracts', error);
            throw error;
        }
    }
    parseEntry(entry) {
        const content = entry.content || {};
        // Parse the complex XML structure
        const award = content.award || content;
        return {
            id: entry.id || '',
            title: entry.title || '',
            updated: entry.updated || '',
            content: {
                contractId: award.awardContractID?.PIID || award.contractId || '',
                parentAwardId: award.awardContractID?.parentAwardID || '',
                agencyId: award.relevantContractDates?.agencyID || '',
                agencyName: award.purchaserInformation?.contractingOfficeAgencyName || '',
                contractorName: award.vendorName || award.contractor?.name || '',
                contractorDuns: award.vendor?.vendorDUNSNumber || '',
                awardDate: award.relevantContractDates?.signedDate || '',
                effectiveDate: award.relevantContractDates?.effectiveDate || '',
                completionDate: award.relevantContractDates?.ultimateCompletionDate || '',
                currentCompletionDate: award.relevantContractDates?.currentCompletionDate || '',
                obligatedAmount: award.dollarValues?.obligatedAmount || '0',
                baseValue: award.dollarValues?.baseAndExercisedOptionsValue || '0',
                currentValue: award.dollarValues?.baseAndAllOptionsValue || '0',
                naicsCode: award.productOrServiceInformation?.naicsCode || '',
                pscCode: award.productOrServiceInformation?.productOrServiceCode || '',
                contractType: award.typeOfContractPricing?.typeOfContract || '',
                competed: award.competition?.extentCompeted === 'FULL_AND_OPEN',
                numberOfOffersReceived: parseInt(award.competition?.numberOfOffersReceived || '0'),
                placeOfPerformance: {
                    city: award.placeOfPerformance?.city || '',
                    state: award.placeOfPerformance?.stateCode || '',
                    country: award.placeOfPerformance?.countryCode || '',
                    zipCode: award.placeOfPerformance?.zipCode || '',
                },
                description: award.contractDescription || '',
            },
        };
    }
    async fetchAllContracts(params = {}) {
        const allContracts = [];
        let offset = 0;
        const maxRecords = params.maxRecords || 10000;
        while (allContracts.length < maxRecords) {
            try {
                const contracts = await this.fetchContracts({
                    ...params,
                    offset,
                });
                if (contracts.length === 0) {
                    break; // No more results
                }
                allContracts.push(...contracts);
                offset += 10; // FPDS returns max 10 at a time
                logger_1.logger.info(`FPDS Progress: ${allContracts.length} contracts fetched`);
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            catch (error) {
                logger_1.logger.error(`Failed to fetch FPDS page at offset ${offset}`, error);
                break;
            }
        }
        return allContracts;
    }
    async saveContract(contract) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Upsert agency
            let agencyId = null;
            if (contract.content.agencyName) {
                const agencyResult = await client.query(`
          INSERT INTO organizations (name, type, identifier)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE
          SET updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [
                    contract.content.agencyName,
                    'agency',
                    contract.content.agencyId,
                ]);
                agencyId = agencyResult.rows[0].id;
            }
            // Upsert contractor
            let contractorId = null;
            if (contract.content.contractorName) {
                const contractorResult = await client.query(`
          INSERT INTO organizations (name, type, identifier)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE
          SET updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [
                    contract.content.contractorName,
                    'contractor',
                    contract.content.contractorDuns,
                ]);
                contractorId = contractorResult.rows[0].id;
            }
            // Parse monetary values
            const parseAmount = (value) => {
                if (!value)
                    return null;
                const cleaned = value.replace(/[^0-9.-]/g, '');
                const parsed = parseFloat(cleaned);
                return isNaN(parsed) ? null : parsed;
            };
            // Upsert contract
            await client.query(`
        INSERT INTO contracts (
          contract_id, parent_award_id, agency_id, contractor_id,
          agency_name, contractor_name, award_date, effective_date,
          completion_date, current_completion_date, obligated_amount,
          base_value, current_value, naics_code, psc_code,
          contract_type, competed, number_of_offers_received,
          place_of_performance, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (contract_id) DO UPDATE
        SET 
          current_completion_date = EXCLUDED.current_completion_date,
          obligated_amount = EXCLUDED.obligated_amount,
          current_value = EXCLUDED.current_value,
          raw_data = EXCLUDED.raw_data,
          updated_at = CURRENT_TIMESTAMP
      `, [
                contract.content.contractId,
                contract.content.parentAwardId,
                agencyId,
                contractorId,
                contract.content.agencyName,
                contract.content.contractorName,
                contract.content.awardDate || null,
                contract.content.effectiveDate || null,
                contract.content.completionDate || null,
                contract.content.currentCompletionDate || null,
                parseAmount(contract.content.obligatedAmount),
                parseAmount(contract.content.baseValue),
                parseAmount(contract.content.currentValue),
                contract.content.naicsCode,
                contract.content.pscCode,
                contract.content.contractType,
                contract.content.competed,
                contract.content.numberOfOffersReceived,
                JSON.stringify(contract.content.placeOfPerformance),
                JSON.stringify(contract),
            ]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Failed to save contract', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async analyzeContractExpiring(monthsAhead = 12) {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + monthsAhead);
        const result = await this.db.query(`
      SELECT 
        c.*,
        o.name as contractor_name,
        a.name as agency_name
      FROM contracts c
      LEFT JOIN organizations o ON c.contractor_id = o.id
      LEFT JOIN organizations a ON c.agency_id = a.id
      WHERE c.current_completion_date BETWEEN CURRENT_DATE AND $1
      ORDER BY c.current_completion_date ASC
    `, [expiryDate]);
        return result.rows;
    }
    async findIncumbent(agency, naicsCode) {
        const result = await this.db.query(`
      SELECT 
        c.*,
        o.name as contractor_name,
        COUNT(*) as contract_count,
        SUM(c.obligated_amount) as total_value
      FROM contracts c
      LEFT JOIN organizations o ON c.contractor_id = o.id
      WHERE c.agency_name = $1 
        AND c.naics_code = $2
        AND c.award_date >= CURRENT_DATE - INTERVAL '3 years'
      GROUP BY c.contractor_id, o.name, c.id
      ORDER BY total_value DESC
      LIMIT 10
    `, [agency, naicsCode]);
        return result.rows;
    }
    async syncContracts(params = {}) {
        logger_1.logger.info('Starting FPDS sync...');
        const startTime = Date.now();
        let processedCount = 0;
        let errorCount = 0;
        // Default to last 30 days if no date range specified
        if (!params.dateFrom) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            params.dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
        }
        try {
            const contracts = await this.fetchAllContracts(params);
            for (const contract of contracts) {
                try {
                    await this.saveContract(contract);
                    processedCount++;
                    if (processedCount % 100 === 0) {
                        logger_1.logger.info(`Processed ${processedCount}/${contracts.length} contracts`);
                    }
                }
                catch (error) {
                    errorCount++;
                    logger_1.logger.error(`Failed to process contract ${contract.content.contractId}`, error);
                }
            }
            // Update last sync date
            await this.db.query('UPDATE sources SET last_sync_at = $1 WHERE name = $2', [new Date(), 'FPDS']);
            // Log processing results
            await this.db.query(`
        INSERT INTO processing_logs (
          source_id, job_type, status, started_at, completed_at,
          records_processed, records_created, errors_count
        ) VALUES (
          (SELECT id FROM sources WHERE name = 'FPDS'),
          'sync', 'completed', $1, $2, $3, $4, $5
        )
      `, [
                new Date(startTime),
                new Date(),
                contracts.length,
                processedCount,
                errorCount,
            ]);
            logger_1.logger.info(`FPDS sync completed. Processed: ${processedCount}, Errors: ${errorCount}, Time: ${Date.now() - startTime}ms`);
        }
        catch (error) {
            logger_1.logger.error('FPDS sync failed', error);
            throw error;
        }
    }
    async close() {
        await this.rateLimiter.close();
        await this.db.end();
    }
}
exports.FPDSClient = FPDSClient;
// Export for direct execution
if (require.main === module) {
    const client = new FPDSClient();
    client.syncContracts()
        .then(() => {
        console.log('FPDS sync completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('FPDS sync failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map