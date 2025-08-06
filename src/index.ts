import express from 'express';
import { config } from './config';
import { logger } from './utils/logger';
import { opportunityRoutes } from './api/routes/opportunities';
import { contractRoutes } from './api/routes/contracts';
import { intelligenceRoutes } from './api/routes/intelligence';
import { schedulerService } from './scheduler';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/intelligence', intelligenceRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
    },
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`BidFetch API server running on port ${PORT}`);
  
  // Start scheduler if enabled
  if (config.scheduler.enabled) {
    schedulerService.start();
    logger.info('Scheduler service started');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  schedulerService.stop();
  process.exit(0);
});

export default app;