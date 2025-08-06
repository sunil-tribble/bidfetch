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
export declare class MLPredictionService {
    private db;
    private model;
    private modelVersion;
    constructor();
    private initializeModel;
    private loadModelWeights;
    private extractFeatures;
    predictOpportunity(opportunityId: string): Promise<PredictionResult>;
    private estimateCompetition;
    private predictValue;
    private predictAwardDate;
    private findSimilarOpportunities;
    private analyzeFactors;
    private calculateConfidence;
    private savePrediction;
    private getDefaultPrediction;
    trainModel(): Promise<void>;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=ml-predictions.d.ts.map