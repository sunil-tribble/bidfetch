import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { Pool } from 'pg';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';
import { AdaptiveRateLimiter } from '../../data-ingestion/rate-limiter';

const gunzip = promisify(zlib.gunzip);

interface GrantOpportunity {
  opportunityID: string;
  opportunityNumber: string;
  opportunityTitle: string;
  agencyCode: string;
  agencyName: string;
  postDate: string;
  closeDate: string;
  applicationsDueDate: string;
  archiveDate: string;
  description: string;
  costSharing: boolean;
  awardCeiling: number;
  awardFloor: number;
  estimatedTotalProgramFunding: number;
  expectedNumberOfAwards: number;
  cfdaNumbers: string[];
  eligibleApplicants: string[];
  fundingInstrumentType: string;
  categoryOfFundingActivity: string;
  additionalInformation: string;
  version: string;
  docType: string;
}

export class GrantsGovClient {
  private rateLimiter: AdaptiveRateLimiter;
  private db: Pool;
  
  constructor() {
    this.rateLimiter = new AdaptiveRateLimiter();
    this.db = new Pool({
      connectionString: config.database.postgres.url,
      ...config.database.postgres.pool,
    });
  }
  
  private getExtractUrl(date: Date = new Date()): string {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    return `https://prod-grants-gov-chatbot.s3.amazonaws.com/extracts/GrantsDBExtract${dateStr}v2.zip`;
  }
  
  async downloadDailyExtract(date: Date = new Date()): Promise<Buffer> {
    const url = this.getExtractUrl(date);
    
    await this.rateLimiter.waitForQuota({
      source: 'grants_gov',
      limit: config.apis.grantsGov.rateLimit,
      window: config.apis.grantsGov.rateWindow,
    });
    
    try {
      logger.info(`Downloading Grants.gov extract from ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 300000, // 5 minutes timeout for large file
        maxContentLength: 500 * 1024 * 1024, // 500MB max
        headers: {
          'User-Agent': 'BidFetch/1.0',
        },
      });
      
      logger.info(`Downloaded ${response.data.length} bytes`);
      return Buffer.from(response.data);
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Try previous day if today's extract not available yet
        if (date.toDateString() === new Date().toDateString()) {
          const yesterday = new Date(date);
          yesterday.setDate(yesterday.getDate() - 1);
          logger.info('Today\'s extract not available, trying yesterday');
          return this.downloadDailyExtract(yesterday);
        }
      }
      
      logger.error('Failed to download Grants.gov extract', error);
      throw error;
    }
  }
  
  async extractZipContent(zipBuffer: Buffer): Promise<string> {
    try {
      // For simplicity, using a library approach
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();
      
      // Find the main XML file
      const xmlEntry = zipEntries.find((entry: any) => 
        entry.entryName.endsWith('.xml') && 
        entry.entryName.includes('GrantsDBExtract')
      );
      
      if (!xmlEntry) {
        throw new Error('XML file not found in zip');
      }
      
      const xmlContent = zip.readAsText(xmlEntry);
      logger.info(`Extracted XML file: ${xmlEntry.entryName}`);
      
      return xmlContent;
      
    } catch (error) {
      logger.error('Failed to extract zip content', error);
      throw error;
    }
  }
  
  async parseXMLExtract(xmlContent: string): Promise<GrantOpportunity[]> {
    try {
      const result = await parseStringPromise(xmlContent, {
        explicitArray: false,
        ignoreAttrs: true,
        valueProcessors: [
          (value: any) => {
            // Handle boolean values
            if (value === 'Yes' || value === 'Y') return true;
            if (value === 'No' || value === 'N') return false;
            // Handle numeric values
            if (!isNaN(value) && value !== '') return Number(value);
            return value;
          }
        ],
      });
      
      const opportunities: GrantOpportunity[] = [];
      const grantsData = result.Grants?.OpportunitySynopsisDetail;
      
      if (!grantsData) {
        logger.warn('No grant opportunities found in XML');
        return opportunities;
      }
      
      const items = Array.isArray(grantsData) ? grantsData : [grantsData];
      
      for (const item of items) {
        if (!item) continue;
        
        const opportunity: GrantOpportunity = {
          opportunityID: item.OpportunityID || '',
          opportunityNumber: item.OpportunityNumber || '',
          opportunityTitle: item.OpportunityTitle || '',
          agencyCode: item.AgencyCode || '',
          agencyName: item.AgencyName || '',
          postDate: item.PostDate || '',
          closeDate: item.CloseDate || '',
          applicationsDueDate: item.ApplicationsDueDate || item.CloseDate || '',
          archiveDate: item.ArchiveDate || '',
          description: item.Description || '',
          costSharing: item.CostSharing === true,
          awardCeiling: parseFloat(item.AwardCeiling || '0'),
          awardFloor: parseFloat(item.AwardFloor || '0'),
          estimatedTotalProgramFunding: parseFloat(item.EstimatedTotalProgramFunding || '0'),
          expectedNumberOfAwards: parseInt(item.ExpectedNumberOfAwards || '0'),
          cfdaNumbers: this.parseArray(item.CFDANumbers),
          eligibleApplicants: this.parseArray(item.EligibleApplicants),
          fundingInstrumentType: item.FundingInstrumentType || '',
          categoryOfFundingActivity: item.CategoryOfFundingActivity || '',
          additionalInformation: item.AdditionalInformation || '',
          version: item.Version || '',
          docType: 'Grant',
        };
        
        opportunities.push(opportunity);
      }
      
      logger.info(`Parsed ${opportunities.length} grant opportunities`);
      return opportunities;
      
    } catch (error) {
      logger.error('Failed to parse XML extract', error);
      throw error;
    }
  }
  
  private parseArray(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return [String(value)];
  }
  
  async saveGrant(grant: GrantOpportunity): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get source ID
      const sourceResult = await client.query(
        'SELECT id FROM sources WHERE name = $1',
        ['Grants.gov']
      );
      const sourceId = sourceResult.rows[0]?.id;
      
      if (!sourceId) {
        throw new Error('Grants.gov source not found in database');
      }
      
      // Upsert organization
      const orgResult = await client.query(`
        INSERT INTO organizations (name, type, identifier, metadata)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE
        SET updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
        grant.agencyName,
        'agency',
        grant.agencyCode,
        JSON.stringify({ type: 'federal_grant_agency' }),
      ]);
      
      const agencyId = orgResult.rows[0].id;
      
      // Calculate status
      const closeDate = grant.closeDate ? new Date(grant.closeDate) : null;
      const now = new Date();
      const status = !closeDate || closeDate < now ? 'closed' : 'active';
      
      // Prepare opportunity data
      await client.query(`
        INSERT INTO opportunities (
          source_id, external_id, title, description, type, status,
          agency_id, agency_name, posted_date, response_deadline,
          value_min, value_max, estimated_value, country,
          raw_data, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (source_id, external_id) DO UPDATE
        SET 
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          response_deadline = EXCLUDED.response_deadline,
          value_min = EXCLUDED.value_min,
          value_max = EXCLUDED.value_max,
          estimated_value = EXCLUDED.estimated_value,
          raw_data = EXCLUDED.raw_data,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP
      `, [
        sourceId,
        grant.opportunityID,
        grant.opportunityTitle,
        grant.description,
        'grant',
        status,
        agencyId,
        grant.agencyName,
        grant.postDate ? new Date(grant.postDate) : null,
        closeDate,
        grant.awardFloor || null,
        grant.awardCeiling || null,
        grant.estimatedTotalProgramFunding || null,
        'US',
        JSON.stringify(grant),
        JSON.stringify({
          opportunityNumber: grant.opportunityNumber,
          cfdaNumbers: grant.cfdaNumbers,
          eligibleApplicants: grant.eligibleApplicants,
          fundingInstrumentType: grant.fundingInstrumentType,
          categoryOfFundingActivity: grant.categoryOfFundingActivity,
          expectedNumberOfAwards: grant.expectedNumberOfAwards,
          costSharing: grant.costSharing,
        }),
      ]);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to save grant', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  async syncGrants(): Promise<void> {
    logger.info('Starting Grants.gov sync...');
    
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    
    try {
      // Download and extract the daily file
      const zipBuffer = await this.downloadDailyExtract();
      const xmlContent = await this.extractZipContent(zipBuffer);
      const grants = await this.parseXMLExtract(xmlContent);
      
      logger.info(`Found ${grants.length} grants to process`);
      
      // Process each grant
      for (const grant of grants) {
        try {
          await this.saveGrant(grant);
          processedCount++;
          
          if (processedCount % 100 === 0) {
            logger.info(`Processed ${processedCount}/${grants.length} grants`);
          }
        } catch (error) {
          errorCount++;
          logger.error(`Failed to process grant ${grant.opportunityID}`, error);
        }
      }
      
      // Update last sync date
      await this.db.query(
        'UPDATE sources SET last_sync_at = $1 WHERE name = $2',
        [new Date(), 'Grants.gov']
      );
      
      // Log processing results
      await this.db.query(`
        INSERT INTO processing_logs (
          source_id, job_type, status, started_at, completed_at,
          records_processed, records_created, errors_count
        ) VALUES (
          (SELECT id FROM sources WHERE name = 'Grants.gov'),
          'daily_sync', 'completed', $1, $2, $3, $4, $5
        )
      `, [
        new Date(startTime),
        new Date(),
        grants.length,
        processedCount,
        errorCount,
      ]);
      
      logger.info(`Grants.gov sync completed. Processed: ${processedCount}, Errors: ${errorCount}, Time: ${Date.now() - startTime}ms`);
      
    } catch (error) {
      logger.error('Grants.gov sync failed', error);
      
      await this.db.query(`
        INSERT INTO processing_logs (
          source_id, job_type, status, started_at, completed_at,
          errors_count, error_details
        ) VALUES (
          (SELECT id FROM sources WHERE name = 'Grants.gov'),
          'daily_sync', 'failed', $1, $2, 1, $3
        )
      `, [
        new Date(startTime),
        new Date(),
        JSON.stringify({ error: (error as Error).message }),
      ]);
      
      throw error;
    }
  }
  
  async close(): Promise<void> {
    await this.rateLimiter.close();
    await this.db.end();
  }
}

// Export for direct execution
if (require.main === module) {
  const client = new GrantsGovClient();
  client.syncGrants()
    .then(() => {
      console.log('Grants.gov sync completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Grants.gov sync failed:', error);
      process.exit(1);
    });
}