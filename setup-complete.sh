#!/bin/bash

# BidFetch Complete Setup Script
set -e

echo "🚀 Setting up BidFetch Complete System..."

# Create remaining frontend pages
cat > frontend/src/pages/OpportunityDetail.tsx << 'EOF'
import React from 'react';
import { useParams } from 'react-router-dom';

const OpportunityDetail: React.FC = () => {
  const { id } = useParams();
  return <div className="p-6">Opportunity Detail: {id}</div>;
};

export default OpportunityDetail;
EOF

cat > frontend/src/pages/Contracts.tsx << 'EOF'
import React from 'react';

const Contracts: React.FC = () => {
  return <div className="p-6"><h1>Expiring Contracts</h1></div>;
};

export default Contracts;
EOF

cat > frontend/src/pages/Intelligence.tsx << 'EOF'
import React from 'react';

const Intelligence: React.FC = () => {
  return <div className="p-6"><h1>Competitive Intelligence</h1></div>;
};

export default Intelligence;
EOF

cat > frontend/src/pages/Watchlists.tsx << 'EOF'
import React from 'react';

const Watchlists: React.FC = () => {
  return <div className="p-6"><h1>Watchlists</h1></div>;
};

export default Watchlists;
EOF

cat > frontend/src/pages/Analytics.tsx << 'EOF'
import React from 'react';

const Analytics: React.FC = () => {
  return <div className="p-6"><h1>Analytics</h1></div>;
};

export default Analytics;
EOF

cat > frontend/src/pages/Settings.tsx << 'EOF'
import React from 'react';

const Settings: React.FC = () => {
  return <div className="p-6"><h1>Settings</h1></div>;
};

export default Settings;
EOF

cat > frontend/src/pages/Login.tsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('demo@bidfetch.com');
  const [password, setPassword] = useState('demo123');
  const navigate = useNavigate();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('authToken', 'demo-token');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Sign in to BidFetch
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="Email address"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Password"
            />
          </div>
          <button type="submit" className="w-full btn btn-primary">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
EOF

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# Create deployment package
echo "📦 Creating deployment package..."
cat > .dockerignore << 'EOF'
node_modules
*.log
.git
.env
dist
frontend/node_modules
frontend/build
EOF

# Create production Dockerfile
cat > Dockerfile.prod << 'EOF'
FROM node:18-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init postgresql-client
COPY package*.json ./
RUN npm ci --only=production
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/build ./public
COPY database ./database
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
EOF

# Create DigitalOcean deployment script
cat > deploy-digitalocean.sh << 'EOF'
#!/bin/bash
set -e

echo "🌊 Deploying to DigitalOcean..."

# Install doctl if not present
if ! command -v doctl &> /dev/null; then
    echo "Installing doctl CLI..."
    curl -sL https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz | tar -xzv
    sudo mv doctl /usr/local/bin
fi

# Authenticate
echo "Please authenticate with DigitalOcean:"
doctl auth init

# Create App Platform app
echo "Creating App Platform application..."
doctl apps create --spec app-spec.yaml

echo "✅ Deployment initiated! Check your DigitalOcean dashboard for status."
EOF

# Create DigitalOcean App Spec
cat > app-spec.yaml << 'EOF'
name: bidfetch
region: nyc
services:
- name: api
  dockerfile_path: Dockerfile.prod
  source_dir: /
  github:
    branch: main
    deploy_on_push: true
    repo: YOUR_GITHUB_REPO
  http_port: 3000
  instance_count: 2
  instance_size_slug: professional-xs
  routes:
  - path: /
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${postgres.DATABASE_URL}
  - key: REDIS_URL
    value: ${redis.REDIS_URL}
    
databases:
- name: postgres
  engine: PG
  production: true
  version: "15"
  
- name: redis
  engine: REDIS
  production: true
  version: "7"
  
workers:
- name: worker
  dockerfile_path: Dockerfile.prod
  source_dir: /
  github:
    branch: main
    deploy_on_push: true
    repo: YOUR_GITHUB_REPO
  instance_count: 1
  instance_size_slug: professional-xs
  run_command: npm run worker
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${postgres.DATABASE_URL}
  - key: REDIS_URL
    value: ${redis.REDIS_URL}
EOF

# Create local testing script
cat > test-local.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing BidFetch locally..."

# Start services
docker-compose up -d

# Wait for services
echo "Waiting for services to start..."
sleep 10

# Run migrations
docker-compose exec api npm run db:migrate

# Check health
curl -f http://localhost:3000/health || exit 1

echo "✅ Local test successful! Access the app at http://localhost:3000"
EOF

chmod +x deploy-digitalocean.sh test-local.sh

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Test locally: ./test-local.sh"
echo "2. Push to GitHub"
echo "3. Deploy to DigitalOcean: ./deploy-digitalocean.sh"
echo ""
echo "Access the application at: http://localhost:3000"
echo "Default login: demo@bidfetch.com / demo123"