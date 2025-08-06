-- BidFetcher Database Schema
-- PostgreSQL schema for metadata and structured data

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Sources configuration table
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL, -- 'sam_gov', 'fpds', 'ted_eu', etc.
    base_url TEXT NOT NULL,
    api_key_encrypted TEXT,
    rate_limit_per_hour INTEGER DEFAULT 1500,
    rate_limit_burst INTEGER DEFAULT 10,
    enabled BOOLEAN DEFAULT true,
    last_poll_at TIMESTAMP WITH TIME ZONE,
    next_poll_at TIMESTAMP WITH TIME ZONE,
    poll_interval_minutes INTEGER DEFAULT 15,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations (government agencies and contractors)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    normalized_name VARCHAR(500) NOT NULL, -- For deduplication
    type VARCHAR(50) NOT NULL, -- 'agency', 'contractor', 'subcontractor'
    identifiers JSONB DEFAULT '{}', -- DUNS, CAGE codes, etc.
    address JSONB DEFAULT '{}',
    contact_info JSONB DEFAULT '{}',
    classification_codes TEXT[], -- NAICS, PSC codes
    entity_size VARCHAR(50), -- 'small', 'large', 'disadvantaged'
    verification_status VARCHAR(50) DEFAULT 'unverified',
    source_ids UUID[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opportunities (contract opportunities)
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES sources(id),
    source_opportunity_id VARCHAR(200) NOT NULL, -- External ID
    title TEXT NOT NULL,
    description TEXT,
    solicitation_number VARCHAR(200),
    agency_id UUID REFERENCES organizations(id),
    office_name VARCHAR(500),
    
    -- Dates
    posted_date TIMESTAMP WITH TIME ZONE,
    response_deadline TIMESTAMP WITH TIME ZONE,
    archive_date TIMESTAMP WITH TIME ZONE,
    
    -- Classification
    naics_codes VARCHAR(10)[],
    psc_codes VARCHAR(10)[],
    classification_code VARCHAR(50),
    
    -- Contract details
    contract_type VARCHAR(100),
    estimated_value_min DECIMAL(15,2),
    estimated_value_max DECIMAL(15,2),
    place_of_performance JSONB DEFAULT '{}',
    set_aside_type VARCHAR(100),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, cancelled, awarded, archived
    competition_type VARCHAR(50),
    
    -- Full text search
    search_vector tsvector,
    
    -- Metadata
    source_data JSONB DEFAULT '{}',
    processing_status VARCHAR(50) DEFAULT 'pending',
    quality_score DECIMAL(3,2),
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(source_id, source_opportunity_id)
);

-- Contracts (awarded contracts and historical data)
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES sources(id),
    source_contract_id VARCHAR(200) NOT NULL, -- External ID
    opportunity_id UUID REFERENCES opportunities(id),
    
    -- Basic info
    title TEXT NOT NULL,
    description TEXT,
    contract_number VARCHAR(200),
    parent_contract_id UUID REFERENCES contracts(id), -- For modifications
    
    -- Organizations
    agency_id UUID REFERENCES organizations(id),
    contractor_id UUID REFERENCES organizations(id),
    
    -- Dates
    signed_date DATE,
    start_date DATE,
    end_date DATE,
    completion_date DATE,
    
    -- Financial
    obligated_amount DECIMAL(15,2),
    total_value DECIMAL(15,2),
    funding_source VARCHAR(200),
    
    -- Classification
    naics_code VARCHAR(10),
    psc_code VARCHAR(10),
    contract_type VARCHAR(100),
    
    -- Performance
    place_of_performance JSONB DEFAULT '{}',
    performance_status VARCHAR(50), -- ongoing, completed, terminated
    
    -- Competition
    competition_type VARCHAR(50),
    number_of_offers_received INTEGER,
    extent_competed VARCHAR(100),
    
    -- Metadata
    source_data JSONB DEFAULT '{}',
    search_vector tsvector,
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(source_id, source_contract_id)
);

-- Documents associated with opportunities and contracts
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID REFERENCES opportunities(id),
    contract_id UUID REFERENCES contracts(id),
    
    -- Document metadata
    filename VARCHAR(500) NOT NULL,
    title VARCHAR(500),
    document_type VARCHAR(100), -- 'solicitation', 'amendment', 'award', etc.
    mime_type VARCHAR(100),
    file_size BIGINT,
    checksum VARCHAR(64),
    
    -- Storage
    storage_path TEXT NOT NULL, -- Path in object storage
    storage_bucket VARCHAR(200),
    
    -- Processing
    extracted_text TEXT,
    extraction_status VARCHAR(50) DEFAULT 'pending',
    search_vector tsvector,
    
    -- Source info
    source_url TEXT,
    downloaded_at TIMESTAMP WITH TIME ZONE,
    last_modified TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-reference table for opportunity relationships
CREATE TABLE opportunity_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id),
    related_opportunity_id UUID NOT NULL REFERENCES opportunities(id),
    relationship_type VARCHAR(50) NOT NULL, -- 'amendment', 'recompete', 'similar'
    confidence_score DECIMAL(3,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(opportunity_id, related_opportunity_id, relationship_type)
);

-- Analytics and predictions
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID REFERENCES opportunities(id),
    contract_id UUID REFERENCES contracts(id),
    
    prediction_type VARCHAR(100) NOT NULL, -- 'award_probability', 'competition_level', etc.
    prediction_value JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    model_version VARCHAR(50),
    
    features_used JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Polling and processing logs
CREATE TABLE processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES sources(id),
    operation_type VARCHAR(50) NOT NULL, -- 'poll', 'process', 'analyze'
    status VARCHAR(50) NOT NULL, -- 'success', 'error', 'partial'
    
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_opportunities_source_posted ON opportunities(source_id, posted_date DESC);
CREATE INDEX idx_opportunities_deadline ON opportunities(response_deadline) WHERE status = 'active';
CREATE INDEX idx_opportunities_agency ON opportunities(agency_id);
CREATE INDEX idx_opportunities_naics ON opportunities USING gin(naics_codes);
CREATE INDEX idx_opportunities_search ON opportunities USING gin(search_vector);
CREATE INDEX idx_opportunities_tags ON opportunities USING gin(tags);

CREATE INDEX idx_contracts_agency_contractor ON contracts(agency_id, contractor_id);
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date);
CREATE INDEX idx_contracts_value ON contracts(total_value DESC);
CREATE INDEX idx_contracts_search ON contracts USING gin(search_vector);

CREATE INDEX idx_documents_opportunity ON documents(opportunity_id);
CREATE INDEX idx_documents_contract ON documents(contract_id);
CREATE INDEX idx_documents_search ON documents USING gin(search_vector);

CREATE INDEX idx_organizations_name ON organizations USING gin(normalized_name gin_trgm_ops);
CREATE INDEX idx_organizations_type ON organizations(type);

-- Partitioning for opportunities by posted_date (monthly partitions)
-- This would be implemented for high-volume production systems

-- Triggers for updating search vectors and timestamps
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'opportunities' THEN
        NEW.search_vector := to_tsvector('english', 
            COALESCE(NEW.title, '') || ' ' || 
            COALESCE(NEW.description, '') || ' ' || 
            COALESCE(NEW.solicitation_number, '')
        );
    ELSIF TG_TABLE_NAME = 'contracts' THEN
        NEW.search_vector := to_tsvector('english',
            COALESCE(NEW.title, '') || ' ' || 
            COALESCE(NEW.description, '') || ' ' || 
            COALESCE(NEW.contract_number, '')
        );
    ELSIF TG_TABLE_NAME = 'documents' THEN
        NEW.search_vector := to_tsvector('english',
            COALESCE(NEW.title, '') || ' ' || 
            COALESCE(NEW.extracted_text, '')
        );
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER opportunities_search_vector
    BEFORE INSERT OR UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER contracts_search_vector
    BEFORE INSERT OR UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER documents_search_vector
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Function to clean old processing logs
CREATE OR REPLACE FUNCTION clean_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM processing_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;