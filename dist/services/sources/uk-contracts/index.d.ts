interface OCDSRelease {
    ocid: string;
    id: string;
    date: string;
    tag: string[];
    initiationType: string;
    tender: any;
    buyer: any;
    awards?: any[];
    contracts?: any[];
}
export declare class UKContractsClient {
    private axios;
    private rateLimiter;
    private db;
    private accessToken;
    private tokenExpiry;
    constructor();
    private getAccessToken;
    searchContracts(params?: {
        publishedFrom?: string;
        publishedTo?: string;
        minValue?: number;
        maxValue?: number;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<any>;
    fetchAllContracts(params?: {
        publishedFrom?: string;
        publishedTo?: string;
        maxRecords?: number;
    }): Promise<OCDSRelease[]>;
    private parseOCDSValue;
    saveContract(release: OCDSRelease): Promise<void>;
    syncContracts(params?: {
        publishedFrom?: string;
        publishedTo?: string;
    }): Promise<void>;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=index.d.ts.map