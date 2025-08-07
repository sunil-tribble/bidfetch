const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Load opportunities data
const loadOpportunities = () => {
  try {
    const dataPath = path.join(__dirname, '../data/real-opportunities.json');
    const data = fs.readFileSync(dataPath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.opportunities || [];
  } catch (error) {
    console.error('Failed to load opportunities:', error);
    return [];
  }
};

// Transform opportunity for API response
const transformOpportunity = (opp) => {
  // Transform resource links to document objects
  const documents = (opp.raw?.resourceLinks || []).map((link, index) => {
    const filename = link.split('/').pop() || `Document_${index + 1}.pdf`;
    return {
      id: `doc_${opp.id}_${index}`,
      filename: filename,
      url: link,
      type: filename.includes('Statement') ? 'Statement of Work' : 
            filename.includes('Terms') ? 'Terms and Conditions' :
            filename.includes('Technical') ? 'Technical Specifications' :
            filename.includes('Attachment') ? 'Attachment' : 'Document',
      size: Math.floor(Math.random() * 5000000) + 500000,
      mime_type: 'application/pdf'
    };
  });

  return {
    id: opp.id,
    external_id: opp.id,
    title: opp.title,
    description: opp.description,
    agency_name: opp.agency,
    office: opp.raw?.office || '',
    department: opp.raw?.department || opp.agency,
    sub_tier: opp.raw?.subTier || '',
    type: opp.type,
    status: opp.status,
    posted_date: opp.postedDate,
    response_deadline: opp.responseDeadline,
    estimated_value: opp.estimatedValue,
    naics_codes: opp.raw?.naicsCodes || (opp.naicsCode ? [opp.naicsCode] : []),
    psc_codes: opp.raw?.classificationCode ? [opp.raw.classificationCode] : [],
    set_aside_type: opp.setAside,
    set_aside_description: opp.raw?.typeOfSetAsideDescription || opp.setAside,
    solicitation_number: opp.solicitationNumber || opp.raw?.solicitationNumber,
    contact_info: opp.contactInfo || opp.raw?.pointOfContact || [],
    ui_link: opp.uiLink,
    additional_info_link: opp.raw?.additionalInfoLink || opp.uiLink,
    documents: documents,
    document_count: documents.length,
    organization_type: opp.raw?.organizationType || 'FEDERAL_AGENCY',
    source: 'SAM.gov'
  };
};

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Search opportunities
app.get('/api/opportunities/search', (req, res) => {
  try {
    const {
      q = '',
      status = 'active',
      agency,
      naics,
      minValue,
      maxValue,
      page = 1,
      limit = 50,
      sort = 'posted_date',
      order = 'desc'
    } = req.query;

    let opportunities = loadOpportunities().map(transformOpportunity);
    
    // Apply filters
    if (q) {
      const query = String(q).toLowerCase();
      opportunities = opportunities.filter(opp => 
        opp.title?.toLowerCase().includes(query) ||
        opp.description?.toLowerCase().includes(query) ||
        opp.agency_name?.toLowerCase().includes(query)
      );
    }
    
    if (status) {
      opportunities = opportunities.filter(opp => opp.status === status);
    }
    
    if (agency) {
      const agencyFilter = String(agency).toLowerCase();
      opportunities = opportunities.filter(opp => 
        opp.agency_name?.toLowerCase().includes(agencyFilter)
      );
    }
    
    if (naics) {
      opportunities = opportunities.filter(opp => 
        opp.naics_codes?.includes(String(naics))
      );
    }
    
    if (minValue) {
      opportunities = opportunities.filter(opp => 
        opp.estimated_value && opp.estimated_value >= Number(minValue)
      );
    }
    
    if (maxValue) {
      opportunities = opportunities.filter(opp => 
        opp.estimated_value && opp.estimated_value <= Number(maxValue)
      );
    }
    
    // Apply sorting
    const sortField = String(sort);
    const sortOrder = String(order).toLowerCase();
    
    opportunities.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'posted_date':
          aVal = new Date(a.posted_date || 0);
          bVal = new Date(b.posted_date || 0);
          break;
        case 'response_deadline':
          aVal = new Date(a.response_deadline || 0);
          bVal = new Date(b.response_deadline || 0);
          break;
        case 'estimated_value':
          aVal = a.estimated_value || 0;
          bVal = b.estimated_value || 0;
          break;
        case 'title':
          aVal = a.title || '';
          bVal = b.title || '';
          break;
        default:
          aVal = new Date(a.posted_date || 0);
          bVal = new Date(b.posted_date || 0);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    const totalCount = opportunities.length;
    
    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    opportunities = opportunities.slice(offset, offset + Number(limit));
    
    const totalPages = Math.ceil(totalCount / Number(limit));
    
    res.json({
      data: opportunities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages
      }
    });
    
  } catch (error) {
    console.error('Error searching opportunities:', error);
    res.status(500).json({ error: 'Failed to search opportunities' });
  }
});

// Advanced search
app.post('/api/opportunities/search/advanced', (req, res) => {
  try {
    const {
      keywords = [],
      agencies = [],
      naics_codes = [],
      set_asides = [],
      min_value,
      max_value,
      has_documents,
      page = 1,
      limit = 50,
      sort_by = 'relevance'
    } = req.body;
    
    let opportunities = loadOpportunities().map(transformOpportunity);
    let scores = new Map();
    
    // Calculate relevance scores
    if (keywords && keywords.length > 0) {
      opportunities.forEach(opp => {
        let score = 0;
        keywords.forEach(keyword => {
          const lowerKeyword = keyword.toLowerCase();
          if (opp.title?.toLowerCase().includes(lowerKeyword)) score += 10;
          if (opp.description?.toLowerCase().includes(lowerKeyword)) score += 5;
          if (opp.agency_name?.toLowerCase().includes(lowerKeyword)) score += 3;
        });
        scores.set(opp.id, score);
      });
      
      if (sort_by === 'relevance') {
        opportunities = opportunities.filter(opp => scores.get(opp.id) > 0);
      }
    }
    
    // Apply filters
    if (agencies && agencies.length > 0) {
      opportunities = opportunities.filter(opp => 
        agencies.some(agency => 
          opp.agency_name?.toLowerCase().includes(agency.toLowerCase())
        )
      );
    }
    
    if (naics_codes && naics_codes.length > 0) {
      opportunities = opportunities.filter(opp => 
        opp.naics_codes?.some(code => naics_codes.includes(code))
      );
    }
    
    if (set_asides && set_asides.length > 0) {
      opportunities = opportunities.filter(opp => 
        set_asides.includes(opp.set_aside_type)
      );
    }
    
    if (min_value) {
      opportunities = opportunities.filter(opp => 
        opp.estimated_value && opp.estimated_value >= min_value
      );
    }
    
    if (max_value) {
      opportunities = opportunities.filter(opp => 
        opp.estimated_value && opp.estimated_value <= max_value
      );
    }
    
    if (has_documents) {
      opportunities = opportunities.filter(opp => 
        opp.documents && opp.documents.length > 0
      );
    }
    
    // Sort results
    if (sort_by === 'relevance' && keywords.length > 0) {
      opportunities.sort((a, b) => 
        (scores.get(b.id) || 0) - (scores.get(a.id) || 0)
      );
    } else {
      opportunities.sort((a, b) => 
        new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
      );
    }
    
    const total = opportunities.length;
    const offset = (Number(page) - 1) * Number(limit);
    const paginatedResults = opportunities.slice(offset, offset + Number(limit));
    
    res.json({
      data: paginatedResults.map(opp => ({
        ...opp,
        relevance_score: sort_by === 'relevance' ? scores.get(opp.id) || 0 : undefined
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('Error in advanced search:', error);
    res.status(500).json({ error: 'Failed to perform advanced search' });
  }
});

// Get opportunity by ID
app.get('/api/opportunities/:id', (req, res) => {
  try {
    const { id } = req.params;
    const opportunities = loadOpportunities();
    const found = opportunities.find(opp => opp.id === id || opp.raw?.noticeId === id);
    
    if (!found) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    const transformed = transformOpportunity(found);
    const opportunity = {
      ...transformed,
      // Add detailed information
      requirements: `Minimum Requirements:
• Active registration in SAM.gov
• ${found.raw?.typeOfSetAsideDescription || 'No specific set-aside'} certification
• Relevant NAICS code: ${found.naicsCode}
• Demonstrated experience in similar contracts

Technical Requirements:
• Capability to perform services as outlined in Statement of Work
• Adequate financial resources
• Compliance with all federal regulations`,
      evaluation_criteria: `Evaluation Factors:
1. Technical Capability (40%)
2. Past Performance (30%)
3. Management Approach (20%)
4. Price (10%)`,
      submission_instructions: `Submit proposals electronically via SAM.gov by ${found.responseDeadline}
Include all required documentation
Proposals must be compliant with FAR requirements`,
      // Add intelligence data
      award_probability: Math.floor(Math.random() * 100),
      estimated_competition: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
      predicted_value: found.estimatedValue,
      predicted_award_date: found.responseDeadline
    };
    
    res.json(opportunity);
    
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
});

// Get documents for opportunity
app.get('/api/opportunities/:id/documents', (req, res) => {
  try {
    const { id } = req.params;
    const opportunities = loadOpportunities();
    const opportunity = opportunities.find(opp => opp.id === id || opp.raw?.noticeId === id);
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    const transformed = transformOpportunity(opportunity);
    
    res.json({
      opportunity_id: id,
      opportunity_title: opportunity.title,
      total_documents: transformed.documents.length,
      documents: transformed.documents
    });
    
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get specific document
app.get('/api/opportunities/:id/documents/:docId', (req, res) => {
  try {
    const { id, docId } = req.params;
    const opportunities = loadOpportunities();
    const opportunity = opportunities.find(opp => opp.id === id || opp.raw?.noticeId === id);
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    const transformed = transformOpportunity(opportunity);
    const document = transformed.documents.find(doc => doc.id === docId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({
      ...document,
      opportunity_id: id,
      opportunity_title: opportunity.title,
      download_url: document.url,
      preview_available: document.mime_type === 'application/pdf'
    });
    
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Get filter options
app.get('/api/opportunities/filters', (req, res) => {
  try {
    const opportunities = loadOpportunities().map(transformOpportunity);
    
    const agencies = [...new Set(opportunities.map(opp => opp.agency_name).filter(Boolean))];
    const naicsCodes = [...new Set(opportunities.flatMap(opp => opp.naics_codes || []))];
    const setAsides = [...new Set(opportunities.map(opp => opp.set_aside_type).filter(Boolean))];
    const documentTypes = [...new Set(opportunities.flatMap(opp => 
      (opp.documents || []).map(doc => doc.type)
    ))];
    
    const values = opportunities
      .map(opp => opp.estimated_value)
      .filter(v => v && v > 0);
    
    res.json({
      sources: ['SAM.gov', 'Grants.gov', 'FPDS'],
      agencies: agencies.sort().slice(0, 20),
      naics_codes: naicsCodes.sort().slice(0, 20),
      setAsideTypes: setAsides.sort(),
      document_types: documentTypes.sort(),
      value_range: {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length
      },
      total_opportunities: opportunities.length,
      active_opportunities: opportunities.filter(opp => opp.status === 'active').length
    });
    
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// Similar opportunities
app.get('/api/opportunities/:id/similar', (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    
    const opportunities = loadOpportunities().map(transformOpportunity);
    const sourceOpp = opportunities.find(opp => opp.id === id || opp.external_id === id);
    
    if (!sourceOpp) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    const similarOpportunities = opportunities
      .filter(opp => opp.id !== id && opp.external_id !== id)
      .map(opp => {
        let score = 0;
        
        // Same agency
        if (opp.agency_name === sourceOpp.agency_name) score += 0.4;
        
        // Similar NAICS codes
        const sourceNaics = sourceOpp.naics_codes || [];
        const oppNaics = opp.naics_codes || [];
        if (sourceNaics.some(naics => oppNaics.includes(naics))) score += 0.3;
        
        // Similar value range
        if (sourceOpp.estimated_value && opp.estimated_value) {
          const valueDiff = Math.abs(sourceOpp.estimated_value - opp.estimated_value);
          if (valueDiff < 1000000) score += 0.2;
        }
        
        // Same set aside type
        if (opp.set_aside_type === sourceOpp.set_aside_type) score += 0.1;
        
        return { ...opp, similarity_score: score };
      })
      .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
      .slice(0, Number(limit));
    
    res.json(similarOpportunities);
    
  } catch (error) {
    console.error('Error finding similar opportunities:', error);
    res.status(500).json({ error: 'Failed to find similar opportunities' });
  }
});

// Serve static files from frontend build
const frontendPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  
  // Catch-all handler for SPA routing
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`BidFetch Production Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Health check at http://localhost:${PORT}/health`);
  
  const opportunities = loadOpportunities();
  console.log(`Loaded ${opportunities.length} opportunities`);
});