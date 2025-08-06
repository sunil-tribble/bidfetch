interface GrantOpportunity {
    opportunityID: string;
    opportunityNumber: string;
    opportunityTitle: string;
    agencyCode: string;
    agencyName: string;
    postDate: string;
    closeDate: string;
    applicationsDueDate: string;
    archiveDate: string;
    description: string;
    costSharing: boolean;
    awardCeiling: number;
    awardFloor: number;
    estimatedTotalProgramFunding: number;
    expectedNumberOfAwards: number;
    cfdaNumbers: string[];
    eligibleApplicants: string[];
    fundingInstrumentType: string;
    categoryOfFundingActivity: string;
    additionalInformation: string;
    version: string;
    docType: string;
}
export declare class GrantsGovClient {
    private rateLimiter;
    private db;
    constructor();
    private getExtractUrl;
    downloadDailyExtract(date?: Date): Promise<Buffer>;
    extractZipContent(zipBuffer: Buffer): Promise<string>;
    parseXMLExtract(xmlContent: string): Promise<GrantOpportunity[]>;
    private parseArray;
    saveGrant(grant: GrantOpportunity): Promise<void>;
    syncGrants(): Promise<void>;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=index.d.ts.map