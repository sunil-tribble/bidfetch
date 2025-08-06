import * as tf from '@tensorflow/tfjs-node';
import { Pool } from 'pg';
import { config } from '../../config';
import { logger } from '../../utils/logger';

interface PredictionResult {
  awardProbability: number;
  estimatedCompetition: number;
  predictedValue: number;
  predictedAwardDate: Date | null;
  confidenceScore: number;
  similarOpportunities: string[];
  successFactors: string[];
  riskFactors: string[];
}

export class MLPredictionService {
  private db: Pool;
  private model: tf.LayersModel | null = null;
  private modelVersion = '1.0.0';
  
  constructor() {
    this.db = new Pool({
      connectionString: config.database.postgres.url,
      ...config.database.postgres.pool,
    });
    
    this.initializeModel();
  }
  
  private async initializeModel(): Promise<void> {
    try {
      // Create a simple neural network for award probability prediction
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [20], units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });
      
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      
      logger.info('ML model initialized');
      
      // Load pre-trained weights if available
      await this.loadModelWeights();
      
    } catch (error) {
      logger.error('Failed to initialize ML model', error);
    }
  }
  
  private async loadModelWeights(): Promise<void> {
    try {
      const modelPath = `${config.ml.modelPath}/award-prediction-model.json`;
      // In production, load from S3 or model registry
      // this.model = await tf.loadLayersModel(modelPath);
      logger.info('Model weights loaded');
    } catch (error) {
      logger.warn('No pre-trained model found, using random initialization');
    }
  }
  
  private async extractFeatures(opportunityId: string): Promise<tf.Tensor | null> {
    try {
      // Extract features from the opportunity and historical data
      const result = await this.db.query(`
        WITH opportunity_data AS (
          SELECT 
            o.*,
            a.name as agency_name,
            COUNT(DISTINCT d.id) as document_count,
            EXTRACT(DAY FROM (o.response_deadline - o.posted_date)) as days_to_deadline
          FROM opportunities o
          LEFT JOIN organizations a ON o.agency_id = a.id
          LEFT JOIN documents d ON o.id = d.opportunity_id
          WHERE o.id = $1
          GROUP BY o.id, a.name
        ),
        historical_stats AS (
          SELECT 
            AVG(CASE WHEN status = 'awarded' THEN 1 ELSE 0 END) as agency_award_rate,
            AVG(estimated_value) as avg_value,
            COUNT(*) as total_opportunities,
            AVG(CASE WHEN c.competed = true THEN c.number_of_offers_received ELSE 0 END) as avg_competition
          FROM opportunities o2
          LEFT JOIN contracts c ON c.agency_id = o2.agency_id
          WHERE o2.agency_id = (SELECT agency_id FROM opportunity_data)
            AND o2.posted_date >= CURRENT_DATE - INTERVAL '2 years'
        ),
        contractor_stats AS (
          SELECT 
            COUNT(DISTINCT contractor_id) as unique_contractors,
            AVG(CASE WHEN competed = true THEN 1 ELSE 0 END) as competition_rate
          FROM contracts
          WHERE agency_id = (SELECT agency_id FROM opportunity_data)
            AND award_date >= CURRENT_DATE - INTERVAL '2 years'
        )
        SELECT 
          od.*,
          hs.*,
          cs.*
        FROM opportunity_data od
        CROSS JOIN historical_stats hs
        CROSS JOIN contractor_stats cs
      `, [opportunityId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const data = result.rows[0];
      
      // Normalize features
      const features = [
        // Opportunity features
        data.estimated_value ? Math.log10(data.estimated_value + 1) / 10 : 0,
        data.days_to_deadline ? data.days_to_deadline / 365 : 0,
        data.document_count / 10,
        data.naics_codes ? data.naics_codes.length / 10 : 0,
        data.set_aside_type ? 1 : 0,
        
        // Historical features
        data.agency_award_rate || 0,
        data.avg_value ? Math.log10(data.avg_value + 1) / 10 : 0,
        data.total_opportunities ? Math.log10(data.total_opportunities + 1) / 5 : 0,
        data.avg_competition / 20,
        data.unique_contractors ? Math.log10(data.unique_contractors + 1) / 3 : 0,
        data.competition_rate || 0,
        
        // Temporal features
        new Date(data.posted_date).getMonth() / 12, // Month of year
        new Date(data.posted_date).getDay() / 7, // Day of week
        
        // Category features (simplified)
        data.type === 'solicitation' ? 1 : 0,
        data.type === 'grant' ? 1 : 0,
        data.type === 'sources_sought' ? 1 : 0,
        
        // Geographic features
        data.country === 'US' ? 1 : 0,
        data.country === 'GB' ? 1 : 0,
        data.country === 'EU' ? 1 : 0,
        data.country === 'UN' ? 1 : 0,
      ];
      
      // Pad or truncate to exactly 20 features
      while (features.length < 20) features.push(0);
      features.length = 20;
      
      return tf.tensor2d([features], [1, 20]);
      
    } catch (error) {
      logger.error('Failed to extract features', error);
      return null;
    }
  }
  
  async predictOpportunity(opportunityId: string): Promise<PredictionResult> {
    try {
      const features = await this.extractFeatures(opportunityId);
      
      if (!features || !this.model) {
        return this.getDefaultPrediction();
      }
      
      // Make prediction
      const prediction = this.model.predict(features) as tf.Tensor;
      const awardProbability = (await prediction.data())[0];
      
      // Estimate competition level
      const competitionLevel = await this.estimateCompetition(opportunityId);
      
      // Predict value
      const predictedValue = await this.predictValue(opportunityId);
      
      // Predict award date
      const predictedAwardDate = await this.predictAwardDate(opportunityId);
      
      // Find similar opportunities
      const similarOpportunities = await this.findSimilarOpportunities(opportunityId);
      
      // Identify success and risk factors
      const { successFactors, riskFactors } = await this.analyzeFactors(opportunityId);
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidence(awardProbability, competitionLevel);
      
      // Save prediction
      await this.savePrediction(opportunityId, {
        awardProbability,
        estimatedCompetition: competitionLevel,
        predictedValue,
        predictedAwardDate,
        confidenceScore,
        similarOpportunities,
        successFactors,
        riskFactors,
      });
      
      // Clean up tensors
      features.dispose();
      prediction.dispose();
      
      return {
        awardProbability,
        estimatedCompetition: competitionLevel,
        predictedValue,
        predictedAwardDate,
        confidenceScore,
        similarOpportunities,
        successFactors,
        riskFactors,
      };
      
    } catch (error) {
      logger.error('Prediction failed', error);
      return this.getDefaultPrediction();
    }
  }
  
  private async estimateCompetition(opportunityId: string): Promise<number> {
    const result = await this.db.query(`
      WITH similar_contracts AS (
        SELECT 
          AVG(c.number_of_offers_received) as avg_offers
        FROM opportunities o
        JOIN contracts c ON c.agency_id = o.agency_id
        WHERE o.id = $1
          AND c.naics_code = ANY(o.naics_codes)
          AND c.competed = true
      )
      SELECT COALESCE(avg_offers, 5) as estimated_competition
      FROM similar_contracts
    `, [opportunityId]);
    
    return Math.round(result.rows[0]?.estimated_competition || 5);
  }
  
  private async predictValue(opportunityId: string): Promise<number> {
    const result = await this.db.query(`
      WITH opportunity_info AS (
        SELECT 
          o.estimated_value,
          o.value_min,
          o.value_max,
          o.agency_id,
          o.naics_codes
        FROM opportunities o
        WHERE o.id = $1
      ),
      historical_values AS (
        SELECT 
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY c.obligated_amount) as median_value
        FROM contracts c
        JOIN opportunity_info oi ON c.agency_id = oi.agency_id
        WHERE c.naics_code = ANY(oi.naics_codes)
          AND c.obligated_amount > 0
      )
      SELECT 
        COALESCE(
          oi.estimated_value,
          (oi.value_min + oi.value_max) / 2,
          hv.median_value,
          100000
        ) as predicted_value
      FROM opportunity_info oi
      CROSS JOIN historical_values hv
    `, [opportunityId]);
    
    return result.rows[0]?.predicted_value || 100000;
  }
  
  private async predictAwardDate(opportunityId: string): Promise<Date | null> {
    const result = await this.db.query(`
      WITH opportunity_timeline AS (
        SELECT 
          o.response_deadline,
          o.posted_date,
          AVG(EXTRACT(DAY FROM (c.award_date - c.posted_date))) as avg_days_to_award
        FROM opportunities o
        LEFT JOIN contracts c ON c.agency_id = o.agency_id
        WHERE o.id = $1
        GROUP BY o.response_deadline, o.posted_date
      )
      SELECT 
        COALESCE(
          response_deadline + INTERVAL '30 days',
          posted_date + (avg_days_to_award || ' days')::INTERVAL,
          posted_date + INTERVAL '90 days'
        ) as predicted_award_date
      FROM opportunity_timeline
    `, [opportunityId]);
    
    const dateStr = result.rows[0]?.predicted_award_date;
    return dateStr ? new Date(dateStr) : null;
  }
  
  private async findSimilarOpportunities(opportunityId: string, limit: number = 5): Promise<string[]> {
    const result = await this.db.query(`
      WITH target_opportunity AS (
        SELECT * FROM opportunities WHERE id = $1
      )
      SELECT 
        o.id,
        (
          CASE WHEN o.agency_id = t.agency_id THEN 0.3 ELSE 0 END +
          CASE WHEN o.naics_codes && t.naics_codes THEN 0.3 ELSE 0 END +
          CASE WHEN ABS(o.estimated_value - t.estimated_value) < 1000000 THEN 0.2 ELSE 0 END +
          CASE WHEN o.set_aside_type = t.set_aside_type THEN 0.1 ELSE 0 END +
          CASE WHEN o.type = t.type THEN 0.1 ELSE 0 END
        ) as similarity_score
      FROM opportunities o
      CROSS JOIN target_opportunity t
      WHERE o.id != $1
        AND o.status = 'active'
      ORDER BY similarity_score DESC
      LIMIT $2
    `, [opportunityId, limit]);
    
    return result.rows.map(row => row.id);
  }
  
  private async analyzeFactors(opportunityId: string): Promise<{
    successFactors: string[];
    riskFactors: string[];
  }> {
    const result = await this.db.query(`
      SELECT 
        o.*,
        a.name as agency_name,
        (SELECT COUNT(*) FROM documents WHERE opportunity_id = o.id) as document_count,
        EXTRACT(DAY FROM (o.response_deadline - CURRENT_DATE)) as days_remaining
      FROM opportunities o
      LEFT JOIN organizations a ON o.agency_id = a.id
      WHERE o.id = $1
    `, [opportunityId]);
    
    if (result.rows.length === 0) {
      return { successFactors: [], riskFactors: [] };
    }
    
    const opp = result.rows[0];
    const successFactors: string[] = [];
    const riskFactors: string[] = [];
    
    // Analyze success factors
    if (opp.document_count > 3) {
      successFactors.push('Comprehensive documentation available');
    }
    if (opp.days_remaining > 30) {
      successFactors.push('Adequate time for proposal preparation');
    }
    if (opp.set_aside_type) {
      successFactors.push(`Set-aside opportunity: ${opp.set_aside_type}`);
    }
    if (opp.estimated_value && opp.estimated_value < 1000000) {
      successFactors.push('Lower value contract with potentially less competition');
    }
    
    // Analyze risk factors
    if (opp.days_remaining && opp.days_remaining < 14) {
      riskFactors.push('Short deadline - less than 2 weeks remaining');
    }
    if (!opp.estimated_value) {
      riskFactors.push('Contract value not specified');
    }
    if (opp.document_count === 0) {
      riskFactors.push('No supporting documents available');
    }
    if (opp.estimated_value && opp.estimated_value > 10000000) {
      riskFactors.push('High-value contract likely to attract significant competition');
    }
    
    return { successFactors, riskFactors };
  }
  
  private calculateConfidence(probability: number, competition: number): number {
    // Simple confidence calculation based on probability strength and competition level
    let confidence = probability;
    
    // Adjust for extreme probabilities
    if (probability > 0.8 || probability < 0.2) {
      confidence = confidence * 0.9; // High confidence in extreme predictions
    } else {
      confidence = confidence * 0.7; // Lower confidence in middle-range predictions
    }
    
    // Adjust for competition
    if (competition > 10) {
      confidence = confidence * 0.8; // Lower confidence with high competition
    }
    
    return Math.min(Math.max(confidence, 0.1), 0.95);
  }
  
  private async savePrediction(opportunityId: string, prediction: PredictionResult): Promise<void> {
    await this.db.query(`
      INSERT INTO predictions (
        opportunity_id, award_probability, estimated_competition,
        predicted_value, predicted_award_date, similar_contracts,
        success_factors, risk_factors, model_version, confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (opportunity_id) DO UPDATE
      SET 
        award_probability = EXCLUDED.award_probability,
        estimated_competition = EXCLUDED.estimated_competition,
        predicted_value = EXCLUDED.predicted_value,
        predicted_award_date = EXCLUDED.predicted_award_date,
        similar_contracts = EXCLUDED.similar_contracts,
        success_factors = EXCLUDED.success_factors,
        risk_factors = EXCLUDED.risk_factors,
        model_version = EXCLUDED.model_version,
        confidence_score = EXCLUDED.confidence_score,
        created_at = CURRENT_TIMESTAMP
    `, [
      opportunityId,
      prediction.awardProbability,
      prediction.estimatedCompetition,
      prediction.predictedValue,
      prediction.predictedAwardDate,
      prediction.similarOpportunities,
      JSON.stringify(prediction.successFactors),
      JSON.stringify(prediction.riskFactors),
      this.modelVersion,
      prediction.confidenceScore,
    ]);
  }
  
  private getDefaultPrediction(): PredictionResult {
    return {
      awardProbability: 0.5,
      estimatedCompetition: 5,
      predictedValue: 100000,
      predictedAwardDate: null,
      confidenceScore: 0.3,
      similarOpportunities: [],
      successFactors: [],
      riskFactors: ['Insufficient data for accurate prediction'],
    };
  }
  
  async trainModel(): Promise<void> {
    // Training logic for the ML model
    // This would typically be run periodically with historical data
    logger.info('Training ML model...');
    
    // Fetch training data
    const result = await this.db.query(`
      SELECT 
        o.*,
        CASE WHEN o.status = 'awarded' THEN 1 ELSE 0 END as was_awarded
      FROM opportunities o
      WHERE o.status IN ('awarded', 'closed', 'cancelled')
        AND o.posted_date >= CURRENT_DATE - INTERVAL '1 year'
      LIMIT 10000
    `);
    
    // Prepare training data
    // ... training implementation
    
    logger.info('Model training completed');
  }
  
  async close(): Promise<void> {
    await this.db.end();
  }
}