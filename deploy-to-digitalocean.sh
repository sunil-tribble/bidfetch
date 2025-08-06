#!/bin/bash

# BidFetch DigitalOcean Deployment Script
set -e

echo "🌊 Deploying BidFetch to DigitalOcean..."
echo "=================================="

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "📦 Installing DigitalOcean CLI (doctl)..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install doctl
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        cd /tmp
        wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
        tar xf doctl-1.104.0-linux-amd64.tar.gz
        sudo mv doctl /usr/local/bin
        cd -
    else
        echo "❌ Unsupported OS. Please install doctl manually."
        exit 1
    fi
fi

# Authenticate with DigitalOcean
echo "🔐 Authenticating with DigitalOcean..."
echo "Please enter your DigitalOcean API token:"
read -s DO_TOKEN
doctl auth init -t $DO_TOKEN

# Create managed database cluster
echo "🗄️ Creating PostgreSQL database cluster..."
DB_CLUSTER=$(doctl databases create bidfetch-db \
    --engine pg \
    --version 15 \
    --size db-s-1vcpu-1gb \
    --num-nodes 1 \
    --region nyc3 \
    --output json | jq -r '.[0].id')

echo "Database cluster ID: $DB_CLUSTER"

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
while true; do
    STATUS=$(doctl databases get $DB_CLUSTER --output json | jq -r '.[0].status')
    if [[ "$STATUS" == "online" ]]; then
        break
    fi
    echo "Status: $STATUS - waiting..."
    sleep 10
done

# Get database connection details
DB_URI=$(doctl databases connection $DB_CLUSTER --output json | jq -r '.uri')
echo "✅ Database ready!"

# Create Redis managed database
echo "🗄️ Creating Redis cache cluster..."
REDIS_CLUSTER=$(doctl databases create bidfetch-redis \
    --engine redis \
    --version 7 \
    --size db-s-1vcpu-1gb \
    --num-nodes 1 \
    --region nyc3 \
    --output json | jq -r '.[0].id')

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
while true; do
    STATUS=$(doctl databases get $REDIS_CLUSTER --output json | jq -r '.[0].status')
    if [[ "$STATUS" == "online" ]]; then
        break
    fi
    echo "Status: $STATUS - waiting..."
    sleep 10
done

REDIS_URI=$(doctl databases connection $REDIS_CLUSTER --output json | jq -r '.uri')
echo "✅ Redis ready!"

# Create Spaces bucket for document storage
echo "📦 Creating Spaces bucket..."
doctl spaces create bidfetch-documents --region nyc3
SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com"
SPACES_BUCKET="bidfetch-documents"

# Create container registry
echo "🐳 Creating container registry..."
doctl registry create bidfetch-registry --region nyc3

# Get registry endpoint
REGISTRY=$(doctl registry get --output json | jq -r '.endpoint')

# Login to registry
echo "🔐 Logging into container registry..."
doctl registry login

# Build and push Docker images
echo "🏗️ Building Docker images..."
docker build -t bidfetch-api -f Dockerfile.prod .
docker tag bidfetch-api $REGISTRY/bidfetch-api:latest
docker push $REGISTRY/bidfetch-api:latest

# Create Kubernetes cluster
echo "☸️ Creating Kubernetes cluster..."
K8S_CLUSTER=$(doctl kubernetes cluster create bidfetch-k8s \
    --region nyc3 \
    --node-pool "name=pool-bidfetch;size=s-2vcpu-4gb;count=3;auto-scale=true;min-nodes=2;max-nodes=5" \
    --output json | jq -r '.id')

echo "Kubernetes cluster ID: $K8S_CLUSTER"

# Wait for cluster to be ready
echo "⏳ Waiting for Kubernetes cluster..."
doctl kubernetes cluster wait $K8S_CLUSTER

# Save kubeconfig
echo "📝 Saving Kubernetes config..."
doctl kubernetes cluster kubeconfig save $K8S_CLUSTER

# Create Kubernetes namespace
kubectl create namespace bidfetch

# Create secrets for database connections
echo "🔐 Creating Kubernetes secrets..."
kubectl create secret generic bidfetch-secrets \
    --namespace=bidfetch \
    --from-literal=DATABASE_URL="$DB_URI" \
    --from-literal=REDIS_URL="$REDIS_URI" \
    --from-literal=S3_ENDPOINT="$SPACES_ENDPOINT" \
    --from-literal=S3_BUCKET="$SPACES_BUCKET"

# Deploy application using Kubernetes manifests
echo "🚀 Deploying application to Kubernetes..."
cat > k8s-deployment.yaml << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: bidfetch
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bidfetch-api
  namespace: bidfetch
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bidfetch-api
  template:
    metadata:
      labels:
        app: bidfetch-api
    spec:
      containers:
      - name: api
        image: $REGISTRY/bidfetch-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: bidfetch-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: bidfetch-secrets
              key: REDIS_URL
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bidfetch-worker
  namespace: bidfetch
spec:
  replicas: 2
  selector:
    matchLabels:
      app: bidfetch-worker
  template:
    metadata:
      labels:
        app: bidfetch-worker
    spec:
      containers:
      - name: worker
        image: $REGISTRY/bidfetch-api:latest
        command: ["npm", "run", "worker"]
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: bidfetch-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: bidfetch-secrets
              key: REDIS_URL
---
apiVersion: v1
kind: Service
metadata:
  name: bidfetch-api-service
  namespace: bidfetch
spec:
  selector:
    app: bidfetch-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: bidfetch-scheduler
  namespace: bidfetch
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scheduler
            image: $REGISTRY/bidfetch-api:latest
            command: ["npm", "run", "scheduler"]
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: bidfetch-secrets
                  key: DATABASE_URL
          restartPolicy: OnFailure
EOF

kubectl apply -f k8s-deployment.yaml

# Wait for load balancer to get external IP
echo "⏳ Waiting for load balancer IP..."
while true; do
    EXTERNAL_IP=$(kubectl get service bidfetch-api-service -n bidfetch -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [[ ! -z "$EXTERNAL_IP" ]]; then
        break
    fi
    echo "Waiting for external IP..."
    sleep 10
done

echo "✅ Load balancer IP: $EXTERNAL_IP"

# Create floating IP and assign to load balancer
echo "🌐 Creating floating IP..."
FLOATING_IP=$(doctl compute floating-ip create --region nyc3 --output json | jq -r '.[0].ip')
echo "Floating IP: $FLOATING_IP"

# Setup domain (if provided)
echo "🌐 Would you like to setup a domain? (y/n)"
read SETUP_DOMAIN

if [[ "$SETUP_DOMAIN" == "y" ]]; then
    echo "Enter your domain name (e.g., bidfetch.com):"
    read DOMAIN
    
    # Create DNS records
    echo "📝 Creating DNS records..."
    doctl compute domain create $DOMAIN
    doctl compute domain records create $DOMAIN \
        --record-type A \
        --record-name @ \
        --record-data $FLOATING_IP
    doctl compute domain records create $DOMAIN \
        --record-type A \
        --record-name www \
        --record-data $FLOATING_IP
    
    # Setup SSL certificate
    echo "🔒 Setting up SSL certificate..."
    cat > cert-manager.yaml << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bidfetch-ingress
  namespace: bidfetch
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - $DOMAIN
    - www.$DOMAIN
    secretName: bidfetch-tls
  rules:
  - host: $DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bidfetch-api-service
            port:
              number: 80
  - host: www.$DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bidfetch-api-service
            port:
              number: 80
EOF
    
    # Install cert-manager
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    kubectl apply -f cert-manager.yaml
    
    echo "✅ Domain configured: https://$DOMAIN"
else
    echo "✅ You can access your application at: http://$EXTERNAL_IP"
fi

# Run database migrations
echo "🗄️ Running database migrations..."
kubectl run db-migrate \
    --namespace=bidfetch \
    --rm -i --tty \
    --image=$REGISTRY/bidfetch-api:latest \
    --env="DATABASE_URL=$DB_URI" \
    -- npm run db:migrate

# Create monitoring dashboard
echo "📊 Setting up monitoring..."
doctl monitoring alert-policy create \
    --name "BidFetch High CPU" \
    --type "droplet_cpu_utilization_percent" \
    --description "Alert when CPU usage is high" \
    --compare "GreaterThan" \
    --value 80 \
    --window "5m" \
    --entities "$K8S_CLUSTER" \
    --enabled

# Output summary
echo ""
echo "=========================================="
echo "✅ BidFetch Deployment Complete!"
echo "=========================================="
echo ""
echo "📊 Resources Created:"
echo "  - PostgreSQL Database: $DB_CLUSTER"
echo "  - Redis Cache: $REDIS_CLUSTER"
echo "  - Kubernetes Cluster: $K8S_CLUSTER"
echo "  - Container Registry: $REGISTRY"
echo "  - Spaces Bucket: $SPACES_BUCKET"
echo ""
echo "🌐 Access Points:"
if [[ ! -z "$DOMAIN" ]]; then
    echo "  - Application URL: https://$DOMAIN"
else
    echo "  - Application URL: http://$EXTERNAL_IP"
fi
echo "  - Load Balancer IP: $EXTERNAL_IP"
echo "  - Floating IP: $FLOATING_IP"
echo ""
echo "📝 Next Steps:"
echo "  1. Update your DNS nameservers to DigitalOcean"
echo "  2. Monitor the application in DigitalOcean dashboard"
echo "  3. Setup backup policies for databases"
echo "  4. Configure alerts and monitoring"
echo ""
echo "🔐 Default Login:"
echo "  Email: demo@bidfetch.com"
echo "  Password: demo123"
echo ""
echo "Thank you for using BidFetch!"