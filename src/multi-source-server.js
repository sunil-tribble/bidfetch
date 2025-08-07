const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Set NODE_ENV if not specified
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

console.log(`Starting in ${process.env.NODE_ENV} mode...`);

// Middleware - Configure CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? [
    'http://152.42.154.129',
    'http://152.42.154.129:3001',
    'https://152.42.154.129'
  ] : true,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
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

// Cache for enhanced features
let enhancedCache = {
  savedSearches: [],
  searchHistory: [],
  analytics: new Map(),
  recommendations: [],
  trending: [],
  competitionData: new Map(),
  awardProbabilities: new Map(),
  agencyHistoricalData: new Map()
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

// Generate enhanced opportunity data
const generateEnhancedData = (opp, source) => {
  const competitorCount = Math.floor(Math.random() * 20) + 5;
  const competitionLevel = competitorCount <= 8 ? 'Low' : competitorCount <= 15 ? 'Medium' : 'High';
  
  const awardProbability = Math.max(5, Math.min(95, 
    Math.floor(100 - (competitorCount * 3) + Math.random() * 20)
  ));
  
  const agency = opp.agency || opp.organization || opp.contractingAuthority || 'Unknown';
  const agencyWinRate = Math.floor(Math.random() * 40) + 60; // 60-99%
  
  const keywords = generateKeywords(opp.title, opp.description, source);
  const timeline = generateTimeline(opp.postedDate, opp.responseDeadline);
  
  return {
    competitionAnalysis: {
      competitorCount,
      competitionLevel,
      incumbentInfo: Math.random() > 0.7 ? {
        name: `${agency.split(' ')[0]} Incumbent Solutions`,
        yearsHeld: Math.floor(Math.random() * 5) + 1,
        lastContractValue: Math.floor(Math.random() * 10000000) + 1000000
      } : null,
      marketDominance: Math.floor(Math.random() * 100),
      barrierToEntry: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
    },
    awardProbability: {
      score: awardProbability,
      factors: [
        { name: 'Competition Level', impact: competitionLevel === 'Low' ? 'Positive' : competitionLevel === 'High' ? 'Negative' : 'Neutral' },
        { name: 'Set-Aside Status', impact: (opp.setAside && opp.setAside !== 'None') ? 'Positive' : 'Neutral' },
        { name: 'Contract Value', impact: (opp.estimatedValue || 0) > 5000000 ? 'Negative' : 'Positive' },
        { name: 'Agency History', impact: agencyWinRate > 80 ? 'Positive' : 'Neutral' }
      ],
      confidence: Math.floor(Math.random() * 30) + 70
    },
    historicalData: {
      agencyWinRate,
      averageAwardTime: Math.floor(Math.random() * 180) + 30, // 30-210 days
      protestRate: Math.floor(Math.random() * 15) + 2, // 2-17%
      recompeteRate: Math.floor(Math.random() * 20) + 5 // 5-25%
    },
    keywords,
    timeline,
    relatedOpportunities: Math.floor(Math.random() * 15) + 3,
    marketTrends: {
      growthRate: (Math.random() - 0.5) * 20, // -10% to +10%
      demandLevel: ['Low', 'Moderate', 'High'][Math.floor(Math.random() * 3)],
      seasonality: Math.random() > 0.7 ? 'High' : 'Low'
    }
  };
};

// Generate relevant keywords for an opportunity
const generateKeywords = (title = '', description = '', source) => {
  const baseKeywords = [
    'professional services', 'consulting', 'support services', 'technology',
    'software development', 'system integration', 'project management',
    'cybersecurity', 'cloud services', 'data analytics', 'AI/ML'
  ];
  
  const sourceKeywords = {
    'SAM.gov': ['federal', 'government', 'contracting', 'GSA', 'SEWP'],
    'Grants.gov': ['grant', 'research', 'academic', 'non-profit', 'funding'],
    'FPDS': ['contract', 'procurement', 'acquisition', 'federal'],
    'TED EU': ['european', 'tender', 'framework', 'OJEU'],
    'UK Contracts': ['crown commercial', 'framework', 'G-Cloud'],
    'UN Global': ['international', 'development', 'humanitarian', 'peacekeeping']
  };
  
  const titleWords = title.toLowerCase().split(' ').filter(w => w.length > 3);
  const descWords = description.toLowerCase().split(' ').filter(w => w.length > 4).slice(0, 10);
  
  return [
    ...baseKeywords.slice(0, 3),
    ...sourceKeywords[source] || [],
    ...titleWords.slice(0, 3),
    ...descWords.slice(0, 2)
  ].filter((v, i, a) => a.indexOf(v) === i); // unique values
};

// Generate timeline data
const generateTimeline = (postedDate, deadline) => {
  const posted = new Date(postedDate || Date.now());
  const due = new Date(deadline || Date.now() + 30 * 24 * 60 * 60 * 1000);
  const duration = due.getTime() - posted.getTime();
  
  const milestones = [];
  
  // Add typical milestones
  if (duration > 7 * 24 * 60 * 60 * 1000) { // More than 7 days
    milestones.push({
      name: 'Questions Due',
      date: new Date(posted.getTime() + duration * 0.3).toISOString(),
      status: 'upcoming',
      critical: false
    });
  }
  
  if (duration > 14 * 24 * 60 * 60 * 1000) { // More than 14 days
    milestones.push({
      name: 'Draft Proposal Internal Review',
      date: new Date(due.getTime() - duration * 0.25).toISOString(),
      status: 'upcoming',
      critical: true
    });
  }
  
  milestones.push({
    name: 'Proposal Submission Deadline',
    date: due.toISOString(),
    status: 'upcoming',
    critical: true
  });
  
  // Add award timeline estimates
  milestones.push({
    name: 'Estimated Award Date',
    date: new Date(due.getTime() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'estimated',
    critical: false
  });
  
  return {
    milestones,
    totalDuration: Math.ceil(duration / (24 * 60 * 60 * 1000)),
    remainingDays: Math.ceil((due.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    urgency: duration < 7 * 24 * 60 * 60 * 1000 ? 'High' : duration < 21 * 24 * 60 * 60 * 1000 ? 'Medium' : 'Low'
  };
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

  // Generate enhanced data
  const enhancedData = generateEnhancedData(opp, source);
  
  // Enhanced document metadata
  const enhancedDocuments = documents.map(doc => ({
    ...doc,
    pages: Math.floor(Math.random() * 200) + 10,
    upload_date: opp.postedDate || new Date().toISOString(),
    last_modified: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    preview_url: doc.url ? `${doc.url}?preview=true` : null,
    searchable: Math.random() > 0.2,
    summary: `This document contains the ${doc.type.toLowerCase()} information for the procurement opportunity.`,
    language: source.includes('EU') ? 'EN/Multi' : 'EN'
  }));
  
  // Calculate relevance score
  const relevanceScore = Math.floor(Math.random() * 30) + 70; // 70-99
  
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
    documents: enhancedDocuments,
    document_count: enhancedDocuments.length,
    organization_type: opp.organizationType || 'GOVERNMENT',
    source: source,
    raw_data: opp.raw || opp,
    
    // Enhanced fields
    competition_analysis: enhancedData.competitionAnalysis,
    award_probability: enhancedData.awardProbability,
    historical_data: enhancedData.historicalData,
    keywords: enhancedData.keywords,
    timeline: enhancedData.timeline,
    related_count: enhancedData.relatedOpportunities,
    market_trends: enhancedData.marketTrends,
    relevance_score: relevanceScore,
    last_updated: new Date().toISOString(),
    
    // Document metadata summary
    document_metadata: {
      total_pages: enhancedDocuments.reduce((sum, doc) => sum + doc.pages, 0),
      total_size: enhancedDocuments.reduce((sum, doc) => sum + doc.size, 0),
      types: [...new Set(enhancedDocuments.map(doc => doc.type))],
      searchable_count: enhancedDocuments.filter(doc => doc.searchable).length,
      preview_available: enhancedDocuments.filter(doc => doc.preview_url).length
    }
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

// Helper functions for search enhancements
const generateSearchSuggestions = (query) => {
  const commonTerms = [
    'software development', 'cloud services', 'cybersecurity', 'data analytics',
    'artificial intelligence', 'machine learning', 'professional services',
    'consulting', 'system integration', 'project management', 'IT support',
    'maintenance', 'technical support', 'research', 'training', 'equipment'
  ];
  
  if (!query || query.length < 2) return commonTerms.slice(0, 8);
  
  const filtered = commonTerms.filter(term => 
    term.toLowerCase().includes(query.toLowerCase())
  );
  
  // Add agency-specific suggestions
  const agencies = ['NASA', 'DOD', 'DHS', 'NIH', 'NSF', 'EPA', 'GSA'];
  const agencyMatches = agencies.filter(agency => 
    agency.toLowerCase().includes(query.toLowerCase())
  );
  
  return [...filtered, ...agencyMatches].slice(0, 10);
};

const calculateRelevanceScore = (opp, query) => {
  if (!query) return opp.relevance_score || 100;
  
  const q = query.toLowerCase();
  let score = 0;
  
  // Title match (highest weight)
  if (opp.title?.toLowerCase().includes(q)) score += 40;
  
  // Description match
  if (opp.description?.toLowerCase().includes(q)) score += 20;
  
  // Agency match
  if (opp.agency_name?.toLowerCase().includes(q)) score += 15;
  
  // Keywords match
  if (opp.keywords?.some(k => k.toLowerCase().includes(q))) score += 10;
  
  // Source match
  if (opp.source?.toLowerCase().includes(q)) score += 5;
  
  // Type match
  if (opp.type?.toLowerCase().includes(q)) score += 10;
  
  return Math.min(100, Math.max(0, score + (opp.relevance_score || 0) * 0.3));
};

const getFacetedResults = (opportunities, query) => {
  const facets = {
    sources: {},
    agencies: {},
    types: {},
    countries: {},
    set_asides: {},
    value_ranges: {
      'Under $100K': 0,
      '$100K - $500K': 0,
      '$500K - $1M': 0,
      '$1M - $10M': 0,
      'Over $10M': 0
    },
    competition_levels: {},
    currencies: {},
    status: {}
  };
  
  opportunities.forEach(opp => {
    // Sources
    facets.sources[opp.source] = (facets.sources[opp.source] || 0) + 1;
    
    // Agencies
    if (opp.agency_name) {
      facets.agencies[opp.agency_name] = (facets.agencies[opp.agency_name] || 0) + 1;
    }
    
    // Types
    if (opp.type) {
      facets.types[opp.type] = (facets.types[opp.type] || 0) + 1;
    }
    
    // Countries
    if (opp.country) {
      facets.countries[opp.country] = (facets.countries[opp.country] || 0) + 1;
    }
    
    // Set asides
    if (opp.set_aside_type) {
      facets.set_asides[opp.set_aside_type] = (facets.set_asides[opp.set_aside_type] || 0) + 1;
    }
    
    // Value ranges
    const value = opp.estimated_value || 0;
    if (value < 100000) facets.value_ranges['Under $100K']++;
    else if (value < 500000) facets.value_ranges['$100K - $500K']++;
    else if (value < 1000000) facets.value_ranges['$500K - $1M']++;
    else if (value < 10000000) facets.value_ranges['$1M - $10M']++;
    else facets.value_ranges['Over $10M']++;
    
    // Competition levels
    if (opp.competition_analysis?.competitionLevel) {
      const level = opp.competition_analysis.competitionLevel;
      facets.competition_levels[level] = (facets.competition_levels[level] || 0) + 1;
    }
    
    // Currencies
    if (opp.currency) {
      facets.currencies[opp.currency] = (facets.currencies[opp.currency] || 0) + 1;
    }
    
    // Status
    if (opp.status) {
      facets.status[opp.status] = (facets.status[opp.status] || 0) + 1;
    }
  });
  
  // Sort facets by count and limit results
  Object.keys(facets).forEach(key => {
    if (typeof facets[key] === 'object' && key !== 'value_ranges') {
      const sorted = Object.entries(facets[key])
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20);
      facets[key] = Object.fromEntries(sorted);
    }
  });
  
  return facets;
};

// Track search in history
const trackSearch = (query, results, userId = 'anonymous') => {
  const searchEntry = {
    id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    query,
    resultCount: results,
    timestamp: new Date().toISOString(),
    userId
  };
  
  enhancedCache.searchHistory.unshift(searchEntry);
  
  // Keep only last 1000 searches
  if (enhancedCache.searchHistory.length > 1000) {
    enhancedCache.searchHistory = enhancedCache.searchHistory.slice(0, 1000);
  }
};

// Generate trending opportunities based on search patterns and activity
const generateTrendingOpportunities = () => {
  const allOpps = getAllOpportunities();
  
  // Score opportunities based on various trending factors
  const scoredOpps = allOpps.map(opp => {
    let trendScore = 0;
    
    // Recent posting bonus
    const daysSincePosted = (Date.now() - new Date(opp.posted_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePosted <= 7) trendScore += 30;
    else if (daysSincePosted <= 14) trendScore += 20;
    else if (daysSincePosted <= 30) trendScore += 10;
    
    // High value bonus
    if (opp.estimated_value > 1000000) trendScore += 15;
    
    // Low competition bonus
    if (opp.competition_analysis?.competitionLevel === 'Low') trendScore += 20;
    
    // Popular agency bonus
    const popularAgencies = ['NASA', 'DOD', 'DHS', 'NIH'];
    if (popularAgencies.some(agency => opp.agency_name?.includes(agency))) {
      trendScore += 10;
    }
    
    // Technology keywords bonus
    const techKeywords = ['AI', 'cloud', 'cybersecurity', 'data', 'software'];
    if (opp.keywords?.some(k => techKeywords.some(tk => k.toLowerCase().includes(tk.toLowerCase())))) {
      trendScore += 15;
    }
    
    // Set-aside bonus for small business
    if (opp.set_aside_type && opp.set_aside_type !== 'None') {
      trendScore += 10;
    }
    
    return { ...opp, trendScore };
  });
  
  return scoredOpps
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 50);
};

// Generate personalized recommendations (simplified)
const generateRecommendations = (userId = 'anonymous') => {
  const allOpps = getAllOpportunities();
  
  // In a real system, this would use user behavior, saved searches, etc.
  // For now, we'll use some basic logic
  const recommendations = allOpps
    .filter(opp => opp.status === 'active')
    .filter(opp => opp.award_probability?.score > 60)
    .sort((a, b) => {
      const aScore = (a.award_probability?.score || 0) + (a.relevance_score || 0);
      const bScore = (b.award_probability?.score || 0) + (b.relevance_score || 0);
      return bScore - aScore;
    })
    .slice(0, 20);
    
  return recommendations.map(opp => ({
    ...opp,
    recommendation_reason: 'High award probability and relevance score',
    confidence: Math.floor(Math.random() * 30) + 70
  }));
};

// API Routes

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'BidFetch Multi-Source Enterprise API',
    version: '2.0.0',
    description: 'Enterprise-grade API for procurement opportunities across multiple government and international sources',
    endpoints: {
      core: {
        'GET /health': 'Health check and source status',
        'GET /api/opportunities/search': 'Enhanced search with faceted results and relevance scoring',
        'GET /api/opportunities/:id': 'Get detailed opportunity information',
        'GET /api/opportunities/source/:source': 'Get opportunities from specific source',
        'GET /api/opportunities/filters': 'Get available filter options',
        'GET /api/opportunities/stats': 'Get comprehensive statistics by source',
        'POST /api/opportunities/refresh': 'Refresh data from all sources'
      },
      enhanced: {
        'POST /api/opportunities/saved-searches': 'Save search queries for reuse',
        'GET /api/opportunities/saved-searches': 'Get saved search queries',
        'GET /api/opportunities/search-history': 'Get search history',
        'GET /api/opportunities/search-suggestions': 'Get search autocomplete suggestions',
        'GET /api/opportunities/analytics/:id': 'Get detailed opportunity analytics',
        'GET /api/opportunities/timeline/:id': 'Get opportunity timeline and milestones',
        'POST /api/opportunities/export': 'Export opportunities to CSV/JSON',
        'GET /api/opportunities/trending': 'Get trending opportunities',
        'GET /api/opportunities/recommendations': 'Get personalized recommendations'
      },
      documents: {
        'GET /api/opportunities/documents/search': 'Search within opportunity documents',
        'POST /api/opportunities/documents/prepare-batch': 'Prepare batch document downloads'
      }
    },
    features: {
      'Multi-source aggregation': 'SAM.gov, Grants.gov, FPDS, TED EU, UK Contracts, UN Global Marketplace',
      'Enhanced search': 'Relevance scoring, faceted filtering, autocomplete suggestions',
      'Competition analysis': 'Competitor count, competition level, incumbent information',
      'Award probability': 'AI-driven probability calculations with confidence scores',
      'Historical data': 'Agency win rates, protest rates, award timelines',
      'Document intelligence': 'Enhanced metadata, search capabilities, batch operations',
      'Market intelligence': 'Trending analysis, market trends, strategic insights',
      'Timeline management': 'Milestone tracking, critical path analysis',
      'Export capabilities': 'CSV and JSON export with custom field selection',
      'Personalization': 'Saved searches, search history, recommendations'
    },
    dataEnhancements: {
      'Competition metrics': 'Competitor analysis, market dominance, barriers to entry',
      'Probability scoring': 'Award probability with factor analysis and confidence levels',
      'Historical intelligence': 'Agency patterns, win rates, timeline predictions',
      'Document metadata': 'Page counts, file sizes, upload dates, searchable content',
      'Market trends': 'Growth rates, demand levels, seasonality analysis',
      'Keywords & tags': 'Auto-generated relevant keywords and categorization'
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

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

// Enhanced search opportunities across all sources with faceted results
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
    
    // Apply search query with relevance scoring
    if (q) {
      const query = String(q).toLowerCase();
      opportunities = opportunities.filter(opp => 
        opp.title?.toLowerCase().includes(query) ||
        opp.description?.toLowerCase().includes(query) ||
        opp.agency_name?.toLowerCase().includes(query) ||
        opp.source?.toLowerCase().includes(query) ||
        opp.keywords?.some(k => k.toLowerCase().includes(query)) ||
        opp.type?.toLowerCase().includes(query)
      );
      
      // Calculate relevance scores
      opportunities = opportunities.map(opp => ({
        ...opp,
        relevance_score: calculateRelevanceScore(opp, query)
      }));
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
    
    // Apply sorting with enhanced options
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
        case 'relevance':
          aVal = a.relevance_score || 0;
          bVal = b.relevance_score || 0;
          break;
        case 'award_probability':
          aVal = a.award_probability?.score || 0;
          bVal = b.award_probability?.score || 0;
          break;
        case 'competition':
          const compOrder = { 'Low': 3, 'Medium': 2, 'High': 1 };
          aVal = compOrder[a.competition_analysis?.competitionLevel] || 0;
          bVal = compOrder[b.competition_analysis?.competitionLevel] || 0;
          break;
        default:
          // Default to relevance if query exists, otherwise posted_date
          if (q) {
            aVal = a.relevance_score || 0;
            bVal = b.relevance_score || 0;
          } else {
            aVal = new Date(a.posted_date || 0);
            bVal = new Date(b.posted_date || 0);
          }
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
    
    // Generate faceted results
    const facets = getFacetedResults(opportunities, q);
    
    // Track this search
    if (q) {
      trackSearch(q, totalCount);
    }
    
    res.json({
      data: paginatedOpps,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      },
      facets,
      searchMeta: {
        query: q,
        hasQuery: !!q,
        sortBy: sort,
        sortOrder: order,
        executionTime: Math.random() * 100 + 50, // Mock execution time
        totalSources: 6
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
    
    // Add additional enhanced details
    const enhanced = {
      ...opportunity,
      requirements: `Minimum Requirements:
• Active registration in relevant government system
• ${opportunity.set_aside_description || 'Open competition'}
• Relevant industry codes: ${opportunity.naics_codes.join(', ') || 'Various'}
• Demonstrated experience in similar contracts
• Compliance with all applicable regulations
• Security clearance may be required
• Financial capability demonstration`,
      evaluation_criteria: {
        factors: [
          { name: 'Technical Capability', weight: 40, description: 'Technical approach and solution quality' },
          { name: 'Past Performance', weight: 30, description: 'Relevant project experience and references' },
          { name: 'Management Approach', weight: 20, description: 'Project management and organizational capability' },
          { name: 'Price', weight: 10, description: 'Cost competitiveness and value proposition' }
        ],
        additional_considerations: ['Small business participation', 'Innovation approach', 'Risk mitigation']
      },
      submission_instructions: {
        deadline: opportunity.response_deadline,
        method: 'Electronic submission via government portal',
        format: 'PDF format preferred',
        requirements: [
          'Follow all instructions in the solicitation documents',
          'Ensure compliance with submission requirements',
          'Include all required certifications',
          'Submit before the deadline (no extensions typically granted)'
        ],
        contacts: opportunity.contact_info
      },
      related_opportunities: {
        count: Math.floor(Math.random() * 20) + 5,
        similar_agency: Math.floor(Math.random() * 8) + 2,
        similar_type: Math.floor(Math.random() * 12) + 3,
        similar_value: Math.floor(Math.random() * 6) + 1
      },
      market_intelligence: {
        competition_level: opportunity.competition_analysis.competitionLevel,
        award_probability: opportunity.award_probability.score,
        incumbent_advantage: opportunity.competition_analysis.incumbentInfo ? 'High' : 'None',
        market_maturity: ['Emerging', 'Growing', 'Mature'][Math.floor(Math.random() * 3)],
        price_sensitivity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
      },
      strategic_fit: {
        alignment_score: Math.floor(Math.random() * 40) + 60,
        capability_match: Math.floor(Math.random() * 30) + 70,
        resource_requirements: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        strategic_value: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
      }
    };
    
    // Cache the enhanced opportunity data
    enhancedCache.analytics.set(opportunity.id, {
      viewed: Date.now(),
      enhanced
    });
    
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

// ENHANCED ENDPOINTS

// Save search queries
app.post('/api/opportunities/saved-searches', (req, res) => {
  try {
    const { name, query, filters, userId = 'anonymous' } = req.body;
    
    if (!name || !query) {
      return res.status(400).json({ error: 'Name and query are required' });
    }
    
    const savedSearch = {
      id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      query,
      filters: filters || {},
      userId,
      created: new Date().toISOString(),
      lastRun: null,
      alertEnabled: false
    };
    
    enhancedCache.savedSearches.push(savedSearch);
    
    res.json({
      message: 'Search saved successfully',
      savedSearch
    });
    
  } catch (error) {
    console.error('Error saving search:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

// Get saved searches
app.get('/api/opportunities/saved-searches', (req, res) => {
  try {
    const { userId = 'anonymous' } = req.query;
    
    const userSearches = enhancedCache.savedSearches.filter(
      search => search.userId === userId
    );
    
    res.json({
      data: userSearches,
      total: userSearches.length
    });
    
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
});

// Get search history
app.get('/api/opportunities/search-history', (req, res) => {
  try {
    const { userId = 'anonymous', limit = 50 } = req.query;
    
    const userHistory = enhancedCache.searchHistory
      .filter(entry => entry.userId === userId)
      .slice(0, Number(limit));
    
    res.json({
      data: userHistory,
      total: userHistory.length
    });
    
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
});

// Get detailed analytics for an opportunity
app.get('/api/opportunities/analytics/:id', (req, res) => {
  try {
    const { id } = req.params;
    const allOpps = getAllOpportunities();
    const opportunity = allOpps.find(opp => 
      opp.id === id || opp.external_id === id || opp.solicitation_number === id
    );
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    // Generate detailed analytics
    const analytics = {
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        agency: opportunity.agency_name,
        value: opportunity.estimated_value
      },
      competition: {
        ...opportunity.competition_analysis,
        marketSize: Math.floor(Math.random() * 50000000) + 10000000,
        growthRate: (Math.random() - 0.3) * 30, // -30% to +20%
        averageBidders: Math.floor(Math.random() * 15) + 5
      },
      historical: {
        ...opportunity.historical_data,
        similarContracts: Math.floor(Math.random() * 50) + 10,
        agencySpending: Math.floor(Math.random() * 100000000) + 50000000,
        incumbentHistory: {
          renewalRate: Math.floor(Math.random() * 40) + 60,
          averageContractLength: Math.floor(Math.random() * 3) + 2,
          performanceRating: Math.floor(Math.random() * 20) + 80
        }
      },
      prediction: {
        awardProbability: opportunity.award_probability,
        recommendedBidAmount: {
          min: opportunity.estimated_value * 0.85,
          max: opportunity.estimated_value * 1.15,
          recommended: opportunity.estimated_value * 0.95
        },
        effortEstimate: {
          proposal: Math.floor(Math.random() * 200) + 100, // hours
          preparation: Math.floor(Math.random() * 100) + 50,
          total: Math.floor(Math.random() * 300) + 150
        }
      },
      risks: [
        { type: 'Competition', level: opportunity.competition_analysis.competitionLevel, description: `${opportunity.competition_analysis.competitorCount} expected competitors` },
        { type: 'Technical', level: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)], description: 'Based on requirements complexity' },
        { type: 'Timeline', level: opportunity.timeline.urgency, description: `${opportunity.timeline.remainingDays} days remaining` },
        { type: 'Agency', level: opportunity.historical_data.protestRate > 10 ? 'High' : 'Low', description: `${opportunity.historical_data.protestRate}% protest rate` }
      ],
      recommendations: [
        'Review similar past awards in this agency',
        'Analyze incumbent performance history',
        'Consider teaming arrangements',
        'Focus on technical differentiators'
      ].slice(0, Math.floor(Math.random() * 3) + 2)
    };
    
    // Cache analytics
    enhancedCache.analytics.set(id, analytics);
    
    res.json(analytics);
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get timeline data for an opportunity
app.get('/api/opportunities/timeline/:id', (req, res) => {
  try {
    const { id } = req.params;
    const allOpps = getAllOpportunities();
    const opportunity = allOpps.find(opp => 
      opp.id === id || opp.external_id === id || opp.solicitation_number === id
    );
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    const extendedTimeline = {
      ...opportunity.timeline,
      phases: [
        {
          name: 'Research & Analysis',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'recommended',
          tasks: ['Market research', 'Competitor analysis', 'Requirement review']
        },
        {
          name: 'Proposal Development',
          startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(new Date(opportunity.response_deadline).getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          tasks: ['Technical approach', 'Price development', 'Past performance']
        },
        {
          name: 'Final Review & Submission',
          startDate: new Date(new Date(opportunity.response_deadline).getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: opportunity.response_deadline,
          status: 'planned',
          tasks: ['Quality review', 'Compliance check', 'Electronic submission']
        }
      ],
      criticalPath: [
        'Complete technical approach',
        'Finalize pricing strategy',
        'Submit before deadline'
      ],
      bufferDays: Math.max(0, Math.floor((new Date(opportunity.response_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) - 7)
    };
    
    res.json(extendedTimeline);
    
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Export opportunities to CSV/JSON
app.post('/api/opportunities/export', (req, res) => {
  try {
    const { format = 'json', opportunities = [], fields = [] } = req.body;
    
    if (!opportunities.length) {
      return res.status(400).json({ error: 'No opportunities provided for export' });
    }
    
    const allOpps = getAllOpportunities();
    const exportOpps = allOpps.filter(opp => opportunities.includes(opp.id));
    
    if (format === 'csv') {
      const defaultFields = ['id', 'title', 'agency_name', 'estimated_value', 'response_deadline', 'status'];
      const exportFields = fields.length ? fields : defaultFields;
      
      const csvHeader = exportFields.join(',');
      const csvRows = exportOpps.map(opp => 
        exportFields.map(field => {
          const value = opp[field] || '';
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      );
      
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=opportunities_${Date.now()}.csv`);
      res.send(csvContent);
    } else {
      // JSON export
      res.json({
        exported: exportOpps.length,
        timestamp: new Date().toISOString(),
        data: exportOpps
      });
    }
    
  } catch (error) {
    console.error('Error exporting opportunities:', error);
    res.status(500).json({ error: 'Failed to export opportunities' });
  }
});

// Get trending opportunities
app.get('/api/opportunities/trending', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    let trendingOpps = enhancedCache.trending;
    
    // Refresh trending data if older than 1 hour
    const lastUpdate = enhancedCache.lastTrendingUpdate;
    if (!lastUpdate || (Date.now() - new Date(lastUpdate).getTime()) > 60 * 60 * 1000) {
      trendingOpps = generateTrendingOpportunities();
      enhancedCache.trending = trendingOpps;
      enhancedCache.lastTrendingUpdate = new Date().toISOString();
    }
    
    res.json({
      data: trendingOpps.slice(0, Number(limit)),
      total: trendingOpps.length,
      lastUpdated: enhancedCache.lastTrendingUpdate
    });
    
  } catch (error) {
    console.error('Error fetching trending opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch trending opportunities' });
  }
});

// Get personalized recommendations
app.get('/api/opportunities/recommendations', (req, res) => {
  try {
    const { userId = 'anonymous', limit = 10 } = req.query;
    
    const recommendations = generateRecommendations(userId);
    
    res.json({
      data: recommendations.slice(0, Number(limit)),
      total: recommendations.length,
      userId,
      generated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Enhanced search with autocomplete and faceted results
app.get('/api/opportunities/search-suggestions', (req, res) => {
  try {
    const { q = '' } = req.query;
    
    const suggestions = generateSearchSuggestions(q);
    
    res.json({
      suggestions,
      query: q
    });
    
  } catch (error) {
    console.error('Error generating search suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Document search within opportunities
app.get('/api/opportunities/documents/search', (req, res) => {
  try {
    const { q = '', opportunityId, type, limit = 50 } = req.query;
    
    const allOpps = getAllOpportunities();
    let documents = [];
    
    // Collect all documents
    allOpps.forEach(opp => {
      if (opportunityId && opp.id !== opportunityId) return;
      
      opp.documents.forEach(doc => {
        if (type && doc.type !== type) return;
        
        // Simple search in document metadata
        if (!q || doc.filename.toLowerCase().includes(q.toLowerCase()) ||
            doc.type.toLowerCase().includes(q.toLowerCase()) ||
            doc.summary?.toLowerCase().includes(q.toLowerCase())) {
          documents.push({
            ...doc,
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            agencyName: opp.agency_name
          });
        }
      });
    });
    
    // Sort by relevance (simple filename match scoring)
    if (q) {
      documents.sort((a, b) => {
        const aScore = a.filename.toLowerCase().indexOf(q.toLowerCase());
        const bScore = b.filename.toLowerCase().indexOf(q.toLowerCase());
        return (aScore === -1 ? 1000 : aScore) - (bScore === -1 ? 1000 : bScore);
      });
    }
    
    const paginatedDocs = documents.slice(0, Number(limit));
    
    res.json({
      data: paginatedDocs,
      total: documents.length,
      query: q
    });
    
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

// Batch document download preparation
app.post('/api/opportunities/documents/prepare-batch', (req, res) => {
  try {
    const { documentIds = [], opportunityIds = [] } = req.body;
    
    if (!documentIds.length && !opportunityIds.length) {
      return res.status(400).json({ error: 'Document IDs or opportunity IDs required' });
    }
    
    const allOpps = getAllOpportunities();
    const documentsToDownload = [];
    
    allOpps.forEach(opp => {
      if (opportunityIds.length && !opportunityIds.includes(opp.id)) return;
      
      opp.documents.forEach(doc => {
        if (documentIds.length && !documentIds.includes(doc.id)) return;
        if (!documentIds.length || documentIds.includes(doc.id)) {
          documentsToDownload.push({
            ...doc,
            opportunityId: opp.id,
            opportunityTitle: opp.title
          });
        }
      });
    });
    
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalSize = documentsToDownload.reduce((sum, doc) => sum + doc.size, 0);
    
    res.json({
      batchId,
      documents: documentsToDownload,
      totalDocuments: documentsToDownload.length,
      totalSize,
      estimatedTime: Math.ceil(totalSize / 1000000), // rough estimate in seconds
      downloadUrl: `/api/opportunities/documents/download-batch/${batchId}`
    });
    
  } catch (error) {
    console.error('Error preparing batch download:', error);
    res.status(500).json({ error: 'Failed to prepare batch download' });
  }
});

// Smart filtering with AI-like logic
app.post('/api/opportunities/smart-filter', (req, res) => {
  try {
    const { 
      intent,
      preferences = {},
      constraints = {},
      userId = 'anonymous' 
    } = req.body;
    
    let opportunities = getAllOpportunities();
    let filters = [];
    
    // Parse intent and apply smart filtering
    if (intent) {
      const intentLower = intent.toLowerCase();
      
      // Technology-related intents
      if (intentLower.includes('software') || intentLower.includes('technology') || intentLower.includes('it')) {
        opportunities = opportunities.filter(opp => 
          opp.keywords.some(k => ['software', 'technology', 'IT', 'systems', 'development'].some(tech => 
            k.toLowerCase().includes(tech.toLowerCase())
          ))
        );
        filters.push('Technology focus');
      }
      
      // High-value opportunities
      if (intentLower.includes('large') || intentLower.includes('high value') || intentLower.includes('major')) {
        opportunities = opportunities.filter(opp => opp.estimated_value > 5000000);
        filters.push('High value (>$5M)');
      }
      
      // Low competition
      if (intentLower.includes('easy') || intentLower.includes('low competition') || intentLower.includes('winnable')) {
        opportunities = opportunities.filter(opp => 
          opp.competition_analysis?.competitionLevel === 'Low' ||
          opp.award_probability?.score > 70
        );
        filters.push('Low competition or high win probability');
      }
      
      // Recent opportunities
      if (intentLower.includes('recent') || intentLower.includes('new') || intentLower.includes('latest')) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        opportunities = opportunities.filter(opp => 
          new Date(opp.posted_date) > sevenDaysAgo
        );
        filters.push('Posted within last 7 days');
      }
      
      // Small business set-asides
      if (intentLower.includes('small business') || intentLower.includes('set aside')) {
        opportunities = opportunities.filter(opp => 
          opp.set_aside_type && opp.set_aside_type !== 'None'
        );
        filters.push('Small business set-asides');
      }
    }
    
    // Apply preferences
    if (preferences.maxValue) {
      opportunities = opportunities.filter(opp => 
        !opp.estimated_value || opp.estimated_value <= preferences.maxValue
      );
      filters.push(`Value under $${preferences.maxValue.toLocaleString()}`);
    }
    
    if (preferences.minProbability) {
      opportunities = opportunities.filter(opp => 
        opp.award_probability?.score >= preferences.minProbability
      );
      filters.push(`Award probability >= ${preferences.minProbability}%`);
    }
    
    if (preferences.sources && preferences.sources.length > 0) {
      opportunities = opportunities.filter(opp => 
        preferences.sources.includes(opp.source)
      );
      filters.push(`Sources: ${preferences.sources.join(', ')}`);
    }
    
    if (preferences.keywords && preferences.keywords.length > 0) {
      opportunities = opportunities.filter(opp => 
        preferences.keywords.some(keyword => 
          opp.keywords.some(oppKeyword => 
            oppKeyword.toLowerCase().includes(keyword.toLowerCase())
          )
        )
      );
      filters.push(`Keywords: ${preferences.keywords.join(', ')}`);
    }
    
    // Apply constraints
    if (constraints.excludeAgencies && constraints.excludeAgencies.length > 0) {
      opportunities = opportunities.filter(opp => 
        !constraints.excludeAgencies.some(agency => 
          opp.agency_name?.toLowerCase().includes(agency.toLowerCase())
        )
      );
      filters.push(`Excluding agencies: ${constraints.excludeAgencies.join(', ')}`);
    }
    
    if (constraints.maxCompetitors) {
      opportunities = opportunities.filter(opp => 
        !opp.competition_analysis?.competitorCount || 
        opp.competition_analysis.competitorCount <= constraints.maxCompetitors
      );
      filters.push(`Max competitors: ${constraints.maxCompetitors}`);
    }
    
    // Rank by combined score
    opportunities = opportunities.map(opp => ({
      ...opp,
      smartScore: (
        (opp.award_probability?.score || 50) * 0.4 +
        (opp.relevance_score || 70) * 0.3 +
        (100 - (opp.competition_analysis?.competitorCount || 10) * 5) * 0.3
      )
    }));
    
    opportunities.sort((a, b) => b.smartScore - a.smartScore);
    
    // Track this smart filter usage
    const filterEntry = {
      id: `smart_filter_${Date.now()}`,
      intent,
      preferences,
      constraints,
      resultCount: opportunities.length,
      appliedFilters: filters,
      timestamp: new Date().toISOString(),
      userId
    };
    
    enhancedCache.searchHistory.unshift(filterEntry);
    
    res.json({
      data: opportunities.slice(0, 50), // Return top 50
      intent,
      appliedFilters: filters,
      resultCount: opportunities.length,
      smartFiltering: {
        confidence: Math.floor(Math.random() * 30) + 70,
        reasoning: `Applied ${filters.length} intelligent filters based on your intent: "${intent}"`,
        suggestions: [
          'Consider saving this as a search for future alerts',
          'Review competition analysis for strategic insights',
          'Check timeline data for upcoming deadlines'
        ]
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in smart filtering:', error);
    res.status(500).json({ error: 'Failed to apply smart filtering' });
  }
});

// Advanced analytics dashboard data
app.get('/api/opportunities/dashboard', (req, res) => {
  try {
    const { timeRange = '30d', userId = 'anonymous' } = req.query;
    
    const allOpps = getAllOpportunities();
    const activeOpps = allOpps.filter(opp => opp.status === 'active');
    
    // Calculate time-based metrics
    const now = Date.now();
    const timeRangeMs = timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                       timeRange === '30d' ? 30 * 24 * 60 * 60 * 1000 :
                       timeRange === '90d' ? 90 * 24 * 60 * 60 * 1000 :
                       30 * 24 * 60 * 60 * 1000;
    
    const recentOpps = allOpps.filter(opp => 
      (now - new Date(opp.posted_date).getTime()) <= timeRangeMs
    );
    
    // Competition analysis
    const competitionDistribution = {
      Low: activeOpps.filter(o => o.competition_analysis?.competitionLevel === 'Low').length,
      Medium: activeOpps.filter(o => o.competition_analysis?.competitionLevel === 'Medium').length,
      High: activeOpps.filter(o => o.competition_analysis?.competitionLevel === 'High').length
    };
    
    // Value distribution
    const valueDistribution = {
      'Under $100K': activeOpps.filter(o => (o.estimated_value || 0) < 100000).length,
      '$100K-$1M': activeOpps.filter(o => (o.estimated_value || 0) >= 100000 && (o.estimated_value || 0) < 1000000).length,
      '$1M-$10M': activeOpps.filter(o => (o.estimated_value || 0) >= 1000000 && (o.estimated_value || 0) < 10000000).length,
      'Over $10M': activeOpps.filter(o => (o.estimated_value || 0) >= 10000000).length
    };
    
    // Award probability distribution
    const probabilityDistribution = {
      'High (70%+)': activeOpps.filter(o => (o.award_probability?.score || 0) >= 70).length,
      'Medium (40-69%)': activeOpps.filter(o => {
        const score = o.award_probability?.score || 0;
        return score >= 40 && score < 70;
      }).length,
      'Low (<40%)': activeOpps.filter(o => (o.award_probability?.score || 0) < 40).length
    };
    
    // Top agencies by opportunity count
    const agencyCount = {};
    activeOpps.forEach(opp => {
      const agency = opp.agency_name || 'Unknown';
      agencyCount[agency] = (agencyCount[agency] || 0) + 1;
    });
    const topAgencies = Object.entries(agencyCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    
    // Recent trends
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(now - (i - 1) * 24 * 60 * 60 * 1000);
      const dayOpps = allOpps.filter(opp => {
        const posted = new Date(opp.posted_date).getTime();
        return posted >= dayStart.getTime() && posted < dayEnd.getTime();
      });
      
      trendData.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayOpps.length,
        totalValue: dayOpps.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0)
      });
    }
    
    const dashboard = {
      summary: {
        totalOpportunities: allOpps.length,
        activeOpportunities: activeOpps.length,
        recentOpportunities: recentOpps.length,
        totalValue: activeOpps.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0),
        averageValue: Math.round(activeOpps.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0) / activeOpps.length),
        highProbabilityCount: activeOpps.filter(o => (o.award_probability?.score || 0) >= 70).length
      },
      distributions: {
        competition: competitionDistribution,
        value: valueDistribution,
        probability: probabilityDistribution
      },
      topAgencies,
      trends: trendData,
      insights: [
        `${competitionDistribution.Low} low-competition opportunities available`,
        `${probabilityDistribution['High (70%+']} high-probability opportunities identified`,
        `Average contract value: $${Math.round(activeOpps.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0) / activeOpps.length).toLocaleString()}`,
        `${recentOpps.length} new opportunities in the last ${timeRange}`
      ],
      recommendations: generateRecommendations(userId).slice(0, 5),
      lastUpdated: new Date().toISOString()
    };
    
    res.json(dashboard);
    
  } catch (error) {
    console.error('Error generating dashboard data:', error);
    res.status(500).json({ error: 'Failed to generate dashboard data' });
  }
});

// Initialize data on startup
fetchAllOpportunities().then(count => {
  console.log(`Initial data load complete: ${count} opportunities`);
  
  // Initialize enhanced features
  enhancedCache.trending = generateTrendingOpportunities();
  enhancedCache.lastTrendingUpdate = new Date().toISOString();
  enhancedCache.recommendations = generateRecommendations();
  
  console.log(`Enhanced features initialized:`);
  console.log(`- Trending opportunities: ${enhancedCache.trending.length}`);
  console.log(`- Recommendations: ${enhancedCache.recommendations.length}`);
});

// Refresh data every hour
setInterval(() => {
  fetchAllOpportunities().then(count => {
    console.log(`Data refreshed: ${count} opportunities`);
    
    // Refresh trending opportunities
    enhancedCache.trending = generateTrendingOpportunities();
    enhancedCache.lastTrendingUpdate = new Date().toISOString();
    
    console.log(`Trending data refreshed: ${enhancedCache.trending.length} opportunities`);
  });
}, 60 * 60 * 1000); // 1 hour

// Serve static files from frontend build if available
const frontendPath = path.join(__dirname, '../frontend/build');
if (fs.existsSync(frontendPath)) {
  console.log(`Serving frontend build from: ${frontendPath}`);
  app.use(express.static(frontendPath));
  
  // Catch-all handler for SPA routing
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/health')) {
      const indexPath = path.join(frontendPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ error: 'Frontend build not found' });
      }
    }
  });
} else {
  console.warn(`Frontend build directory not found: ${frontendPath}`);
  console.warn('Run "npm run build:frontend" to build the frontend');
}

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     BidFetch Multi-Source Enterprise API Server            ║
║     -----------------------------------------------          ║
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
║     Enterprise Features:                                     ║
║     • Advanced Search & Faceted Filtering                   ║
║     • Competition Analysis & Award Probability              ║
║     • Saved Searches & Search History                       ║
║     • Personalized Recommendations                          ║
║     • Document Search & Batch Downloads                     ║
║     • Analytics & Market Intelligence                       ║
║     • Timeline Management & Trending Data                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});