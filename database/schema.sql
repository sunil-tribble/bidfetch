-- BidFetch Database Schema
-- PostgreSQL 14+

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create database
CREATE DATABASE bidfetch;
\c bidfetch;

-- Sources table (external APIs)
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    base_url TEXT NOT NULL,
    auth_type VARCHAR(50),
    auth_config JSONB,
    rate_limit INTEGER,
    rate_window INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table (agencies and contractors)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'agency', 'contractor', 'vendor'
    identifier VARCHAR(100), -- DUNS, UEI, etc
    country VARCHAR(2),
    address JSONB,
    contact_info JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_identifier ON organizations(identifier);
CREATE INDEX idx_organizations_type ON organizations(type);

-- Opportunities table (main procurement opportunities)
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES sources(id),
    external_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type VARCHAR(50), -- 'solicitation', 'grant', 'sources_sought', etc
    status VARCHAR(50), -- 'active', 'closed', 'awarded', 'cancelled'
    
    -- Agency information
    agency_id UUID REFERENCES organizations(id),
    agency_name VARCHAR(255),
    office VARCHAR(255),
    
    -- Classification
    naics_codes TEXT[],
    psc_codes TEXT[],
    cpv_codes TEXT[], -- EU classification
    keywords TEXT[],
    
    -- Dates
    posted_date TIMESTAMP,
    modified_date TIMESTAMP,
    response_deadline TIMESTAMP,
    award_date TIMESTAMP,
    performance_start_date DATE,
    performance_end_date DATE,
    
    -- Values
    estimated_value DECIMAL(15,2),
    value_min DECIMAL(15,2),
    value_max DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Location
    place_of_performance JSONB,
    country VARCHAR(2),
    state VARCHAR(50),
    
    -- Competition
    set_aside_type VARCHAR(100),
    competition_type VARCHAR(100),
    
    -- Documents
    documents JSONB,
    attachments_count INTEGER DEFAULT 0,
    
    -- Metadata
    raw_data JSONB,
    metadata JSONB,
    search_vector tsvector,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_source_external_id UNIQUE(source_id, external_id)
);

-- Indexes for opportunities
CREATE INDEX idx_opportunities_source ON opportunities(source_id);
CREATE INDEX idx_opportunities_agency ON opportunities(agency_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_posted_date ON opportunities(posted_date DESC);
CREATE INDEX idx_opportunities_response_deadline ON opportunities(response_deadline);
CREATE INDEX idx_opportunities_naics ON opportunities USING GIN(naics_codes);
CREATE INDEX idx_opportunities_search ON opportunities USING GIN(search_vector);
CREATE INDEX idx_opportunities_value ON opportunities(estimated_value);

-- Historical contracts table (from FPDS)
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id VARCHAR(255) NOT NULL UNIQUE,
    parent_award_id VARCHAR(255),
    
    -- Parties
    agency_id UUID REFERENCES organizations(id),
    contractor_id UUID REFERENCES organizations(id),
    agency_name VARCHAR(255),
    contractor_name VARCHAR(255),
    
    -- Award information
    award_date DATE,
    effective_date DATE,
    completion_date DATE,
    current_completion_date DATE,
    
    -- Values
    base_value DECIMAL(15,2),
    obligated_amount DECIMAL(15,2),
    current_value DECIMAL(15,2),
    
    -- Classification
    naics_code VARCHAR(10),
    psc_code VARCHAR(10),
    contract_type VARCHAR(50),
    
    -- Competition
    competed BOOLEAN,
    number_of_offers_received INTEGER,
    
    -- Performance
    place_of_performance JSONB,
    
    -- Metadata
    raw_data JSONB,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for contracts
CREATE INDEX idx_contracts_agency ON contracts(agency_id);
CREATE INDEX idx_contracts_contractor ON contracts(contractor_id);
CREATE INDEX idx_contracts_award_date ON contracts(award_date DESC);
CREATE INDEX idx_contracts_naics ON contracts(naics_code);
CREATE INDEX idx_contracts_completion ON contracts(current_completion_date);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    
    filename VARCHAR(255),
    original_url TEXT,
    storage_path TEXT,
    mime_type VARCHAR(100),
    file_size INTEGER,
    
    content_hash VARCHAR(64),
    extracted_text TEXT,
    
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (opportunity_id IS NOT NULL OR contract_id IS NOT NULL)
);

CREATE INDEX idx_documents_opportunity ON documents(opportunity_id);
CREATE INDEX idx_documents_contract ON documents(contract_id);

-- Predictions table (ML outputs)
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    
    award_probability DECIMAL(3,2),
    estimated_competition INTEGER,
    predicted_value DECIMAL(15,2),
    predicted_award_date DATE,
    
    similar_contracts UUID[],
    recommended_partners UUID[],
    
    success_factors JSONB,
    risk_factors JSONB,
    
    model_version VARCHAR(50),
    confidence_score DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_opportunity ON predictions(opportunity_id);
CREATE INDEX idx_predictions_probability ON predictions(award_probability DESC);

-- Processing logs table
CREATE TABLE processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES sources(id),
    
    job_type VARCHAR(50),
    status VARCHAR(50),
    
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    
    error_details JSONB,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processing_logs_source ON processing_logs(source_id);
CREATE INDEX idx_processing_logs_status ON processing_logs(status);
CREATE INDEX idx_processing_logs_created ON processing_logs(created_at DESC);

-- Watchlists table (user alerts)
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    
    -- Filters
    keywords TEXT[],
    naics_codes TEXT[],
    agencies UUID[],
    min_value DECIMAL(15,2),
    max_value DECIMAL(15,2),
    countries VARCHAR(2)[],
    
    -- Notification settings
    notify_email BOOLEAN DEFAULT true,
    notify_frequency VARCHAR(50) DEFAULT 'daily',
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_watchlists_user ON watchlists(user_id);

-- Competitive intelligence table
CREATE TABLE competitive_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID REFERENCES opportunities(id),
    agency_id UUID REFERENCES organizations(id),
    
    incumbent_contractor_id UUID REFERENCES organizations(id),
    incumbent_contract_id UUID REFERENCES contracts(id),
    incumbent_value DECIMAL(15,2),
    
    top_competitors JSONB,
    market_share_analysis JSONB,
    historical_win_rates JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_competitive_intel_opportunity ON competitive_intelligence(opportunity_id);
CREATE INDEX idx_competitive_intel_agency ON competitive_intelligence(agency_id);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update search vectors
CREATE OR REPLACE FUNCTION update_opportunity_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.agency_name, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_opportunity_search_vector
    BEFORE INSERT OR UPDATE OF title, description, agency_name, keywords
    ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunity_search_vector();

-- Insert initial source configurations
INSERT INTO sources (name, type, base_url, auth_type, rate_limit, rate_window) VALUES
    ('SAM.gov', 'api', 'https://api.sam.gov/opportunities/v2', 'api_key', 1500, 3600000),
    ('Grants.gov', 'xml', 'https://www.grants.gov/extract', 'none', 100, 3600000),
    ('FPDS', 'atom', 'https://www.fpds.gov/ezsearch/FEEDS/ATOM', 'none', 500, 3600000),
    ('TED Europa', 'api', 'https://api.ted.europa.eu/v3', 'api_key', 1000, 3600000),
    ('UK Contracts Finder', 'api', 'https://www.contractsfinder.service.gov.uk/api', 'oauth2', 500, 3600000),
    ('UNGM', 'scraper', 'https://www.ungm.org', 'none', 100, 3600000);

-- Create partitioning for high-volume tables (optional, for scaling)
-- Partition opportunities by posted_date
CREATE TABLE opportunities_2025_q1 PARTITION OF opportunities
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
    
CREATE TABLE opportunities_2025_q2 PARTITION OF opportunities
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
    
-- Add table for API rate limiting tracking
CREATE TABLE rate_limit_tracker (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES sources(id),
    
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    
    requests_made INTEGER DEFAULT 0,
    requests_limit INTEGER NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_source_window UNIQUE(source_id, window_start)
);

CREATE INDEX idx_rate_limit_source_window ON rate_limit_tracker(source_id, window_end DESC);