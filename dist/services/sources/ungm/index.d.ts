interface UNGMNotice {
    referenceNo: string;
    title: string;
    organization: string;
    publishedDate: string;
    deadline: string;
    type: string;
    category: string;
    description: string;
    documentUrl?: string;
    value?: string;
    location?: string;
    unspscCodes?: string[];
}
export declare class UNGMClient {
    private rateLimiter;
    private db;
    private baseUrl;
    constructor();
    fetchNoticesList(params?: {
        page?: number;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<UNGMNotice[]>;
    fetchNoticeDetails(noticeUrl: string): Promise<UNGMNotice | null>;
    fetchAllNotices(params?: {
        dateFrom?: string;
        dateTo?: string;
        maxPages?: number;
    }): Promise<UNGMNotice[]>;
    private parseDate;
    private parseValue;
    saveNotice(notice: UNGMNotice): Promise<void>;
    syncNotices(params?: {
        dateFrom?: string;
        dateTo?: string;
    }): Promise<void>;
    downloadDataExport(): Promise<any>;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=index.d.ts.map