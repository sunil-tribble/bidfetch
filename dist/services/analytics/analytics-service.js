"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const ml_model_service_1 = require("./ml-model-service");
/**
 * Advanced analytics service for predictive intelligence on government contracts
 * Provides competitive analysis, trend prediction, and opportunity scoring
 */
class AnalyticsService {
    logger;
    databaseService;
    modelService;
    metricsCache = new Map();
    cacheExpiry = new Map();
    constructor(logger, databaseService) {
        this.logger = logger;
        this.databaseService = databaseService;
        this.modelService = new ml_model_service_1.MLModelService(logger);
        this.initializeModels();
    }
    /**
     * Initialize machine learning models
     */
    async initializeModels() {
        this.logger.info('Initializing ML models for analytics');
        await this.modelService.loadModels();
    }
    /**
     * Generate predictions for opportunities
     */
    async generatePredictions(opportunityIds) {
        this.logger.info(`Generating predictions for ${opportunityIds.length} opportunities`);
        const results = [];
        for (const opportunityId of opportunityIds) {
            try {
                const opportunity = await this.databaseService.getOpportunity(opportunityId);
                if (!opportunity)
                    continue;
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
                const prediction = {
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
            }
            catch (error) {
                this.logger.error(`Error generating prediction for opportunity ${opportunityId}:`, error);
            }
        }
        return results;
    }
    /**
     * Predict probability of winning an opportunity
     */
    async predictAwardProbability(opportunity) {
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
    async predictCompetitionLevel(opportunity) {
        const features = this.extractOpportunityFeatures(opportunity);
        const historicalCompetition = await this.getHistoricalCompetitionData(opportunity);
        const prediction = await this.modelService.predict('competition_level', {
            ...features,
            historicalCompetition
        });
        const expectedBidders = Math.round(prediction.score);
        let competitiveness = 'medium';
        if (expectedBidders <= 2)
            competitiveness = 'low';
        else if (expectedBidders >= 5)
            competitiveness = 'high';
        return {
            expectedBidders,
            competitiveness,
            confidence: prediction.confidence
        };
    }
    /**
     * Predict actual contract value vs estimated
     */
    async predictContractValue(opportunity) {
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
    async predictAwardTimeline(opportunity) {
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
    async findSimilarOpportunities(opportunity, limit = 10) {
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
    async generateCompetitiveIntelligence(agencyId, naicsCode, timeframe) {
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
    async updateMetrics(entityType, entityIds) {
        this.logger.info(`Updating metrics for ${entityIds.length} ${entityType} entities`);
        try {
            const metrics = await this.calculateMetrics(entityType, entityIds);
            await this.databaseService.storeMetrics(entityType, metrics);
            // Update cache
            const cacheKey = `${entityType}_metrics`;
            this.metricsCache.set(cacheKey, metrics);
            this.cacheExpiry.set(cacheKey, Date.now() + (15 * 60 * 1000)); // 15 minutes
        }
        catch (error) {
            this.logger.error(`Error updating metrics for ${entityType}:`, error);
        }
    }
    /**
     * Get real-time analytics dashboard data
     */
    async getDashboardMetrics() {
        const cacheKey = 'dashboard_metrics';
        // Check cache first
        if (this.isValidCache(cacheKey)) {
            return this.metricsCache.get(cacheKey);
        }
        // Calculate fresh metrics
        const metrics = {
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
    extractOpportunityFeatures(opportunity) {
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
    calculateOverallConfidence(predictions) {
        const confidences = predictions.map(p => p.confidence || 0);
        return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    }
    /**
     * Check if cached data is still valid
     */
    isValidCache(key) {
        const expiry = this.cacheExpiry.get(key);
        return expiry ? Date.now() < expiry : false;
    }
    /**
     * Calculate days between two dates
     */
    calculateResponseDays(postedDate, deadline) {
        const posted = new Date(postedDate);
        const due = new Date(deadline);
        return Math.ceil((due.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));
    }
    // Additional helper methods for specific analytics calculations...
    async getHistoricalAwardData(opportunity) {
        // Implementation for historical award analysis
        return {};
    }
    async getHistoricalCompetitionData(opportunity) {
        // Implementation for historical competition analysis
        return {};
    }
    async getHistoricalValueData(opportunity) {
        // Implementation for historical value analysis
        return {};
    }
    async getHistoricalTimelineData(opportunity) {
        // Implementation for historical timeline analysis
        return {};
    }
    identifyProbabilityFactors(features, featureImportance) {
        // Implementation for identifying key factors affecting award probability
        return [];
    }
    async calculateMetrics(entityType, entityIds) {
        // Implementation for calculating entity-specific metrics
        return {};
    }
    async calculateMarketShare(agencyId, naicsCode, timeframeDays) {
        // Implementation for market share analysis
        return {};
    }
    async analyzeIncumbents(agencyId, naicsCode, timeframeDays) {
        // Implementation for incumbent analysis
        return {};
    }
    async analyzePricingTrends(agencyId, naicsCode, timeframeDays) {
        // Implementation for pricing trend analysis
        return {};
    }
    async identifySuccessFactors(agencyId, naicsCode) {
        // Implementation for success factor identification
        return {};
    }
    async predictUpcomingOpportunities(agencyId, naicsCode) {
        // Implementation for predicting upcoming opportunities
        return {};
    }
    // Dashboard metric helper methods...
    async getOpportunitiesByAgency() { return []; }
    async getOpportunitiesByNAICS() { return []; }
    async getValueDistribution() { return []; }
    async getContractsByType() { return []; }
    async getContractsByAgency() { return []; }
    async getContractTimelineTrends() { return []; }
    async calculatePredictionAccuracy() { return 0; }
    async getModelPerformanceMetrics() { return {}; }
    async calculateDataFreshness() { return {}; }
    async calculateProcessingRate() { return 0; }
    async calculateErrorRate() { return 0; }
    async getAPIUsageStats() { return {}; }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        this.logger.info('Shutting down analytics service');
        await this.modelService.cleanup();
        this.metricsCache.clear();
        this.cacheExpiry.clear();
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analytics-service.js.map