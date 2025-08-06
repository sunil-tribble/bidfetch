interface TEDNotice {
    ND: string;
    TI: string;
    DS: string;
    PD: string;
    DD: string;
    AC: string;
    TY: string;
    NC: string;
    PR: string;
    TD: string;
    RP: string;
    TV: string;
    CY: string;
    AA: string;
    CPV: string[];
    URI: string;
    LG: string;
}
interface TEDSearchResponse {
    notices: TEDNotice[];
    total: number;
    page: number;
    pageSize: number;
}
export declare class TEDEuropaClient {
    private axios;
    private rateLimiter;
    private db;
    constructor();
    private buildSearchQuery;
    searchNotices(params?: {
        fromDate?: string;
        toDate?: string;
        countries?: string[];
        cpvCodes?: string[];
        minValue?: number;
        maxValue?: number;
        page?: number;
        pageSize?: number;
    }): Promise<TEDSearchResponse>;
    fetchNoticeDetails(noticeId: string): Promise<any>;
    fetchAllNotices(params?: {
        fromDate?: string;
        toDate?: string;
        countries?: string[];
        maxRecords?: number;
    }): Promise<TEDNotice[]>;
    private parseCPVCodes;
    private parseValue;
    private mapCountryToISO;
    saveNotice(notice: TEDNotice): Promise<void>;
    private mapContractType;
    syncNotices(params?: {
        fromDate?: string;
        toDate?: string;
        countries?: string[];
    }): Promise<void>;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=index.d.ts.map