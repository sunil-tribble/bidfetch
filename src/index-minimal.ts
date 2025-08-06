import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    message: 'BidFetch API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/opportunities', (req, res) => {
  // Mock opportunities data
  res.json({
    data: [
      {
        id: '1',
        title: 'Sample Government Contract Opportunity',
        agency: 'Department of Defense',
        description: 'This is a sample opportunity for demonstration purposes',
        value: '$100,000 - $500,000',
        type: 'Contract',
        status: 'Active',
        deadline: '2025-09-15',
        created: '2025-08-06'
      },
      {
        id: '2',
        title: 'IT Services Procurement',
        agency: 'Department of Homeland Security',
        description: 'IT infrastructure and support services',
        value: '$50,000 - $250,000',
        type: 'RFP',
        status: 'Active',
        deadline: '2025-08-25',
        created: '2025-08-05'
      }
    ],
    total: 2,
    page: 1,
    limit: 20
  });
});

app.get('/api/contracts', (req, res) => {
  res.json({
    data: [
      {
        id: '1',
        title: 'Previous Contract Award',
        contractor: 'ABC Corp',
        value: '$75,000',
        period: '2024-2025',
        status: 'Completed'
      }
    ],
    total: 1
  });
});

// Basic error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not found',
      status: 404
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BidFetch API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API Status: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;