export declare const config: {
    env: string;
    port: number;
    database: {
        postgres: {
            url: string;
            pool: {
                max: number;
                min: number;
                idle: number;
            };
        };
        mongodb: {
            uri: string;
            options: {
                maxPoolSize: number;
                minPoolSize: number;
            };
        };
        redis: {
            url: string;
            maxRetriesPerRequest: number;
            enableReadyCheck: boolean;
        };
    };
    apis: {
        samGov: {
            apiKey: string;
            baseUrl: string;
            rateLimit: number;
            rateWindow: number;
            pollInterval: number;
        };
        grantsGov: {
            baseUrl: string;
            rateLimit: number;
            rateWindow: number;
            pollInterval: number;
        };
        fpds: {
            baseUrl: string;
            rateLimit: number;
            rateWindow: number;
            pollInterval: number;
        };
        tedEu: {
            apiKey: string;
            baseUrl: string;
            rateLimit: number;
            rateWindow: number;
        };
        ukContracts: {
            clientId: string;
            clientSecret: string;
            baseUrl: string;
            tokenUrl: string;
            rateLimit: number;
            rateWindow: number;
        };
    };
    storage: {
        s3: {
            endpoint: string;
            accessKey: string;
            secretKey: string;
            bucket: string;
            region: string;
        };
    };
    worker: {
        concurrency: number;
        jobTimeout: number;
    };
    scheduler: {
        enabled: boolean;
    };
    ml: {
        modelPath: string;
        enablePredictions: boolean;
    };
    logging: {
        level: string;
        format: string;
    };
    cache: {
        ttl: {
            hot: number;
            warm: number;
            cold: number;
        };
    };
};
//# sourceMappingURL=index.d.ts.map