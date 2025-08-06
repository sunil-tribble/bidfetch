import React, { useEffect, useState } from 'react';
import './App.css';

interface OpportunityData {
  id: string;
  title: string;
  agency: string;
  description: string;
  value: string;
  type: string;
  status: string;
  deadline: string;
  created: string;
}

interface ApiResponse {
  data: OpportunityData[];
  total: number;
  page: number;
  limit: number;
}

function App() {
  const [opportunities, setOpportunities] = useState<OpportunityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('Unknown');

  useEffect(() => {
    // Check API status
    fetch('/api/status')
      .then(response => response.json())
      .then(data => {
        setApiStatus('Connected');
        console.log('API Status:', data);
      })
      .catch(err => {
        setApiStatus('Disconnected');
        console.error('API connection failed:', err);
      });

    // Fetch opportunities
    fetch('/api/opportunities')
      .then(response => response.json())
      .then((data: ApiResponse) => {
        setOpportunities(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load opportunities');
        setLoading(false);
        console.error('Failed to fetch opportunities:', err);
      });
  }, []);

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <h2>Loading BidFetch...</h2>
          <p>Connecting to API and fetching opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <p>API Status: {apiStatus}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎯 BidFetch</h1>
        <p>Open Opportunity Engine for Government Procurement</p>
        <div className="status-bar">
          <span className={`status ${apiStatus.toLowerCase()}`}>
            API: {apiStatus}
          </span>
          <span className="count">
            {opportunities.length} Opportunities
          </span>
        </div>
      </header>

      <main className="App-main">
        <section className="opportunities-section">
          <h2>Current Opportunities</h2>
          {opportunities.length === 0 ? (
            <div className="no-data">
              <p>No opportunities available at this time.</p>
            </div>
          ) : (
            <div className="opportunities-grid">
              {opportunities.map(opportunity => (
                <div key={opportunity.id} className="opportunity-card">
                  <div className="card-header">
                    <h3>{opportunity.title}</h3>
                    <span className={`status-badge ${opportunity.status.toLowerCase()}`}>
                      {opportunity.status}
                    </span>
                  </div>
                  <div className="card-body">
                    <p><strong>Agency:</strong> {opportunity.agency}</p>
                    <p><strong>Type:</strong> {opportunity.type}</p>
                    <p><strong>Value:</strong> {opportunity.value}</p>
                    <p><strong>Deadline:</strong> {opportunity.deadline}</p>
                    <p className="description">{opportunity.description}</p>
                  </div>
                  <div className="card-footer">
                    <small>Posted: {opportunity.created}</small>
                    <button className="btn-primary">View Details</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="stats-section">
          <h2>Quick Stats</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Active Opportunities</h3>
              <div className="stat-number">{opportunities.filter(o => o.status === 'Active').length}</div>
            </div>
            <div className="stat-card">
              <h3>Total Value</h3>
              <div className="stat-number">$2.5M+</div>
            </div>
            <div className="stat-card">
              <h3>Agencies</h3>
              <div className="stat-number">{new Set(opportunities.map(o => o.agency)).size}</div>
            </div>
            <div className="stat-card">
              <h3>Data Sources</h3>
              <div className="stat-number">3</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="App-footer">
        <p>
          BidFetch v1.0.0 - Production Deployment on DigitalOcean
        </p>
        <p>
          <a href="/api/status" target="_blank" rel="noopener noreferrer">
            API Status
          </a>
          {' | '}
          <a href="/health" target="_blank" rel="noopener noreferrer">
            Health Check
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;