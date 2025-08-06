import { Logger } from 'winston';
import { DatabaseService } from '../database/database-service';
import { MLModelService } from './ml-model-service';
import { PredictionResult, AnalyticsMetrics, CompetitiveIntelligence } from '../types/analytics-types';

/**
 * Advanced analytics service for predictive intelligence on government contracts
 * Provides competitive analysis, trend prediction, and opportunity scoring
 */
export class AnalyticsService {
  private modelService: MLModelService;
  private metricsCache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();

  constructor(
    private logger: Logger,
    private databaseService: DatabaseService
  ) {
    this.modelService = new MLModelService(logger);
    this.initializeModels();
  }

  /**
   * Initialize machine learning models
   */
  private async initializeModels(): Promise<void> {
    this.logger.info('Initializing ML models for analytics');
    await this.modelService.loadModels();
  }

  /**
   * Generate predictions for opportunities
   */
  async generatePredictions(opportunityIds: string[]): Promise<PredictionResult[]> {
    this.logger.info(`Generating predictions for ${opportunityIds.length} opportunities`);
    
    const results: PredictionResult[] = [];
    
    for (const opportunityId of opportunityIds) {
      try {
        const opportunity = await this.databaseService.getOpportunity(opportunityId);
        if (!opportunity) continue;

        // Award probability prediction
        const awardProbability = await this.predictAwardProbability(opportunity);
        
        // Competition level prediction
        const competitionLevel = await this.predictCompetitionLevel(opportunity);
        
        // Contract value prediction
        const valueEstimate = await this.predictContractValue(opportunity);
        
        // Timeline prediction
        const timeline = await this.predictAwardTimeline(opportunity);
        
        // Similar opportunities
        const similarOpportunities = await this.findSimilarOpportunities(opportunity);

        const prediction: PredictionResult = {
          opportunityId,
          predictions: {
            awardProbability,
            competitionLevel,
            valueEstimate,
            timeline,
            similarOpportunities: similarOpportunities.slice(0, 5)
          },
          confidence: this.calculateOverallConfidence([
            awardProbability,
            competitionLevel,
            valueEstimate,
            timeline
          ]),
          generatedAt: new Date().toISOString(),
          modelVersion: this.modelService.getModelVersion()
        };

        // Store prediction in database
        await this.databaseService.storePrediction(prediction);
        results.push(prediction);

      } catch (error) {
        this.logger.error(`Error generating prediction for opportunity ${opportunityId}:`, error);
      }
    }

    return results;
  }

  /**
   * Predict probability of winning an opportunity
   */
  private async predictAwardProbability(opportunity: any): Promise<{
    probability: number;
    confidence: number;
    factors: Array<{factor: string, impact: number, description: string}>;
  }> {
    // Feature extraction
    const features = this.extractOpportunityFeatures(opportunity);
    
    // Historical analysis
    const historicalData = await this.getHistoricalAwardData(opportunity);
    
    // ML model prediction
    const prediction = await this.modelService.predict('award_probability', {
      ...features,
      historicalData
    });

    return {
      probability: prediction.score,
      confidence: prediction.confidence,
      factors: this.identifyProbabilityFactors(features, prediction.featureImportance)
    };
  }

  /**
   * Predict competition level (number of bidders)
   */
  private async predictCompetitionLevel(opportunity: any): Promise<{
    expectedBidders: number;
    competitiveness: 'low' | 'medium' | 'high';
    confidence: number;
  }> {
    const features = this.extractOpportunityFeatures(opportunity);
    const historicalCompetition = await this.getHistoricalCompetitionData(opportunity);
    
    const prediction = await this.modelService.predict('competition_level', {
      ...features,
      historicalCompetition
    });

    const expectedBidders = Math.round(prediction.score);
    let competitiveness: 'low' | 'medium' | 'high' = 'medium';
    
    if (expectedBidders <= 2) competitiveness = 'low';
    else if (expectedBidders >= 5) competitiveness = 'high';

    return {
      expectedBidders,
      competitiveness,
      confidence: prediction.confidence
    };
  }

  /**
   * Predict actual contract value vs estimated
   */
  private async predictContractValue(opportunity: any): Promise<{
    predictedValue: number;
    range: {min: number, max: number};
    confidence: number;
  }> {
    const features = this.extractOpportunityFeatures(opportunity);
    const historicalValues = await this.getHistoricalValueData(opportunity);
    
    const prediction = await this.modelService.predict('contract_value', {
      ...features,
      historicalValues,
      estimatedValue: opportunity.estimated_value_max || opportunity.estimated_value_min
    });

    return {
      predictedValue: prediction.score,
      range: {
        min: prediction.score * 0.8,
        max: prediction.score * 1.2
      },
      confidence: prediction.confidence
    };
  }

  /**
   * Predict award timeline
   */
  private async predictAwardTimeline(opportunity: any): Promise<{
    expectedAwardDate: string;
    daysFromDeadline: number;
    confidence: number;
  }> {
    const features = this.extractOpportunityFeatures(opportunity);
    const historicalTimelines = await this.getHistoricalTimelineData(opportunity);
    
    const prediction = await this.modelService.predict('award_timeline', {
      ...features,
      historicalTimelines,
      responseDeadline: opportunity.response_deadline
    });

    const daysFromDeadline = Math.round(prediction.score);
    const expectedAwardDate = new Date(opportunity.response_deadline);
    expectedAwardDate.setDate(expectedAwardDate.getDate() + daysFromDeadline);

    return {
      expectedAwardDate: expectedAwardDate.toISOString(),
      daysFromDeadline,
      confidence: prediction.confidence
    };
  }

  /**
   * Find similar opportunities for competitive intelligence
   */
  async findSimilarOpportunities(opportunity: any, limit: number = 10): Promise<any[]> {
    // Use vector similarity search on opportunity descriptions
    const query = `
      SELECT o.*, 
             ts_rank(search_vector, plainto_tsquery($1)) as relevance_score,
             similarity(o.title, $2) as title_similarity
      FROM opportunities o
      WHERE o.id != $3
        AND o.agency_id = $4
        AND search_vector @@ plainto_tsquery($1)
      ORDER BY relevance_score DESC, title_similarity DESC
      LIMIT $5
    `;

    const params = [
      opportunity.description || opportunity.title,
      opportunity.title,
      opportunity.id,
      opportunity.agency_id,
      limit
    ];

    return await this.databaseService.query(query, params);
  }

  /**
   * Generate competitive intelligence report
   */
  async generateCompetitiveIntelligence(
    agencyId: string,
    naicsCode?: string,
    timeframe?: 'month' | 'quarter' | 'year'
  ): Promise<CompetitiveIntelligence> {
    const timeframeDays = {
      month: 30,
      quarter: 90,
      year: 365
    }[timeframe || 'year'];

    // Market share analysis
    const marketShare = await this.calculateMarketShare(agencyId, naicsCode, timeframeDays);
    
    // Incumbent analysis
    const incumbents = await this.analyzeIncumbents(agencyId, naicsCode, timeframeDays);
    
    // Pricing trends
    const pricingTrends = await this.analyzePricingTrends(agencyId, naicsCode, timeframeDays);
    
    // Success factors
    const successFactors = await this.identifySuccessFactors(agencyId, naicsCode);
    
    // Upcoming opportunities
    const upcomingOpportunities = await this.predictUpcomingOpportunities(agencyId, naicsCode);

    return {
      agencyId,
      naicsCode,
      timeframe: timeframe || 'year',
      marketShare,
      incumbents,
      pricingTrends,
      successFactors,
      upcomingOpportunities,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Update analytics metrics
   */
  async updateMetrics(entityType: string, entityIds: string[]): Promise<void> {
    this.logger.info(`Updating metrics for ${entityIds.length} ${entityType} entities`);

    try {
      const metrics = await this.calculateMetrics(entityType, entityIds);
      await this.databaseService.storeMetrics(entityType, metrics);
      
      // Update cache
      const cacheKey = `${entityType}_metrics`;
      this.metricsCache.set(cacheKey, metrics);
      this.cacheExpiry.set(cacheKey, Date.now() + (15 * 60 * 1000)); // 15 minutes

    } catch (error) {
      this.logger.error(`Error updating metrics for ${entityType}:`, error);
    }
  }

  /**
   * Get real-time analytics dashboard data
   */
  async getDashboardMetrics(): Promise<AnalyticsMetrics> {
    const cacheKey = 'dashboard_metrics';
    
    // Check cache first
    if (this.isValidCache(cacheKey)) {
      return this.metricsCache.get(cacheKey);
    }

    // Calculate fresh metrics
    const metrics: AnalyticsMetrics = {
      opportunitiesMetrics: {
        total: await this.databaseService.countOpportunities(),
        active: await this.databaseService.countActiveOpportunities(),
        closing_soon: await this.databaseService.countOpportunitiesClosingSoon(7),
        high_value: await this.databaseService.countHighValueOpportunities(1000000),
        by_agency: await this.getOpportunitiesByAgency(),
        by_naics: await this.getOpportunitiesByNAICS(),
        value_distribution: await this.getValueDistribution()
      },
      
      contractsMetrics: {
        total: await this.databaseService.countContracts(),
        total_value: await this.databaseService.getTotalContractValue(),
        average_value: await this.databaseService.getAverageContractValue(),
        by_type: await this.getContractsByType(),
        by_agency: await this.getContractsByAgency(),
        timeline_trends: await this.getContractTimelineTrends()
      },

      predictionMetrics: {
        accuracy_rate: await this.calculatePredictionAccuracy(),
        total_predictions: await this.databaseService.countPredictions(),
        high_confidence: await this.databaseService.countHighConfidencePredictions(0.8),
        model_performance: await this.getModelPerformanceMetrics()
      },

      systemMetrics: {
        data_freshness: await this.calculateDataFreshness(),
        processing_rate: await this.calculateProcessingRate(),
        error_rate: await this.calculateErrorRate(),
        api_usage: await this.getAPIUsageStats()
      },

      generatedAt: new Date().toISOString()
    };

    // Cache the results
    this.metricsCache.set(cacheKey, metrics);
    this.cacheExpiry.set(cacheKey, Date.now() + (5 * 60 * 1000)); // 5 minutes

    return metrics;
  }

  /**
   * Extract features from opportunity for ML models
   */
  private extractOpportunityFeatures(opportunity: any): Record<string, any> {
    return {
      // Basic features
      agency_id: opportunity.agency_id,
      naics_code: opportunity.naics_codes?.[0],
      psc_code: opportunity.psc_codes?.[0],
      contract_type: opportunity.contract_type,
      set_aside_type: opportunity.set_aside_type,
      
      // Value features
      estimated_value: opportunity.estimated_value_max || opportunity.estimated_value_min || 0,
      value_range: (opportunity.estimated_value_max || 0) - (opportunity.estimated_value_min || 0),
      
      // Time features
      response_days: this.calculateResponseDays(opportunity.posted_date, opportunity.response_deadline),
      posting_day_of_week: new Date(opportunity.posted_date).getDay(),
      posting_month: new Date(opportunity.posted_date).getMonth() + 1,
      
      // Text features
      title_length: opportunity.title?.length || 0,
      description_length: opportunity.description?.length || 0,
      has_attachments: (opportunity.documents?.length || 0) > 0,
      
      // Classification features
      classification_complexity: opportunity.naics_codes?.length || 0,
      
      // Location features
      place_of_performance_state: opportunity.place_of_performance?.state,
      
      // Competition features
      competition_type: opportunity.competition_type
    };
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(predictions: any[]): number {
    const confidences = predictions.map(p => p.confidence || 0);
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  /**
   * Check if cached data is still valid
   */
  private isValidCache(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Calculate days between two dates
   */
  private calculateResponseDays(postedDate: string, deadline: string): number {
    const posted = new Date(postedDate);
    const due = new Date(deadline);
    return Math.ceil((due.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Additional helper methods for specific analytics calculations...
  private async getHistoricalAwardData(opportunity: any): Promise<any> {
    // Implementation for historical award analysis
    return {};
  }

  private async getHistoricalCompetitionData(opportunity: any): Promise<any> {
    // Implementation for historical competition analysis
    return {};
  }

  private async getHistoricalValueData(opportunity: any): Promise<any> {
    // Implementation for historical value analysis
    return {};
  }

  private async getHistoricalTimelineData(opportunity: any): Promise<any> {
    // Implementation for historical timeline analysis
    return {};
  }

  private identifyProbabilityFactors(features: any, featureImportance: any): Array<{factor: string, impact: number, description: string}> {
    // Implementation for identifying key factors affecting award probability
    return [];
  }

  private async calculateMetrics(entityType: string, entityIds: string[]): Promise<any> {
    // Implementation for calculating entity-specific metrics
    return {};
  }

  private async calculateMarketShare(agencyId: string, naicsCode?: string, timeframeDays?: number): Promise<any> {
    // Implementation for market share analysis
    return {};
  }

  private async analyzeIncumbents(agencyId: string, naicsCode?: string, timeframeDays?: number): Promise<any> {
    // Implementation for incumbent analysis
    return {};
  }

  private async analyzePricingTrends(agencyId: string, naicsCode?: string, timeframeDays?: number): Promise<any> {
    // Implementation for pricing trend analysis
    return {};
  }

  private async identifySuccessFactors(agencyId: string, naicsCode?: string): Promise<any> {
    // Implementation for success factor identification
    return {};
  }

  private async predictUpcomingOpportunities(agencyId: string, naicsCode?: string): Promise<any> {
    // Implementation for predicting upcoming opportunities
    return {};
  }

  // Dashboard metric helper methods...
  private async getOpportunitiesByAgency(): Promise<any[]> { return []; }
  private async getOpportunitiesByNAICS(): Promise<any[]> { return []; }
  private async getValueDistribution(): Promise<any[]> { return []; }
  private async getContractsByType(): Promise<any[]> { return []; }
  private async getContractsByAgency(): Promise<any[]> { return []; }
  private async getContractTimelineTrends(): Promise<any[]> { return []; }
  private async calculatePredictionAccuracy(): Promise<number> { return 0; }
  private async getModelPerformanceMetrics(): Promise<any> { return {}; }
  private async calculateDataFreshness(): Promise<any> { return {}; }
  private async calculateProcessingRate(): Promise<number> { return 0; }
  private async calculateErrorRate(): Promise<number> { return 0; }
  private async getAPIUsageStats(): Promise<any> { return {}; }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down analytics service');
    await this.modelService.cleanup();
    this.metricsCache.clear();
    this.cacheExpiry.clear();
  }
}