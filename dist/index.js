"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const opportunities_1 = require("./api/routes/opportunities");
const contracts_1 = require("./api/routes/contracts");
const intelligence_1 = require("./api/routes/intelligence");
const scheduler_1 = require("./scheduler");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)()); // Enable CORS for all origins
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files from frontend build
const frontendPath = path_1.default.join(__dirname, '../frontend/dist');
app.use(express_1.default.static(frontendPath));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/opportunities', opportunities_1.opportunityRoutes);
app.use('/api/contracts', contracts_1.contractRoutes);
app.use('/api/intelligence', intelligence_1.intelligenceRoutes);
// Catch-all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path_1.default.join(frontendPath, 'index.html'));
});
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.logger.error('Unhandled error', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal server error',
            status: err.status || 500,
        },
    });
});
// Start server
const PORT = config_1.config.port;
app.listen(PORT, () => {
    logger_1.logger.info(`BidFetch API server running on port ${PORT}`);
    // Start scheduler if enabled
    if (config_1.config.scheduler.enabled) {
        scheduler_1.schedulerService.start();
        logger_1.logger.info('Scheduler service started');
    }
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM signal received: closing HTTP server');
    scheduler_1.schedulerService.stop();
    process.exit(0);
});
exports.default = app;
//# sourceMappingURL=index.js.map