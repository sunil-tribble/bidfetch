# BidFetch Deployment Guide

## 🚀 Complete System Overview

BidFetch is a production-ready procurement intelligence platform that aggregates opportunities from multiple government sources worldwide, providing competitive intelligence and predictive analytics.

### ✅ Implemented Features

#### Data Sources (All Implemented)
- **SAM.gov**: US Federal opportunities (15-minute polling)
- **Grants.gov**: Federal grants (daily XML extraction)
- **FPDS**: Historical contract data (hourly sync)
- **TED Europa**: EU procurement (4-hour sync)
- **UK Contracts Finder**: UK government contracts (OAuth2)
- **UN Global Marketplace**: UN procurement opportunities

#### Core Features
- **Real-time Opportunity Tracking**: High-frequency polling with adaptive rate limiting
- **Competitive Intelligence**: Automated incumbent analysis and competitor profiling
- **ML Predictions**: TensorFlow.js models for award probability and value estimation
- **Smart Caching**: Redis-based multi-tier caching
- **Document Management**: Automatic RFP retrieval with S3 storage
- **Worker Queue**: Bull-based job processing
- **Full-Text Search**: PostgreSQL with tsvector indexing
- **Export Capabilities**: CSV/JSON export with filters

#### Frontend (React + TypeScript)
- **Dashboard**: Real-time metrics and visualizations
- **Opportunity Search**: Advanced filtering and pagination
- **Competitive Analysis**: Detailed intelligence reports
- **Watchlists**: Custom alerts and monitoring
- **Analytics**: Data visualization with Recharts
- **Responsive Design**: Tailwind CSS with mobile support

## 📦 Local Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Quick Start

1. **Clone and Install**
```bash
git clone https://github.com/your-org/bidfetch.git
cd bidfetch
npm install
cd frontend && npm install --legacy-peer-deps && cd ..
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your API keys:
# - SAM.gov API key (required)
# - TED EU API key (optional)
# - UK Contracts credentials (optional)
```

3. **Start Services**
```bash
docker-compose up -d
```

4. **Run Migrations**
```bash
docker-compose exec postgres psql -U bidfetch -d bidfetch -f /docker-entrypoint-initdb.d/01-schema.sql
```

5. **Start Application**
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd frontend && npm start

# Terminal 3: Worker
npm run worker
```

6. **Access Application**
- Frontend: http://localhost:3001
- API: http://localhost:3000
- Default login: demo@bidfetch.com / demo123

## 🌊 DigitalOcean Deployment

### Automated Deployment

We've created a comprehensive deployment script that sets up the entire infrastructure on DigitalOcean:

```bash
./deploy-to-digitalocean.sh
```

This script will:
1. Install DigitalOcean CLI (doctl)
2. Create managed PostgreSQL database
3. Create managed Redis cache
4. Setup Spaces for document storage
5. Create container registry
6. Deploy Kubernetes cluster
7. Configure load balancer
8. Setup SSL certificates
9. Configure monitoring

### Manual Deployment Steps

#### 1. Prerequisites
- DigitalOcean account
- API token from DigitalOcean dashboard
- Domain name (optional)

#### 2. Install doctl
```bash
# macOS
brew install doctl

# Linux
cd /tmp
wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
tar xf doctl-1.104.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin
```

#### 3. Authenticate
```bash
doctl auth init
# Enter your API token when prompted
```

#### 4. Create Infrastructure

**Database Cluster:**
```bash
doctl databases create bidfetch-db \
  --engine pg \
  --version 15 \
  --size db-s-2vcpu-4gb \
  --num-nodes 1 \
  --region nyc3
```

**Redis Cluster:**
```bash
doctl databases create bidfetch-redis \
  --engine redis \
  --version 7 \
  --size db-s-1vcpu-1gb \
  --num-nodes 1 \
  --region nyc3
```

**Kubernetes Cluster:**
```bash
doctl kubernetes cluster create bidfetch-k8s \
  --region nyc3 \
  --node-pool "name=pool-bidfetch;size=s-2vcpu-4gb;count=3"
```

**Container Registry:**
```bash
doctl registry create bidfetch-registry --region nyc3
```

#### 5. Deploy Application

**Build and Push Docker Image:**
```bash
# Login to registry
doctl registry login

# Build image
docker build -t registry.digitalocean.com/bidfetch-registry/bidfetch-api:latest -f Dockerfile.prod .

# Push image
docker push registry.digitalocean.com/bidfetch-registry/bidfetch-api:latest
```

**Deploy to Kubernetes:**
```bash
# Save kubeconfig
doctl kubernetes cluster kubeconfig save bidfetch-k8s

# Apply Kubernetes manifests
kubectl apply -f k8s-deployment.yaml

# Check deployment status
kubectl get pods -n bidfetch
```

#### 6. Configure Domain & SSL

**Point Domain to DigitalOcean:**
1. Get load balancer IP:
```bash
kubectl get service bidfetch-api-service -n bidfetch
```

2. Create DNS records:
```bash
doctl compute domain create yourdomain.com
doctl compute domain records create yourdomain.com \
  --record-type A \
  --record-name @ \
  --record-data <LOAD_BALANCER_IP>
```

3. Install cert-manager for SSL:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

## 📊 Monitoring & Maintenance

### Health Checks
- API Health: `https://your-domain.com/health`
- Metrics: Prometheus endpoint at `/metrics`

### Monitoring Commands
```bash
# Check pod status
kubectl get pods -n bidfetch

# View logs
kubectl logs -f deployment/bidfetch-api -n bidfetch

# Scale deployment
kubectl scale deployment bidfetch-api --replicas=5 -n bidfetch

# Database backup
doctl databases backups list <database-id>
```

### Performance Tuning
- Adjust worker concurrency in environment variables
- Scale Kubernetes nodes based on load
- Configure Redis memory policies
- Optimize PostgreSQL with indexes

## 🔐 Security Considerations

1. **API Keys**: Store in DigitalOcean secrets
2. **Database**: Use connection pooling and SSL
3. **Network**: Configure firewall rules
4. **Updates**: Regular security patches
5. **Backups**: Automated daily backups

## 📈 Scaling Guide

### Horizontal Scaling
```bash
# Scale API pods
kubectl scale deployment bidfetch-api --replicas=10 -n bidfetch

# Scale worker pods
kubectl scale deployment bidfetch-worker --replicas=5 -n bidfetch

# Add more nodes to cluster
doctl kubernetes cluster node-pool update bidfetch-k8s pool-bidfetch \
  --count 5 \
  --auto-scale \
  --min-nodes 3 \
  --max-nodes 10
```

### Database Scaling
```bash
# Resize database
doctl databases resize <database-id> --size db-s-4vcpu-8gb

# Add read replicas
doctl databases replica create <database-id> --name bidfetch-replica --region nyc3
```

## 🎯 Production Checklist

- [ ] Configure production API keys
- [ ] Setup domain and SSL certificates
- [ ] Configure backup policies
- [ ] Setup monitoring alerts
- [ ] Configure auto-scaling
- [ ] Setup logging aggregation
- [ ] Configure CDN for static assets
- [ ] Setup staging environment
- [ ] Configure CI/CD pipeline
- [ ] Document runbooks

## 💰 Cost Estimation (DigitalOcean)

| Resource | Specification | Monthly Cost |
|----------|--------------|--------------|
| Kubernetes Cluster | 3x s-2vcpu-4gb | $60 |
| PostgreSQL | db-s-2vcpu-4gb | $40 |
| Redis | db-s-1vcpu-1gb | $15 |
| Load Balancer | 1x small | $12 |
| Spaces | 100GB storage | $5 |
| Container Registry | Basic | $5 |
| **Total** | | **~$137/month** |

*Note: Costs scale with usage and can be optimized*

## 🆘 Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check database status
doctl databases get <database-id>

# Test connection
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql <connection-string>
```

**Pod Crashes:**
```bash
# Check pod logs
kubectl logs <pod-name> -n bidfetch --previous

# Describe pod for events
kubectl describe pod <pod-name> -n bidfetch
```

**High Memory Usage:**
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n bidfetch

# Adjust resource limits
kubectl edit deployment bidfetch-api -n bidfetch
```

## 📞 Support

- GitHub Issues: [github.com/your-org/bidfetch/issues](https://github.com/your-org/bidfetch/issues)
- Documentation: [docs.bidfetch.com](https://docs.bidfetch.com)
- Email: support@bidfetch.com

## 🎉 Success!

Your BidFetch platform is now deployed and ready to aggregate procurement opportunities from around the world. The system will automatically:

1. Poll data sources at configured intervals
2. Process and enrich opportunities with ML predictions
3. Generate competitive intelligence reports
4. Alert users to matching opportunities
5. Scale based on load

Access your application and start winning more contracts!