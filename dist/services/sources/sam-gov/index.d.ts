export interface SamOpportunity {
    noticeId: string;
    title: string;
    solicitationNumber: string;
    department: string;
    subTier: string;
    office: string;
    postedDate: string;
    type: string;
    typeOfSetAsideDescription: string;
    typeOfSetAside: string;
    responseDeadLine: string;
    naicsCode: string;
    naicsCodes: string[];
    classificationCode: string;
    active: string;
    award?: {
        date: string;
        number: string;
        amount: string;
    };
    pointOfContact: Array<{
        type: string;
        email: string;
        phone: string;
        title: string;
        fullName: string;
    }>;
    description: string;
    organizationType: string;
    additionalInfoLink: string;
    uiLink: string;
    links: Array<{
        rel: string;
        href: string;
    }>;
    resourceLinks: string[];
}
export interface SamApiResponse {
    totalRecords: number;
    limit: number;
    offset: number;
    opportunitiesData: SamOpportunity[];
    links: Array<{
        rel: string;
        href: string;
    }>;
}
export declare class SamGovClient {
    private axios;
    private rateLimiter;
    private db;
    private s3Client;
    private lastModifiedDate;
    constructor();
    private loadLastSyncDate;
    fetchOpportunities(params?: {
        modifiedFrom?: string;
        modifiedTo?: string;
        postedFrom?: string;
        postedTo?: string;
        limit?: number;
        offset?: number;
    }): Promise<SamApiResponse>;
    fetchAllOpportunities(): Promise<SamOpportunity[]>;
    downloadDocument(url: string, opportunityId: string): Promise<string | null>;
    saveOpportunity(opportunity: SamOpportunity): Promise<void>;
    syncOpportunities(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map