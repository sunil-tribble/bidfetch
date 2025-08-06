import { Pool } from 'pg';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface CompetitiveAnalysis {
  opportunityId: string;
  incumbent?: {
    contractorId: string;
    contractorName: string;
    currentContractId: string;
    currentValue: number;
    performanceHistory: {
      contractCount: number;
      totalValue: number;
      averageValue: number;
      winRate: number;
    };
  };
  topCompetitors: Array<{
    contractorId: string;
    contractorName: string;
    marketShare: number;
    contractCount: number;
    totalValue: number;
    averageValue: number;
    recentWins: number;
  }>;
  marketAnalysis: {
    totalMarketValue: number;
    averageContractValue: number;
    competitionLevel: 'low' | 'medium' | 'high';
    averageCompetitors: number;
    setAsidePreference?: string;
  };
  expiringContracts: Array<{
    contractId: string;
    contractorName: string;
    expiryDate: Date;
    value: number;
    daysUntilExpiry: number;
  }>;
  successFactors: {
    winningPrice: number;
    typicalDuration: number;
    preferredContractType: string;
    keyRequirements: string[];
  };
}

export class CompetitiveIntelligenceEngine {
  private db: Pool;
  
  constructor() {
    this.db = new Pool({
      connectionString: config.database.postgres.url,
      ...config.database.postgres.pool,
    });
  }
  
  async analyzeOpportunity(opportunityId: string): Promise<CompetitiveAnalysis> {
    // Get opportunity details
    const oppResult = await this.db.query(`
      SELECT * FROM opportunities WHERE id = $1
    `, [opportunityId]);
    
    if (oppResult.rows.length === 0) {
      throw new Error('Opportunity not found');
    }
    
    const opportunity = oppResult.rows[0];
    
    // Find incumbent contractor
    const incumbent = await this.findIncumbent(
      opportunity.agency_name,
      opportunity.naics_codes?.[0]
    );
    
    // Get top competitors
    const topCompetitors = await this.getTopCompetitors(
      opportunity.agency_name,
      opportunity.naics_codes?.[0]
    );
    
    // Analyze market
    const marketAnalysis = await this.analyzeMarket(
      opportunity.agency_name,
      opportunity.naics_codes?.[0]
    );
    
    // Find expiring contracts
    const expiringContracts = await this.findExpiringContracts(
      opportunity.agency_name,
      opportunity.naics_codes?.[0]
    );
    
    // Calculate success factors
    const successFactors = await this.calculateSuccessFactors(
      opportunity.agency_name,
      opportunity.naics_codes?.[0]
    );
    
    // Store the analysis
    await this.saveAnalysis(opportunityId, {
      incumbent,
      topCompetitors,
      marketAnalysis,
      expiringContracts,
      successFactors,
    });
    
    return {
      opportunityId,
      incumbent,
      topCompetitors,
      marketAnalysis,
      expiringContracts,
      successFactors,
    };
  }
  
  private async findIncumbent(agency: string, naicsCode: string): Promise<any> {
    const result = await this.db.query(`
      WITH recent_contracts AS (
        SELECT 
          c.*,
          o.name as contractor_name,
          ROW_NUMBER() OVER (PARTITION BY c.contractor_id ORDER BY c.award_date DESC) as rn
        FROM contracts c
        LEFT JOIN organizations o ON c.contractor_id = o.id
        WHERE c.agency_name = $1 
          AND c.naics_code = $2
          AND c.award_date >= CURRENT_DATE - INTERVAL '3 years'
      ),
      contractor_stats AS (
        SELECT 
          contractor_id,
          contractor_name,
          COUNT(*) as contract_count,
          SUM(obligated_amount) as total_value,
          AVG(obligated_amount) as avg_value
        FROM recent_contracts
        GROUP BY contractor_id, contractor_name
      )
      SELECT 
        rc.*,
        cs.contract_count,
        cs.total_value,
        cs.avg_value,
        (cs.contract_count::float / (SELECT COUNT(DISTINCT contractor_id) FROM recent_contracts)) as win_rate
      FROM recent_contracts rc
      JOIN contractor_stats cs ON rc.contractor_id = cs.contractor_id
      WHERE rc.rn = 1
      ORDER BY cs.total_value DESC
      LIMIT 1
    `, [agency, naicsCode]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    return {
      contractorId: row.contractor_id,
      contractorName: row.contractor_name,
      currentContractId: row.contract_id,
      currentValue: row.obligated_amount,
      performanceHistory: {
        contractCount: row.contract_count,
        totalValue: row.total_value,
        averageValue: row.avg_value,
        winRate: row.win_rate,
      },
    };
  }
  
  private async getTopCompetitors(agency: string, naicsCode: string): Promise<any[]> {
    const result = await this.db.query(`
      WITH market_data AS (
        SELECT 
          c.contractor_id,
          o.name as contractor_name,
          COUNT(*) as contract_count,
          SUM(c.obligated_amount) as total_value,
          AVG(c.obligated_amount) as avg_value,
          COUNT(CASE WHEN c.award_date >= CURRENT_DATE - INTERVAL '1 year' THEN 1 END) as recent_wins
        FROM contracts c
        LEFT JOIN organizations o ON c.contractor_id = o.id
        WHERE c.agency_name = $1 
          AND c.naics_code = $2
          AND c.award_date >= CURRENT_DATE - INTERVAL '5 years'
        GROUP BY c.contractor_id, o.name
      ),
      total_market AS (
        SELECT SUM(total_value) as market_total FROM market_data
      )
      SELECT 
        md.*,
        (md.total_value / tm.market_total * 100) as market_share
      FROM market_data md
      CROSS JOIN total_market tm
      ORDER BY md.total_value DESC
      LIMIT 10
    `, [agency, naicsCode]);
    
    return result.rows.map(row => ({
      contractorId: row.contractor_id,
      contractorName: row.contractor_name,
      marketShare: parseFloat(row.market_share),
      contractCount: parseInt(row.contract_count),
      totalValue: parseFloat(row.total_value),
      averageValue: parseFloat(row.avg_value),
      recentWins: parseInt(row.recent_wins),
    }));
  }
  
  private async analyzeMarket(agency: string, naicsCode: string): Promise<any> {
    const result = await this.db.query(`
      SELECT 
        SUM(obligated_amount) as total_market_value,
        AVG(obligated_amount) as avg_contract_value,
        AVG(number_of_offers_received) as avg_competitors,
        MODE() WITHIN GROUP (ORDER BY set_aside_type) as common_setaside,
        COUNT(DISTINCT contractor_id) as unique_contractors
      FROM contracts
      WHERE agency_name = $1 
        AND naics_code = $2
        AND award_date >= CURRENT_DATE - INTERVAL '3 years'
    `, [agency, naicsCode]);
    
    const row = result.rows[0];
    const avgCompetitors = parseFloat(row.avg_competitors) || 0;
    
    let competitionLevel: 'low' | 'medium' | 'high' = 'medium';
    if (avgCompetitors < 3) {
      competitionLevel = 'low';
    } else if (avgCompetitors > 7) {
      competitionLevel = 'high';
    }
    
    return {
      totalMarketValue: parseFloat(row.total_market_value) || 0,
      averageContractValue: parseFloat(row.avg_contract_value) || 0,
      competitionLevel,
      averageCompetitors: avgCompetitors,
      setAsidePreference: row.common_setaside,
    };
  }
  
  private async findExpiringContracts(agency: string, naicsCode: string): Promise<any[]> {
    const result = await this.db.query(`
      SELECT 
        c.contract_id,
        o.name as contractor_name,
        c.current_completion_date as expiry_date,
        c.current_value as value,
        (c.current_completion_date - CURRENT_DATE) as days_until_expiry
      FROM contracts c
      LEFT JOIN organizations o ON c.contractor_id = o.id
      WHERE c.agency_name = $1 
        AND c.naics_code = $2
        AND c.current_completion_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '18 months'
      ORDER BY c.current_completion_date ASC
      LIMIT 20
    `, [agency, naicsCode]);
    
    return result.rows.map(row => ({
      contractId: row.contract_id,
      contractorName: row.contractor_name,
      expiryDate: row.expiry_date,
      value: parseFloat(row.value) || 0,
      daysUntilExpiry: parseInt(row.days_until_expiry) || 0,
    }));
  }
  
  private async calculateSuccessFactors(agency: string, naicsCode: string): Promise<any> {
    const result = await this.db.query(`
      WITH winning_contracts AS (
        SELECT * FROM contracts
        WHERE agency_name = $1 
          AND naics_code = $2
          AND competed = true
          AND award_date >= CURRENT_DATE - INTERVAL '3 years'
      )
      SELECT 
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY obligated_amount) as median_price,
        AVG(EXTRACT(DAY FROM (completion_date - award_date))) as avg_duration,
        MODE() WITHIN GROUP (ORDER BY contract_type) as common_contract_type
      FROM winning_contracts
    `, [agency, naicsCode]);
    
    const row = result.rows[0];
    
    // Get common requirements from opportunity descriptions
    const reqResult = await this.db.query(`
      SELECT 
        unnest(keywords) as keyword,
        COUNT(*) as frequency
      FROM opportunities
      WHERE agency_name = $1
        AND $2 = ANY(naics_codes)
      GROUP BY keyword
      ORDER BY frequency DESC
      LIMIT 10
    `, [agency, naicsCode]);
    
    return {
      winningPrice: parseFloat(row.median_price) || 0,
      typicalDuration: parseInt(row.avg_duration) || 0,
      preferredContractType: row.common_contract_type || 'Unknown',
      keyRequirements: reqResult.rows.map(r => r.keyword),
    };
  }
  
  private async saveAnalysis(opportunityId: string, analysis: any): Promise<void> {
    await this.db.query(`
      INSERT INTO competitive_intelligence (
        opportunity_id,
        incumbent_contractor_id,
        incumbent_contract_id,
        incumbent_value,
        top_competitors,
        market_share_analysis,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (opportunity_id) DO UPDATE
      SET 
        top_competitors = EXCLUDED.top_competitors,
        market_share_analysis = EXCLUDED.market_share_analysis
    `, [
      opportunityId,
      analysis.incumbent?.contractorId,
      analysis.incumbent?.currentContractId,
      analysis.incumbent?.currentValue,
      JSON.stringify(analysis.topCompetitors),
      JSON.stringify(analysis.marketAnalysis),
    ]);
  }
  
  async predictRecompete(monthsAhead: number = 12): Promise<any[]> {
    const result = await this.db.query(`
      WITH expiring_contracts AS (
        SELECT 
          c.*,
          o.name as contractor_name,
          a.name as agency_name,
          (c.current_completion_date - CURRENT_DATE) as days_until_expiry
        FROM contracts c
        LEFT JOIN organizations o ON c.contractor_id = o.id
        LEFT JOIN organizations a ON c.agency_id = a.id
        WHERE c.current_completion_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '%s months'
          AND c.current_value > 100000
      ),
      recompete_probability AS (
        SELECT 
          ec.*,
          CASE 
            WHEN ec.days_until_expiry < 180 THEN 0.9
            WHEN ec.days_until_expiry < 365 THEN 0.7
            ELSE 0.5
          END as recompete_likelihood,
          CASE 
            WHEN ec.current_value > 10000000 THEN 'high'
            WHEN ec.current_value > 1000000 THEN 'medium'
            ELSE 'low'
          END as opportunity_size
        FROM expiring_contracts ec
      )
      SELECT * FROM recompete_probability
      ORDER BY recompete_likelihood DESC, current_value DESC
      LIMIT 100
    `, [monthsAhead]);
    
    return result.rows;
  }
  
  async generateCompetitorProfile(contractorId: string): Promise<any> {
    const profileResult = await this.db.query(`
      WITH contractor_stats AS (
        SELECT 
          o.name,
          o.identifier,
          COUNT(c.contract_id) as total_contracts,
          SUM(c.obligated_amount) as total_value,
          AVG(c.obligated_amount) as avg_contract_value,
          COUNT(DISTINCT c.agency_id) as agency_count,
          COUNT(DISTINCT c.naics_code) as naics_diversity,
          array_agg(DISTINCT c.naics_code) as naics_codes,
          array_agg(DISTINCT a.name) as agencies
        FROM contracts c
        LEFT JOIN organizations o ON c.contractor_id = o.id
        LEFT JOIN organizations a ON c.agency_id = a.id
        WHERE c.contractor_id = $1
          AND c.award_date >= CURRENT_DATE - INTERVAL '3 years'
        GROUP BY o.name, o.identifier
      ),
      win_rate AS (
        SELECT 
          COUNT(CASE WHEN competed = true THEN 1 END)::float / 
          NULLIF(COUNT(*), 0) as competition_win_rate
        FROM contracts
        WHERE contractor_id = $1
      ),
      recent_wins AS (
        SELECT 
          c.contract_id,
          c.award_date,
          c.obligated_amount,
          a.name as agency_name
        FROM contracts c
        LEFT JOIN organizations a ON c.agency_id = a.id
        WHERE c.contractor_id = $1
        ORDER BY c.award_date DESC
        LIMIT 10
      )
      SELECT 
        cs.*,
        wr.competition_win_rate,
        json_agg(rw.*) as recent_wins
      FROM contractor_stats cs
      CROSS JOIN win_rate wr
      CROSS JOIN recent_wins rw
      GROUP BY cs.name, cs.identifier, cs.total_contracts, cs.total_value, 
               cs.avg_contract_value, cs.agency_count, cs.naics_diversity,
               cs.naics_codes, cs.agencies, wr.competition_win_rate
    `, [contractorId]);
    
    return profileResult.rows[0];
  }
  
  async close(): Promise<void> {
    await this.db.end();
  }
}