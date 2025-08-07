# BidFetch Infrastructure Documentation

## 🚨 CRITICAL INFORMATION - READ FIRST

**Production URL:** http://152.42.154.129  
**Infrastructure:** Kubernetes on DigitalOcean  
**Current Status:** ✅ LIVE with REAL government data (NO mock data)

## 📍 Infrastructure Overview

### DigitalOcean Resources

1. **Kubernetes Cluster**
   - **Name:** `bidfetch-prod-k8s-1754513510`
   - **ID:** `0c06d22e-156e-4f09-a5de-8c5157fb6bf2`
   - **Region:** NYC3
   - **Version:** 1.33.1-do.2
   - **Node Pool:** main-pool (2 nodes)
     - Node 1: 142.93.78.35 (main-pool-l1evu)
     - Node 2: 143.198.0.12 (main-pool-l1ev7)

2. **Container Registry**
   - **Name:** bishop
   - **Endpoint:** registry.digitalocean.com/bishop
   - **Region:** SFO3
   - **Status:** ⚠️ FULL (5/5 repositories)
   - **Repositories:**
     - bidfetch-working (production image)
     - bidfetch-api
     - bidfetch-frontend
     - bishop-nginx
     - bishop-web

3. **Load Balancers**
   - **Production IP:** 152.42.154.129 → bidfetch-frontend-service
   - **Alternative IP:** 138.197.49.116 → bidfetch-working-service

## 🎯 Kubernetes Deployments

### Namespace: `bidfetch`

```yaml
Active Deployments:
- bidfetch-working: 3/3 replicas (MAIN PRODUCTION SERVER)
- bidfetch-api-proxy: 1/1 replica
- bidfetch-api: 0/0 (scaled down)
- bidfetch-frontend: 0/0 (scaled down)
```

### Current Production Setup
- **Deployment:** `bidfetch-working`
- **Image:** `registry.digitalocean.com/bishop/bidfetch-working:latest`
- **Container Name:** `working-server`
- **Port:** 3000
- **Replicas:** 3

## 🔧 Common Operations

### Access Kubernetes Cluster
```bash
# Save kubeconfig
doctl kubernetes cluster kubeconfig save 0c06d22e-156e-4f09-a5de-8c5157fb6bf2

# Verify connection
kubectl get pods -n bidfetch
```

### Check Production Status
```bash
# Check if serving real data (should NOT return SAM100000)
curl http://152.42.154.129/api/opportunities | jq '.data[0]'

# Check pod status
kubectl get pods -n bidfetch

# View logs
kubectl logs -n bidfetch deployment/bidfetch-working --tail=50
```

### Deploy Updates (ConfigMap Method - Registry is FULL)
```bash
# Since Docker registry is FULL, use ConfigMap for data updates:
kubectl apply -f k8s-data-replacement.yaml

# Restart deployment to pick up changes
kubectl rollout restart deployment/bidfetch-working -n bidfetch

# Check rollout status
kubectl rollout status deployment/bidfetch-working -n bidfetch
```

### Emergency Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/bidfetch-working -n bidfetch

# Scale down if needed
kubectl scale deployment/bidfetch-working --replicas=0 -n bidfetch

# Scale back up
kubectl scale deployment/bidfetch-working --replicas=3 -n bidfetch
```

## 📊 Data Sources Configuration

### Current Real Data Status
- **SAM.gov:** ✅ 100 real opportunities loaded
- **Grants.gov:** ⚠️ 0 (needs API key)
- **FPDS:** ⚠️ 0 (needs configuration)
- **TED EU:** ⚠️ 0 (needs API access)
- **UK Contracts:** ⚠️ 0 (needs API key)
- **UNGM:** ⚠️ 0 (needs credentials)

### Server Files
- **Production Server:** `src/multi-source-server.js` (REAL data only)
- **Old Mock Server:** `src/working-server.js` (DO NOT USE - contains mock data)

## ⚠️ Known Issues & Solutions

### Issue 1: SSH Access Blocked
- **Problem:** Cannot SSH to 152.42.154.129
- **Solution:** Use Kubernetes kubectl commands instead

### Issue 2: Docker Registry Full
- **Problem:** Cannot push new images (5/5 repositories)
- **Solution:** Use ConfigMaps to update data without new images

### Issue 3: Mock Data Appearing
- **Problem:** API returns IDs like "SAM100000"
- **Solution:** Ensure deployment uses ConfigMap with real data:
  ```bash
  kubectl apply -f k8s-data-replacement.yaml
  kubectl rollout restart deployment/bidfetch-working -n bidfetch
  ```

## 🚀 Deployment Checklist

Before deploying:
- [ ] Verify no mock data in source files
- [ ] Check Docker registry space (currently FULL)
- [ ] Test locally with `npm start`
- [ ] Ensure ConfigMaps are updated with real data

After deploying:
- [ ] Verify API returns real opportunities: `curl http://152.42.154.129/api/opportunities`
- [ ] Check no mock IDs (SAM100000, etc.)
- [ ] Monitor pod health: `kubectl get pods -n bidfetch`
- [ ] Check logs for errors: `kubectl logs -n bidfetch deployment/bidfetch-working`

## 📝 Configuration Files

### Key Files in Repository
```
/bidfetch/
├── src/
│   ├── multi-source-server.js    # REAL data server (production)
│   └── working-server.js          # OLD mock server (deprecated)
├── k8s-data-replacement.yaml      # ConfigMap with real opportunities
├── Dockerfile                      # Container build (uses multi-source-server.js)
└── INFRASTRUCTURE.md              # This file
```

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
SAM_GOV_API_KEY=DEMO_KEY  # Update for production
```

## 🔐 Access Management

### DigitalOcean CLI
```bash
# Login
doctl auth init

# Verify access
doctl account get

# Should show:
# User: sunilkgrao@gmail.com
# Team: tribble-prod
```

### Kubernetes Access
```bash
# Get cluster credentials
doctl kubernetes cluster kubeconfig save bidfetch-prod-k8s-1754513510

# Current context
kubectl config current-context
# Should show: do-nyc3-bidfetch-prod-k8s-1754513510
```

## 📈 Monitoring

### Health Checks
- **API Health:** http://152.42.154.129/api/health
- **Opportunity Count:** http://152.42.154.129/api/opportunities (check data array length)

### Key Metrics to Monitor
1. Pod restart count (should be minimal)
2. Response time (should be <500ms)
3. Opportunity count (should be >0)
4. No mock data IDs (no SAM100000 pattern)

## 🆘 Troubleshooting Commands

```bash
# Get all resources in bidfetch namespace
kubectl get all -n bidfetch

# Describe deployment for issues
kubectl describe deployment bidfetch-working -n bidfetch

# Check events for errors
kubectl get events -n bidfetch --sort-by='.lastTimestamp'

# Force pull latest image
kubectl set image deployment/bidfetch-working working-server=registry.digitalocean.com/bishop/bidfetch-working:latest -n bidfetch

# Check ConfigMaps
kubectl get configmap -n bidfetch

# View ConfigMap content
kubectl get configmap bidfetch-data-override -n bidfetch -o yaml
```

## 📞 Support Information

- **GitHub Repository:** https://github.com/sunil-tribble/bidfetch
- **Production URL:** http://152.42.154.129
- **DigitalOcean Team:** tribble-prod
- **Primary Contact:** sunilkgrao@gmail.com

## ⚡ Quick Recovery

If production is showing mock data:
```bash
# 1. Connect to cluster
doctl kubernetes cluster kubeconfig save 0c06d22e-156e-4f09-a5de-8c5157fb6bf2

# 2. Apply real data ConfigMap
kubectl apply -f k8s-data-replacement.yaml

# 3. Restart deployment
kubectl rollout restart deployment/bidfetch-working -n bidfetch

# 4. Verify real data
curl http://152.42.154.129/api/opportunities | grep -v "SAM100000"
```

---

**Last Updated:** August 7, 2025  
**Status:** Production serving REAL government data  
**Mock Data:** ELIMINATED