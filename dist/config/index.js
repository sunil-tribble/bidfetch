"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
        postgres: {
            url: process.env.DATABASE_URL || 'postgresql://localhost:5432/bidfetch',
            pool: {
                max: 20,
                min: 5,
                idle: 10000,
            },
        },
        mongodb: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bidfetch',
            options: {
                maxPoolSize: 10,
                minPoolSize: 2,
            },
        },
        redis: {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
        },
    },
    apis: {
        samGov: {
            apiKey: process.env.SAM_GOV_API_KEY || '',
            baseUrl: 'https://api.sam.gov/opportunities/v2',
            rateLimit: parseInt(process.env.SAM_GOV_RATE_LIMIT || '1500', 10),
            rateWindow: parseInt(process.env.SAM_GOV_RATE_WINDOW || '3600000', 10),
            pollInterval: parseInt(process.env.SAM_GOV_POLL_INTERVAL || '900000', 10), // 15 minutes
        },
        grantsGov: {
            baseUrl: 'https://www.grants.gov/extract',
            rateLimit: parseInt(process.env.GRANTS_GOV_RATE_LIMIT || '100', 10),
            rateWindow: parseInt(process.env.GRANTS_GOV_RATE_WINDOW || '3600000', 10),
            pollInterval: parseInt(process.env.GRANTS_GOV_POLL_INTERVAL || '86400000', 10), // 24 hours
        },
        fpds: {
            baseUrl: 'https://www.fpds.gov/ezsearch/FEEDS/ATOM',
            rateLimit: 500,
            rateWindow: 3600000,
            pollInterval: parseInt(process.env.FPDS_POLL_INTERVAL || '3600000', 10), // 1 hour
        },
        tedEu: {
            apiKey: process.env.TED_EU_API_KEY || '',
            baseUrl: 'https://api.ted.europa.eu/v3',
            rateLimit: 1000,
            rateWindow: 3600000,
        },
        ukContracts: {
            clientId: process.env.UK_CONTRACTS_CLIENT_ID || '',
            clientSecret: process.env.UK_CONTRACTS_CLIENT_SECRET || '',
            baseUrl: 'https://www.contractsfinder.service.gov.uk/api',
            tokenUrl: 'https://www.contractsfinder.service.gov.uk/token',
            rateLimit: 500,
            rateWindow: 3600000,
        },
    },
    storage: {
        s3: {
            endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
            accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
            bucket: process.env.S3_BUCKET || 'bidfetch-documents',
            region: process.env.S3_REGION || 'us-east-1',
        },
    },
    worker: {
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
        jobTimeout: parseInt(process.env.JOB_TIMEOUT || '300000', 10),
    },
    scheduler: {
        enabled: process.env.ENABLE_SCHEDULER === 'true',
    },
    ml: {
        modelPath: process.env.ML_MODEL_PATH || path_1.default.join(__dirname, '../../models'),
        enablePredictions: process.env.ENABLE_ML_PREDICTIONS === 'true',
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
    },
    cache: {
        ttl: {
            hot: 300, // 5 minutes
            warm: 3600, // 1 hour
            cold: 86400, // 24 hours
        },
    },
};
//# sourceMappingURL=index.js.map