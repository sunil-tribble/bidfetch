import { Logger } from 'winston';
import { DatabaseService } from '../database/database-service';
import { PredictionResult, AnalyticsMetrics, CompetitiveIntelligence } from '../types/analytics-types';
/**
 * Advanced analytics service for predictive intelligence on government contracts
 * Provides competitive analysis, trend prediction, and opportunity scoring
 */
export declare class AnalyticsService {
    private logger;
    private databaseService;
    private modelService;
    private metricsCache;
    private cacheExpiry;
    constructor(logger: Logger, databaseService: DatabaseService);
    /**
     * Initialize machine learning models
     */
    private initializeModels;
    /**
     * Generate predictions for opportunities
     */
    generatePredictions(opportunityIds: string[]): Promise<PredictionResult[]>;
    /**
     * Predict probability of winning an opportunity
     */
    private predictAwardProbability;
    /**
     * Predict competition level (number of bidders)
     */
    private predictCompetitionLevel;
    /**
     * Predict actual contract value vs estimated
     */
    private predictContractValue;
    /**
     * Predict award timeline
     */
    private predictAwardTimeline;
    /**
     * Find similar opportunities for competitive intelligence
     */
    findSimilarOpportunities(opportunity: any, limit?: number): Promise<any[]>;
    /**
     * Generate competitive intelligence report
     */
    generateCompetitiveIntelligence(agencyId: string, naicsCode?: string, timeframe?: 'month' | 'quarter' | 'year'): Promise<CompetitiveIntelligence>;
    /**
     * Update analytics metrics
     */
    updateMetrics(entityType: string, entityIds: string[]): Promise<void>;
    /**
     * Get real-time analytics dashboard data
     */
    getDashboardMetrics(): Promise<AnalyticsMetrics>;
    /**
     * Extract features from opportunity for ML models
     */
    private extractOpportunityFeatures;
    /**
     * Calculate overall confidence score
     */
    private calculateOverallConfidence;
    /**
     * Check if cached data is still valid
     */
    private isValidCache;
    /**
     * Calculate days between two dates
     */
    private calculateResponseDays;
    private getHistoricalAwardData;
    private getHistoricalCompetitionData;
    private getHistoricalValueData;
    private getHistoricalTimelineData;
    private identifyProbabilityFactors;
    private calculateMetrics;
    private calculateMarketShare;
    private analyzeIncumbents;
    private analyzePricingTrends;
    private identifySuccessFactors;
    private predictUpcomingOpportunities;
    private getOpportunitiesByAgency;
    private getOpportunitiesByNAICS;
    private getValueDistribution;
    private getContractsByType;
    private getContractsByAgency;
    private getContractTimelineTrends;
    private calculatePredictionAccuracy;
    private getModelPerformanceMetrics;
    private calculateDataFreshness;
    private calculateProcessingRate;
    private calculateErrorRate;
    private getAPIUsageStats;
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=analytics-service.d.ts.map