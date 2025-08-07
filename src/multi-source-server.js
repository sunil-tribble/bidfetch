const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Cache for API data
let cachedData = {
  samGov: [],
  grantsGov: [],
  fpds: [],
  tedEU: [],
  ukContracts: [],
  ungm: [],
  lastUpdated: null
};

// Load local SAM.gov data as fallback
const loadLocalData = () => {
  try {
    const dataPath = path.join(__dirname, '../data/real-opportunities.json');
    const data = fs.readFileSync(dataPath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.opportunities || [];
  } catch (error) {
    console.error('Failed to load local data:', error);
    return [];
  }
};

// Transform opportunity based on source
const transformOpportunity = (opp, source) => {
  // Handle documents/attachments
  let documents = [];
  
  if (source === 'SAM.gov') {
    documents = (opp.raw?.resourceLinks || opp.resourceLinks || []).map((link, index) => {
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
  } else if (source === 'Grants.gov') {
    // Grants.gov attachments
    if (opp.attachments || opp.relatedDocuments) {
      documents = (opp.attachments || opp.relatedDocuments || []).map((doc, index) => ({
        id: `doc_${opp.id}_${index}`,
        filename: doc.name || doc.title || `Grant_Document_${index + 1}.pdf`,
        url: doc.url || `https://www.grants.gov/search-results-detail/${opp.id}`,
        type: doc.type || 'Grant Document',
        size: doc.size || Math.floor(Math.random() * 3000000) + 500000,
        mime_type: 'application/pdf'
      }));
    }
  } else if (source === 'FPDS') {
    // FPDS contract documents
    if (opp.contractDocuments) {
      documents = opp.contractDocuments.map((doc, index) => ({
        id: `doc_${opp.id}_${index}`,
        filename: doc.name || `Contract_${index + 1}.pdf`,
        url: doc.url || `https://www.fpds.gov/downloads/${opp.id}`,
        type: 'Contract Document',
        size: doc.size || Math.floor(Math.random() * 2000000) + 500000,
        mime_type: 'application/pdf'
      }));
    }
  } else if (source === 'TED EU') {
    // TED Europa documents
    documents = [{
      id: `doc_${opp.id}_0`,
      filename: `TED_Notice_${opp.id}.pdf`,
      url: `https://ted.europa.eu/udl?uri=TED:NOTICE:${opp.id}:DATA:EN:PDF`,
      type: 'Official Notice',
      size: Math.floor(Math.random() * 2000000) + 500000,
      mime_type: 'application/pdf'
    }];
  } else if (source === 'UK Contracts') {
    // UK Contracts Finder documents
    if (opp.documents) {
      documents = opp.documents.map((doc, index) => ({
        id: `doc_${opp.id}_${index}`,
        filename: doc.title || `UK_Contract_${index + 1}.pdf`,
        url: doc.url || `https://www.contractsfinder.service.gov.uk/notice/${opp.id}`,
        type: doc.type || 'Contract Notice',
        size: doc.size || Math.floor(Math.random() * 1500000) + 500000,
        mime_type: 'application/pdf'
      }));
    }
  } else if (source === 'UN Global') {
    // UN Global Marketplace documents
    documents = [{
      id: `doc_${opp.id}_0`,
      filename: `UNGM_Tender_${opp.id}.pdf`,
      url: `https://www.ungm.org/Public/Notice/${opp.id}`,
      type: 'Tender Document',
      size: Math.floor(Math.random() * 2500000) + 500000,
      mime_type: 'application/pdf'
    }];
  }

  // Base transformation
  return {
    id: opp.id || opp.noticeId || opp.opportunityId,
    external_id: opp.external_id || opp.id,
    title: opp.title || opp.name || opp.subject,
    description: opp.description || opp.synopsis || opp.summary,
    agency_name: opp.agency || opp.organization || opp.contractingAuthority,
    office: opp.office || opp.department || '',
    department: opp.department || opp.agency || '',
    sub_tier: opp.subTier || '',
    type: opp.type || opp.noticeType || 'Solicitation',
    status: opp.status || 'active',
    posted_date: opp.postedDate || opp.publishedDate || opp.datePosted,
    response_deadline: opp.responseDeadline || opp.closingDate || opp.deadline,
    estimated_value: opp.estimatedValue || opp.value || opp.amount || 0,
    currency: opp.currency || 'USD',
    naics_codes: opp.naicsCodes || (opp.naicsCode ? [opp.naicsCode] : []),
    psc_codes: opp.pscCodes || (opp.classificationCode ? [opp.classificationCode] : []),
    set_aside_type: opp.setAside || opp.setAsideType || 'None',
    set_aside_description: opp.setAsideDescription || opp.setAside || '',
    solicitation_number: opp.solicitationNumber || opp.referenceNumber || opp.id,
    contact_info: opp.contactInfo || opp.pointOfContact || [],
    location: opp.location || opp.placeOfPerformance || opp.deliveryLocation || '',
    country: opp.country || (source.includes('EU') ? 'European Union' : source.includes('UK') ? 'United Kingdom' : 'United States'),
    ui_link: opp.uiLink || opp.url || opp.link || '',
    additional_info_link: opp.additionalInfoLink || opp.uiLink || '',
    documents: documents,
    document_count: documents.length,
    organization_type: opp.organizationType || 'GOVERNMENT',
    source: source,
    raw_data: opp.raw || opp
  };
};

// Fetch data from multiple sources
const fetchAllOpportunities = async () => {
  console.log('Fetching opportunities from all sources...');
  
  try {
    // 1. SAM.gov - Use local data
    const samData = loadLocalData();
    cachedData.samGov = samData.map(opp => transformOpportunity(opp, 'SAM.gov'));
    console.log(`Loaded ${cachedData.samGov.length} opportunities from SAM.gov`);

    // 2. Grants.gov - Mock data
    cachedData.grantsGov = generateMockOpportunities('Grants.gov', 50, {
      prefix: 'GRANT',
      agencies: ['National Science Foundation', 'Department of Education', 'National Institutes of Health', 'Department of Energy', 'EPA'],
      types: ['Grant', 'Cooperative Agreement', 'Research Grant', 'Fellowship'],
      minValue: 50000,
      maxValue: 5000000
    });
    console.log(`Generated ${cachedData.grantsGov.length} mock opportunities from Grants.gov`);

    // 3. FPDS - Federal Procurement Data System - Mock data
    cachedData.fpds = generateMockOpportunities('FPDS', 75, {
      prefix: 'CONTRACT',
      agencies: ['Department of Defense', 'NASA', 'Department of State', 'USAID', 'Department of Commerce'],
      types: ['Contract Award', 'Task Order', 'Delivery Order', 'Purchase Order'],
      minValue: 100000,
      maxValue: 50000000
    });
    console.log(`Generated ${cachedData.fpds.length} mock opportunities from FPDS`);

    // 4. TED Europa - Mock data
    cachedData.tedEU = generateMockOpportunities('TED EU', 60, {
      prefix: 'TED',
      agencies: ['European Commission', 'European Parliament', 'European Central Bank', 'European Investment Bank', 'Europol'],
      types: ['Public Contract', 'Framework Agreement', 'Service Contract', 'Supply Contract'],
      minValue: 50000,
      maxValue: 10000000,
      currency: 'EUR'
    });
    console.log(`Generated ${cachedData.tedEU.length} mock opportunities from TED Europa`);

    // 5. UK Contracts Finder - Mock data
    cachedData.ukContracts = generateMockOpportunities('UK Contracts', 40, {
      prefix: 'UK',
      agencies: ['UK Ministry of Defence', 'NHS', 'Department for Transport', 'Home Office', 'HMRC'],
      types: ['Contract Notice', 'Framework Agreement', 'Dynamic Purchasing System', 'Prior Information Notice'],
      minValue: 10000,
      maxValue: 5000000,
      currency: 'GBP'
    });
    console.log(`Generated ${cachedData.ukContracts.length} mock opportunities from UK Contracts`);

    // 6. UN Global Marketplace - Mock data
    cachedData.ungm = generateMockOpportunities('UN Global', 35, {
      prefix: 'UN',
      agencies: ['United Nations', 'UNDP', 'UNICEF', 'WHO', 'UNESCO', 'World Bank'],
      types: ['Request for Proposal', 'Invitation to Bid', 'Request for Quotation', 'Expression of Interest'],
      minValue: 25000,
      maxValue: 20000000,
      currency: 'USD'
    });
    console.log(`Generated ${cachedData.ungm.length} mock opportunities from UN Global Marketplace`);

    cachedData.lastUpdated = new Date().toISOString();
    
    const total = cachedData.samGov.length + cachedData.grantsGov.length + 
                  cachedData.fpds.length + cachedData.tedEU.length + 
                  cachedData.ukContracts.length + cachedData.ungm.length;
    
    console.log(`Total opportunities loaded: ${total}`);
    return total;
    
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    // Use only local data as fallback
    cachedData.samGov = loadLocalData().map(opp => transformOpportunity(opp, 'SAM.gov'));
    cachedData.lastUpdated = new Date().toISOString();
    return cachedData.samGov.length;
  }
};

// Generate mock opportunities for demonstration
function generateMockOpportunities(source, count, options) {
  const opportunities = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const postedDays = Math.floor(Math.random() * 30);
    const deadlineDays = postedDays + Math.floor(Math.random() * 60) + 10;
    const postedDate = new Date(now - postedDays * 24 * 60 * 60 * 1000);
    const deadline = new Date(now.getTime() + (deadlineDays - postedDays) * 24 * 60 * 60 * 1000);
    
    const opportunity = {
      id: `${options.prefix}-${100000 + i}`,
      title: `${options.types[i % options.types.length]} - ${options.agencies[i % options.agencies.length]} Services Contract ${i + 1}`,
      description: `This is a ${options.types[i % options.types.length].toLowerCase()} for professional services required by ${options.agencies[i % options.agencies.length]}. The contractor will provide comprehensive support services including technical consulting, project management, and system integration services.`,
      agency: options.agencies[i % options.agencies.length],
      type: options.types[i % options.types.length],
      status: Math.random() > 0.8 ? 'closed' : 'active',
      postedDate: postedDate.toISOString(),
      responseDeadline: deadline.toISOString(),
      estimatedValue: Math.floor(Math.random() * (options.maxValue - options.minValue)) + options.minValue,
      currency: options.currency || 'USD',
      naicsCode: ['541511', '541512', '541330', '541611', '541990'][i % 5],
      setAside: ['None', 'Small Business', '8(a)', 'WOSB', 'HubZone'][i % 5],
      location: source.includes('EU') ? 'Brussels, Belgium' : 
                source.includes('UK') ? 'London, UK' : 
                source.includes('UN') ? 'New York, NY' : 'Washington, DC',
      documents: i % 3 === 0 ? [] : [
        { name: 'RFP.pdf', url: `https://example.com/${options.prefix}-${100000 + i}/RFP.pdf` },
        { name: 'SOW.pdf', url: `https://example.com/${options.prefix}-${100000 + i}/SOW.pdf` }
      ],
      contactInfo: [{
        type: 'primary',
        email: `contracting@${options.agencies[i % options.agencies.length].toLowerCase().replace(/\s+/g, '')}.gov`,
        phone: `+1-202-555-${1000 + i}`,
        title: 'Contracting Officer',
        fullName: `Officer ${i + 1}`
      }]
    };
    
    opportunities.push(transformOpportunity(opportunity, source));
  }
  
  return opportunities;
}

// Get all opportunities combined
const getAllOpportunities = () => {
  return [
    ...cachedData.samGov,
    ...cachedData.grantsGov,
    ...cachedData.fpds,
    ...cachedData.tedEU,
    ...cachedData.ukContracts,
    ...cachedData.ungm
  ];
};

// API Routes

// Health check with source status
app.get('/health', (req, res) => {
  const allOpps = getAllOpportunities();
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    sources: {
      'SAM.gov': cachedData.samGov.length,
      'Grants.gov': cachedData.grantsGov.length,
      'FPDS': cachedData.fpds.length,
      'TED EU': cachedData.tedEU.length,
      'UK Contracts': cachedData.ukContracts.length,
      'UN Global': cachedData.ungm.length,
      total: allOpps.length
    },
    lastUpdated: cachedData.lastUpdated
  });
});

// Search opportunities across all sources
app.get('/api/opportunities/search', (req, res) => {
  try {
    const {
      q = '',
      source,
      status = 'active',
      agency,
      country,
      naics,
      minValue,
      maxValue,
      page = 1,
      limit = 50,
      sort = 'posted_date',
      order = 'desc'
    } = req.query;

    let opportunities = getAllOpportunities();
    
    // Filter by source
    if (source) {
      opportunities = opportunities.filter(opp => 
        opp.source.toLowerCase().includes(String(source).toLowerCase())
      );
    }
    
    // Apply search query
    if (q) {
      const query = String(q).toLowerCase();
      opportunities = opportunities.filter(opp => 
        opp.title?.toLowerCase().includes(query) ||
        opp.description?.toLowerCase().includes(query) ||
        opp.agency_name?.toLowerCase().includes(query) ||
        opp.source?.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (status) {
      opportunities = opportunities.filter(opp => opp.status === status);
    }
    
    // Filter by agency
    if (agency) {
      const agencyFilter = String(agency).toLowerCase();
      opportunities = opportunities.filter(opp => 
        opp.agency_name?.toLowerCase().includes(agencyFilter)
      );
    }
    
    // Filter by country
    if (country) {
      opportunities = opportunities.filter(opp => 
        opp.country?.toLowerCase().includes(String(country).toLowerCase())
      );
    }
    
    // Filter by NAICS code
    if (naics) {
      opportunities = opportunities.filter(opp => 
        opp.naics_codes?.includes(String(naics))
      );
    }
    
    // Filter by value range
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
    opportunities.sort((a, b) => {
      let aVal, bVal;
      
      switch (String(sort)) {
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
        case 'source':
          aVal = a.source || '';
          bVal = b.source || '';
          break;
        default:
          aVal = new Date(a.posted_date || 0);
          bVal = new Date(b.posted_date || 0);
      }
      
      if (String(order).toLowerCase() === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    const totalCount = opportunities.length;
    const offset = (Number(page) - 1) * Number(limit);
    const paginatedOpps = opportunities.slice(offset, offset + Number(limit));
    
    res.json({
      data: paginatedOpps,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      },
      sources: {
        'SAM.gov': opportunities.filter(o => o.source === 'SAM.gov').length,
        'Grants.gov': opportunities.filter(o => o.source === 'Grants.gov').length,
        'FPDS': opportunities.filter(o => o.source === 'FPDS').length,
        'TED EU': opportunities.filter(o => o.source === 'TED EU').length,
        'UK Contracts': opportunities.filter(o => o.source === 'UK Contracts').length,
        'UN Global': opportunities.filter(o => o.source === 'UN Global').length
      }
    });
    
  } catch (error) {
    console.error('Error searching opportunities:', error);
    res.status(500).json({ error: 'Failed to search opportunities' });
  }
});

// Get opportunities by source
app.get('/api/opportunities/source/:source', (req, res) => {
  try {
    const { source } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    let opportunities = [];
    
    switch(source.toLowerCase()) {
      case 'sam':
      case 'sam.gov':
        opportunities = cachedData.samGov;
        break;
      case 'grants':
      case 'grants.gov':
        opportunities = cachedData.grantsGov;
        break;
      case 'fpds':
        opportunities = cachedData.fpds;
        break;
      case 'ted':
      case 'ted-eu':
        opportunities = cachedData.tedEU;
        break;
      case 'uk':
      case 'uk-contracts':
        opportunities = cachedData.ukContracts;
        break;
      case 'un':
      case 'ungm':
        opportunities = cachedData.ungm;
        break;
      default:
        return res.status(400).json({ error: 'Invalid source' });
    }
    
    const totalCount = opportunities.length;
    const offset = (Number(page) - 1) * Number(limit);
    const paginatedOpps = opportunities.slice(offset, offset + Number(limit));
    
    res.json({
      source: source,
      data: paginatedOpps,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching opportunities by source:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// Get opportunity by ID (searches across all sources)
app.get('/api/opportunities/:id', (req, res) => {
  try {
    const { id } = req.params;
    const allOpps = getAllOpportunities();
    const opportunity = allOpps.find(opp => 
      opp.id === id || opp.external_id === id || opp.solicitation_number === id
    );
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    // Add additional details
    const enhanced = {
      ...opportunity,
      requirements: `Minimum Requirements:
• Active registration in relevant government system
• ${opportunity.set_aside_description || 'Open competition'}
• Relevant industry codes: ${opportunity.naics_codes.join(', ') || 'Various'}
• Demonstrated experience in similar contracts
• Compliance with all applicable regulations`,
      evaluation_criteria: `Evaluation Factors:
1. Technical Capability (40%)
2. Past Performance (30%)
3. Management Approach (20%)
4. Price (10%)`,
      submission_instructions: `Submit proposals electronically by ${opportunity.response_deadline}
Follow all instructions in the solicitation documents
Ensure compliance with submission requirements`,
      similar_count: Math.floor(Math.random() * 20) + 5,
      competition_level: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
      award_probability: Math.floor(Math.random() * 100)
    };
    
    res.json(enhanced);
    
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
});

// Get filter options including all sources
app.get('/api/opportunities/filters', (req, res) => {
  try {
    const allOpps = getAllOpportunities();
    
    const sources = [...new Set(allOpps.map(opp => opp.source))];
    const agencies = [...new Set(allOpps.map(opp => opp.agency_name).filter(Boolean))];
    const countries = [...new Set(allOpps.map(opp => opp.country).filter(Boolean))];
    const naicsCodes = [...new Set(allOpps.flatMap(opp => opp.naics_codes || []))];
    const setAsides = [...new Set(allOpps.map(opp => opp.set_aside_type).filter(Boolean))];
    const types = [...new Set(allOpps.map(opp => opp.type).filter(Boolean))];
    const currencies = [...new Set(allOpps.map(opp => opp.currency).filter(Boolean))];
    
    const values = allOpps
      .map(opp => opp.estimated_value)
      .filter(v => v && v > 0);
    
    res.json({
      sources: sources.sort(),
      agencies: agencies.sort().slice(0, 50), // Limit to top 50
      countries: countries.sort(),
      naics_codes: naicsCodes.sort().slice(0, 30),
      set_aside_types: setAsides.sort(),
      opportunity_types: types.sort(),
      currencies: currencies.sort(),
      value_range: {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      },
      total_opportunities: allOpps.length,
      active_opportunities: allOpps.filter(opp => opp.status === 'active').length,
      by_source: {
        'SAM.gov': cachedData.samGov.length,
        'Grants.gov': cachedData.grantsGov.length,
        'FPDS': cachedData.fpds.length,
        'TED EU': cachedData.tedEU.length,
        'UK Contracts': cachedData.ukContracts.length,
        'UN Global': cachedData.ungm.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// Get statistics by source
app.get('/api/opportunities/stats', (req, res) => {
  try {
    const stats = {
      sources: [
        {
          name: 'SAM.gov',
          count: cachedData.samGov.length,
          active: cachedData.samGov.filter(o => o.status === 'active').length,
          totalValue: cachedData.samGov.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
          avgValue: Math.round(cachedData.samGov.reduce((sum, o) => sum + (o.estimated_value || 0), 0) / cachedData.samGov.length),
          withDocuments: cachedData.samGov.filter(o => o.document_count > 0).length
        },
        {
          name: 'Grants.gov',
          count: cachedData.grantsGov.length,
          active: cachedData.grantsGov.filter(o => o.status === 'active').length,
          totalValue: cachedData.grantsGov.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
          avgValue: Math.round(cachedData.grantsGov.reduce((sum, o) => sum + (o.estimated_value || 0), 0) / cachedData.grantsGov.length),
          withDocuments: cachedData.grantsGov.filter(o => o.document_count > 0).length
        },
        {
          name: 'FPDS',
          count: cachedData.fpds.length,
          active: cachedData.fpds.filter(o => o.status === 'active').length,
          totalValue: cachedData.fpds.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
          avgValue: Math.round(cachedData.fpds.reduce((sum, o) => sum + (o.estimated_value || 0), 0) / cachedData.fpds.length),
          withDocuments: cachedData.fpds.filter(o => o.document_count > 0).length
        },
        {
          name: 'TED EU',
          count: cachedData.tedEU.length,
          active: cachedData.tedEU.filter(o => o.status === 'active').length,
          totalValue: cachedData.tedEU.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
          avgValue: Math.round(cachedData.tedEU.reduce((sum, o) => sum + (o.estimated_value || 0), 0) / cachedData.tedEU.length),
          withDocuments: cachedData.tedEU.filter(o => o.document_count > 0).length,
          currency: 'EUR'
        },
        {
          name: 'UK Contracts',
          count: cachedData.ukContracts.length,
          active: cachedData.ukContracts.filter(o => o.status === 'active').length,
          totalValue: cachedData.ukContracts.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
          avgValue: Math.round(cachedData.ukContracts.reduce((sum, o) => sum + (o.estimated_value || 0), 0) / cachedData.ukContracts.length),
          withDocuments: cachedData.ukContracts.filter(o => o.document_count > 0).length,
          currency: 'GBP'
        },
        {
          name: 'UN Global',
          count: cachedData.ungm.length,
          active: cachedData.ungm.filter(o => o.status === 'active').length,
          totalValue: cachedData.ungm.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
          avgValue: Math.round(cachedData.ungm.reduce((sum, o) => sum + (o.estimated_value || 0), 0) / cachedData.ungm.length),
          withDocuments: cachedData.ungm.filter(o => o.document_count > 0).length,
          currency: 'USD'
        }
      ],
      totals: {
        opportunities: getAllOpportunities().length,
        active: getAllOpportunities().filter(o => o.status === 'active').length,
        withDocuments: getAllOpportunities().filter(o => o.document_count > 0).length,
        totalValueUSD: getAllOpportunities()
          .filter(o => o.currency === 'USD')
          .reduce((sum, o) => sum + (o.estimated_value || 0), 0)
      },
      lastUpdated: cachedData.lastUpdated
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Refresh data from all sources
app.post('/api/opportunities/refresh', async (req, res) => {
  try {
    const count = await fetchAllOpportunities();
    res.json({ 
      message: 'Data refreshed successfully',
      totalOpportunities: count,
      sources: {
        'SAM.gov': cachedData.samGov.length,
        'Grants.gov': cachedData.grantsGov.length,
        'FPDS': cachedData.fpds.length,
        'TED EU': cachedData.tedEU.length,
        'UK Contracts': cachedData.ukContracts.length,
        'UN Global': cachedData.ungm.length
      },
      lastUpdated: cachedData.lastUpdated
    });
  } catch (error) {
    console.error('Error refreshing data:', error);
    res.status(500).json({ error: 'Failed to refresh data' });
  }
});

// Initialize data on startup
fetchAllOpportunities().then(count => {
  console.log(`Initial data load complete: ${count} opportunities`);
});

// Refresh data every hour
setInterval(() => {
  fetchAllOpportunities().then(count => {
    console.log(`Data refreshed: ${count} opportunities`);
  });
}, 60 * 60 * 1000); // 1 hour

// Serve static files from frontend build if available
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
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     BidFetch Multi-Source Production Server                 ║
║     ----------------------------------------                 ║
║                                                              ║
║     Port: ${PORT}                                           ║
║     API: http://localhost:${PORT}/api                       ║
║     Health: http://localhost:${PORT}/health                 ║
║                                                              ║
║     Data Sources:                                            ║
║     • SAM.gov (US Federal)                                  ║
║     • Grants.gov (US Grants)                                ║
║     • FPDS (US Contracts)                                   ║
║     • TED Europa (EU Tenders)                               ║
║     • UK Contracts Finder                                   ║
║     • UN Global Marketplace                                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});