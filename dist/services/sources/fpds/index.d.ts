interface FPDSContract {
    id: string;
    title: string;
    updated: string;
    content: {
        contractId: string;
        parentAwardId?: string;
        agencyId: string;
        agencyName: string;
        contractorName: string;
        contractorDuns?: string;
        awardDate: string;
        effectiveDate?: string;
        completionDate?: string;
        currentCompletionDate?: string;
        obligatedAmount: string;
        baseValue?: string;
        currentValue?: string;
        naicsCode?: string;
        pscCode?: string;
        contractType?: string;
        competed?: boolean;
        numberOfOffersReceived?: number;
        placeOfPerformance?: {
            city?: string;
            state?: string;
            country?: string;
            zipCode?: string;
        };
        description?: string;
    };
}
export declare class FPDSClient {
    private rateLimiter;
    private db;
    constructor();
    private buildFeedUrl;
    fetchContracts(params?: {
        agency?: string;
        dateFrom?: string;
        dateTo?: string;
        naics?: string;
        offset?: number;
    }): Promise<FPDSContract[]>;
    private parseEntry;
    fetchAllContracts(params?: {
        agency?: string;
        dateFrom?: string;
        dateTo?: string;
        naics?: string;
        maxRecords?: number;
    }): Promise<FPDSContract[]>;
    saveContract(contract: FPDSContract): Promise<void>;
    analyzeContractExpiring(monthsAhead?: number): Promise<any[]>;
    findIncumbent(agency: string, naicsCode: string): Promise<any>;
    syncContracts(params?: {
        dateFrom?: string;
        dateTo?: string;
        agency?: string;
    }): Promise<void>;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=index.d.ts.map