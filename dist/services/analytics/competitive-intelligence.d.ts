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
export declare class CompetitiveIntelligenceEngine {
    private db;
    constructor();
    analyzeOpportunity(opportunityId: string): Promise<CompetitiveAnalysis>;
    private findIncumbent;
    private getTopCompetitors;
    private analyzeMarket;
    private findExpiringContracts;
    private calculateSuccessFactors;
    private saveAnalysis;
    predictRecompete(monthsAhead?: number): Promise<any[]>;
    generateCompetitorProfile(contractorId: string): Promise<any>;
    close(): Promise<void>;
}
//# sourceMappingURL=competitive-intelligence.d.ts.map