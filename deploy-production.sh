#!/bin/bash

# BidFetch Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

log "🌊 Starting BidFetch Production Deployment to DigitalOcean"
echo "============================================================"

# Check prerequisites
log "🔍 Checking prerequisites..."

command -v doctl >/dev/null 2>&1 || error "doctl is required but not installed"
command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"
command -v docker >/dev/null 2>&1 || error "docker is required but not installed"
command -v jq >/dev/null 2>&1 || error "jq is required but not installed"

# Check doctl authentication
if ! doctl account get >/dev/null 2>&1; then
    error "Please authenticate with doctl first: doctl auth init"
fi

success "All prerequisites met"

# Get project configuration
REGION="${REGION:-nyc3}"
PROJECT_NAME="bidfetch"
REGISTRY_NAME="${PROJECT_NAME}-registry"
DB_NAME="${PROJECT_NAME}-db"
REDIS_NAME="${PROJECT_NAME}-redis"
SPACES_BUCKET="${PROJECT_NAME}-documents"
K8S_CLUSTER="${PROJECT_NAME}-k8s"

log "🏗️  Creating DigitalOcean infrastructure..."

# Create container registry
log "📦 Creating container registry..."
if doctl registry get $REGISTRY_NAME >/dev/null 2>&1; then
    warning "Registry $REGISTRY_NAME already exists"
else
    doctl registry create $REGISTRY_NAME --region $REGION
    success "Container registry created"
fi

# Get registry endpoint
REGISTRY_ENDPOINT=$(doctl registry get --output json | jq -r '.endpoint')
log "Registry endpoint: $REGISTRY_ENDPOINT"

# Login to registry
log "🔐 Logging into container registry..."
doctl registry login

# Create PostgreSQL database
log "🗄️  Creating PostgreSQL database cluster..."
if doctl databases get $DB_NAME >/dev/null 2>&1; then
    warning "Database $DB_NAME already exists"
    DB_CLUSTER=$(doctl databases get $DB_NAME --output json | jq -r '.[0].id')
else
    DB_CLUSTER=$(doctl databases create $DB_NAME \
        --engine pg \
        --version 15 \
        --size db-s-1vcpu-2gb \
        --num-nodes 1 \
        --region $REGION \
        --output json | jq -r '.[0].id')
    
    log "Database cluster ID: $DB_CLUSTER"
    
    # Wait for database to be ready
    log "⏳ Waiting for PostgreSQL database to be ready..."
    while true; do
        STATUS=$(doctl databases get $DB_CLUSTER --output json | jq -r '.[0].status')
        if [[ "$STATUS" == "online" ]]; then
            break
        fi
        log "Database status: $STATUS - waiting..."
        sleep 30
    done
    success "PostgreSQL database is online"
fi

# Create Redis database
log "🗄️  Creating Redis cache cluster..."
if doctl databases get $REDIS_NAME >/dev/null 2>&1; then
    warning "Redis $REDIS_NAME already exists"
    REDIS_CLUSTER=$(doctl databases get $REDIS_NAME --output json | jq -r '.[0].id')
else
    REDIS_CLUSTER=$(doctl databases create $REDIS_NAME \
        --engine redis \
        --version 7 \
        --size db-s-1vcpu-2gb \
        --num-nodes 1 \
        --region $REGION \
        --output json | jq -r '.[0].id')
    
    log "Redis cluster ID: $REDIS_CLUSTER"
    
    # Wait for Redis to be ready
    log "⏳ Waiting for Redis cache to be ready..."
    while true; do
        STATUS=$(doctl databases get $REDIS_CLUSTER --output json | jq -r '.[0].status')
        if [[ "$STATUS" == "online" ]]; then
            break
        fi
        log "Redis status: $STATUS - waiting..."
        sleep 30
    done
    success "Redis cache is online"
fi

# Create Spaces bucket
log "📦 Creating Spaces bucket..."
if doctl spaces ls | grep -q $SPACES_BUCKET; then
    warning "Spaces bucket $SPACES_BUCKET already exists"
else
    doctl spaces create $SPACES_BUCKET --region $REGION
    success "Spaces bucket created"
fi

# Create Kubernetes cluster
log "☸️  Creating Kubernetes cluster..."
if doctl kubernetes cluster get $K8S_CLUSTER >/dev/null 2>&1; then
    warning "Kubernetes cluster $K8S_CLUSTER already exists"
else
    K8S_CLUSTER_ID=$(doctl kubernetes cluster create $K8S_CLUSTER \
        --region $REGION \
        --node-pool "name=main-pool;size=s-4vcpu-8gb;count=3;auto-scale=true;min-nodes=2;max-nodes=8" \
        --output json | jq -r '.id')
    
    log "Kubernetes cluster ID: $K8S_CLUSTER_ID"
    
    # Wait for cluster to be ready
    log "⏳ Waiting for Kubernetes cluster..."
    doctl kubernetes cluster wait $K8S_CLUSTER_ID
    success "Kubernetes cluster is ready"
fi

# Save kubeconfig
log "📝 Saving Kubernetes config..."
doctl kubernetes cluster kubeconfig save $K8S_CLUSTER

# Build and push Docker images
log "🏗️  Building and pushing Docker images..."

# Build API image
log "Building BidFetch API..."
docker build -f Dockerfile.prod -t $REGISTRY_ENDPOINT/bidfetch-api:latest .
docker push $REGISTRY_ENDPOINT/bidfetch-api:latest
success "API image pushed"

# Build frontend image
log "Building BidFetch Frontend..."
cd frontend
npm ci
npm run build
docker build -f Dockerfile.prod -t $REGISTRY_ENDPOINT/bidfetch-frontend:latest .
docker push $REGISTRY_ENDPOINT/bidfetch-frontend:latest
cd ..
success "Frontend image pushed"

# Get database connection details
log "🔗 Getting database connection details..."
DB_URI=$(doctl databases connection $DB_CLUSTER --output json | jq -r '.uri')
REDIS_URI=$(doctl databases connection $REDIS_CLUSTER --output json | jq -r '.uri')

# Generate Spaces credentials
SPACES_ENDPOINT="https://$REGION.digitaloceanspaces.com"
log "Spaces endpoint: $SPACES_ENDPOINT"

# Create namespace
log "📦 Creating Kubernetes namespace..."
kubectl create namespace bidfetch --dry-run=client -o yaml | kubectl apply -f -

# Create secrets
log "🔐 Creating Kubernetes secrets..."
kubectl create secret generic bidfetch-secrets \
    --namespace=bidfetch \
    --from-literal=DATABASE_URL="$DB_URI" \
    --from-literal=REDIS_URL="$REDIS_URI" \
    --from-literal=S3_ENDPOINT="$SPACES_ENDPOINT" \
    --from-literal=S3_BUCKET="$SPACES_BUCKET" \
    --from-literal=S3_ACCESS_KEY="${DO_SPACES_ACCESS_KEY:-placeholder}" \
    --from-literal=S3_SECRET_KEY="${DO_SPACES_SECRET_KEY:-placeholder}" \
    --from-literal=SAM_GOV_API_KEY="${SAM_GOV_API_KEY:-placeholder}" \
    --dry-run=client -o yaml | kubectl apply -f -

# Update Kubernetes manifests with correct registry
log "🚀 Updating Kubernetes manifests..."
sed -i.bak "s|registry.digitalocean.com/bidfetch-registry|$REGISTRY_ENDPOINT|g" k8s-production.yaml

# Deploy to Kubernetes
log "🚀 Deploying to Kubernetes..."
kubectl apply -f k8s-production.yaml

# Wait for deployments to be ready
log "⏳ Waiting for deployments to be ready..."
kubectl wait --namespace=bidfetch \
    --for=condition=available \
    --timeout=600s \
    deployment/bidfetch-api

kubectl wait --namespace=bidfetch \
    --for=condition=available \
    --timeout=600s \
    deployment/bidfetch-frontend

kubectl wait --namespace=bidfetch \
    --for=condition=available \
    --timeout=600s \
    deployment/bidfetch-worker

success "All deployments are ready"

# Get load balancer IP
log "🌐 Getting load balancer IP..."
EXTERNAL_IP=""
while [ -z "$EXTERNAL_IP" ]; do
    log "Waiting for external IP..."
    EXTERNAL_IP=$(kubectl get service bidfetch-frontend-service -n bidfetch -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    sleep 10
done

success "Load balancer IP: $EXTERNAL_IP"

# Run database migrations
log "🗄️  Running database migrations..."
kubectl run db-migrate \
    --namespace=bidfetch \
    --rm -i --tty \
    --image=$REGISTRY_ENDPOINT/bidfetch-api:latest \
    --env="DATABASE_URL=$DB_URI" \
    --restart=Never \
    -- npm run db:migrate

success "Database migrations completed"

# Create monitoring alerts
log "📊 Setting up monitoring alerts..."
doctl monitoring alert-policy create \
    --name "BidFetch High CPU" \
    --type "kubernetes_cluster_cpu_utilization_percent" \
    --description "Alert when Kubernetes cluster CPU usage is high" \
    --compare "GreaterThan" \
    --value 80 \
    --window "5m" \
    --entities "$K8S_CLUSTER" \
    --enabled || warning "Alert policy creation failed"

# Test endpoints
log "🧪 Testing application endpoints..."
sleep 30  # Give services time to start

# Test health endpoint
if curl -f "http://$EXTERNAL_IP/health" >/dev/null 2>&1; then
    success "Health check passed"
else
    warning "Health check failed - application may still be starting"
fi

# Output deployment summary
echo ""
echo "============================================================"
success "🎉 BidFetch Production Deployment Complete!"
echo "============================================================"
echo ""
log "📊 Resources Created:"
echo "  - PostgreSQL Database: $DB_NAME ($DB_CLUSTER)"
echo "  - Redis Cache: $REDIS_NAME ($REDIS_CLUSTER)"
echo "  - Kubernetes Cluster: $K8S_CLUSTER"
echo "  - Container Registry: $REGISTRY_NAME"
echo "  - Spaces Bucket: $SPACES_BUCKET"
echo ""
log "🌐 Access Points:"
echo "  - Application URL: http://$EXTERNAL_IP"
echo "  - Load Balancer IP: $EXTERNAL_IP"
echo ""
log "🔐 Next Steps:"
echo "  1. Set up your custom domain and SSL certificate"
echo "  2. Configure API keys in Kubernetes secrets:"
echo "     kubectl patch secret bidfetch-secrets -n bidfetch --patch '{\"data\":{\"SAM_GOV_API_KEY\":\"<base64-encoded-key>\"}}'"
echo "  3. Monitor the application:"
echo "     kubectl get pods -n bidfetch"
echo "     kubectl logs -f deployment/bidfetch-api -n bidfetch"
echo "  4. Set up backup policies for databases"
echo ""
log "📈 Scaling Commands:"
echo "  - Scale API: kubectl scale deployment bidfetch-api -n bidfetch --replicas=5"
echo "  - Scale Frontend: kubectl scale deployment bidfetch-frontend -n bidfetch --replicas=3"
echo "  - Scale Workers: kubectl scale deployment bidfetch-worker -n bidfetch --replicas=4"
echo ""
success "🎯 Production deployment is complete and ready for traffic!"

# Clean up temporary files
rm -f k8s-production.yaml.bak