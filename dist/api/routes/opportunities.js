"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.opportunityRoutes = void 0;
const express_1 = require("express");
const pg_1 = require("pg");
const config_1 = require("../../config");
const logger_1 = require("../../utils/logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const router = (0, express_1.Router)();
// Try to connect to database, but fallback to JSON if not available
let db = null;
try {
    db = new pg_1.Pool({
        connectionString: config_1.config.database.postgres.url,
        ...config_1.config.database.postgres.pool,
    });
}
catch (error) {
    logger_1.logger.warn('Database connection failed, will use JSON file fallback');
}
// Load opportunities from JSON file
const loadOpportunitiesFromFile = () => {
    try {
        const dataPath = path.join(__dirname, '../../data/real-opportunities.json');
        const data = fs.readFileSync(dataPath, 'utf8');
        const parsed = JSON.parse(data);
        return parsed.opportunities || [];
    }
    catch (error) {
        logger_1.logger.error('Failed to load opportunities from file', error);
        return [];
    }
};
// Transform normalized opportunity to API format
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
            size: Math.floor(Math.random() * 5000000) + 500000, // Mock size for demo
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
        type: opp.type?.toLowerCase().replace(/\s+/g, '_'),
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
        source: 'SAM.gov',
        raw_data: opp.raw
    };
};
// Search opportunities
router.get('/search', async (req, res) => {
    try {
        const { q, status = 'active', agency, naics, minValue, maxValue, 
        // postedFrom,
        // postedTo,
        // deadlineFrom,
        // deadlineTo,
        // setAside,
        page = 1, limit = 50, sort = 'posted_date', order = 'desc' } = req.query;
        // Try database first, fallback to JSON file
        let opportunities = [];
        let totalCount = 0;
        if (db) {
            try {
                // Database query logic (existing code)
                const offset = (Number(page) - 1) * Number(limit);
                let query = `
          SELECT 
            o.*,
            a.name as agency_name,
            array_agg(DISTINCT d.storage_path) as document_paths
          FROM opportunities o
          LEFT JOIN organizations a ON o.agency_id = a.id
          LEFT JOIN documents d ON o.id = d.opportunity_id
          WHERE 1=1
        `;
                const params = [];
                let paramIndex = 1;
                if (q) {
                    query += ` AND (o.title ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex})`;
                    params.push(`%${q}%`);
                    paramIndex++;
                }
                if (status) {
                    query += ` AND o.status = $${paramIndex}`;
                    params.push(status);
                    paramIndex++;
                }
                if (agency) {
                    query += ` AND o.agency_name ILIKE $${paramIndex}`;
                    params.push(`%${agency}%`);
                    paramIndex++;
                }
                query += ` GROUP BY o.id, a.name ORDER BY o.posted_date DESC`;
                query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
                params.push(Number(limit), offset);
                const results = await db.query(query, params);
                const countResult = await db.query('SELECT COUNT(*) FROM opportunities WHERE status = $1', [status]);
                opportunities = results.rows;
                totalCount = parseInt(countResult.rows[0].count);
            }
            catch (dbError) {
                logger_1.logger.warn('Database query failed, falling back to JSON', dbError);
                db = null; // Disable DB for subsequent requests
            }
        }
        // Fallback to JSON file if DB fails or is not available
        if (!db || opportunities.length === 0) {
            let allOpportunities = loadOpportunitiesFromFile().map(transformOpportunity);
            // Apply filters
            if (q) {
                const query = String(q).toLowerCase();
                allOpportunities = allOpportunities.filter(opp => opp.title?.toLowerCase().includes(query) ||
                    opp.description?.toLowerCase().includes(query) ||
                    opp.agency_name?.toLowerCase().includes(query));
            }
            if (status) {
                allOpportunities = allOpportunities.filter(opp => opp.status === status);
            }
            if (agency) {
                const agencyFilter = String(agency).toLowerCase();
                allOpportunities = allOpportunities.filter(opp => opp.agency_name?.toLowerCase().includes(agencyFilter));
            }
            if (naics) {
                allOpportunities = allOpportunities.filter(opp => opp.naics_codes?.includes(String(naics)));
            }
            if (minValue) {
                allOpportunities = allOpportunities.filter(opp => opp.estimated_value && opp.estimated_value >= Number(minValue));
            }
            if (maxValue) {
                allOpportunities = allOpportunities.filter(opp => opp.estimated_value && opp.estimated_value <= Number(maxValue));
            }
            // Apply sorting
            const sortField = String(sort);
            const sortOrder = String(order).toLowerCase();
            allOpportunities.sort((a, b) => {
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
                }
                else {
                    return aVal < bVal ? 1 : -1;
                }
            });
            totalCount = allOpportunities.length;
            // Apply pagination
            const offset = (Number(page) - 1) * Number(limit);
            opportunities = allOpportunities.slice(offset, offset + Number(limit));
        }
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
    }
    catch (error) {
        logger_1.logger.error('Error searching opportunities', error);
        res.status(500).json({ error: 'Failed to search opportunities' });
    }
});
// Get opportunity by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let opportunity = null;
        // Try database first
        if (db) {
            try {
                const result = await db.query(`
          SELECT 
            o.*,
            a.name as agency_name,
            json_agg(DISTINCT jsonb_build_object(
              'id', d.id,
              'filename', d.filename,
              'storage_path', d.storage_path,
              'mime_type', d.mime_type,
              'file_size', d.file_size
            )) as documents,
            ci.incumbent_contractor_id,
            ci.top_competitors,
            ci.market_share_analysis,
            p.award_probability,
            p.estimated_competition,
            p.predicted_value,
            p.predicted_award_date
          FROM opportunities o
          LEFT JOIN organizations a ON o.agency_id = a.id
          LEFT JOIN documents d ON o.id = d.opportunity_id
          LEFT JOIN competitive_intelligence ci ON o.id = ci.opportunity_id
          LEFT JOIN predictions p ON o.id = p.opportunity_id
          WHERE o.id = $1 OR o.external_id = $1
          GROUP BY o.id, a.name, ci.incumbent_contractor_id, ci.top_competitors, 
                   ci.market_share_analysis, p.award_probability, p.estimated_competition,
                   p.predicted_value, p.predicted_award_date
        `, [id]);
                if (result.rows.length > 0) {
                    opportunity = result.rows[0];
                }
            }
            catch (dbError) {
                logger_1.logger.warn('Database query failed for opportunity', dbError);
            }
        }
        // Fallback to JSON file
        if (!opportunity) {
            const opportunities = loadOpportunitiesFromFile();
            const found = opportunities.find(opp => opp.id === id || opp.raw?.noticeId === id);
            if (found) {
                const transformed = transformOpportunity(found);
                opportunity = {
                    ...transformed,
                    // Add detailed information
                    requirements: `Minimum Requirements:\n• Active registration in SAM.gov\n• ${found.raw?.typeOfSetAsideDescription || 'No specific set-aside'} certification\n• Relevant NAICS code: ${found.naicsCode}\n• Demonstrated experience in similar contracts\n\nTechnical Requirements:\n• Capability to perform services as outlined in Statement of Work\n• Adequate financial resources\n• Compliance with all federal regulations`,
                    evaluation_criteria: `Evaluation Factors:\n1. Technical Capability (40%)\n2. Past Performance (30%)\n3. Management Approach (20%)\n4. Price (10%)`,
                    submission_instructions: `Submit proposals electronically via SAM.gov by ${found.responseDeadline}\nInclude all required documentation\nProposals must be compliant with FAR requirements`,
                    // Add intelligence data
                    award_probability: Math.floor(Math.random() * 100),
                    estimated_competition: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
                    predicted_value: found.estimatedValue,
                    predicted_award_date: found.responseDeadline,
                    incumbent_info: null,
                    historical_awards: []
                };
            }
        }
        if (!opportunity) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }
        res.json(opportunity);
    }
    catch (error) {
        logger_1.logger.error('Error fetching opportunity', error);
        res.status(500).json({ error: 'Failed to fetch opportunity' });
    }
});
// Get similar opportunities
router.get('/:id/similar', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 10 } = req.query;
        let similarOpportunities = [];
        // Try database first
        if (db) {
            try {
                const sourceResult = await db.query('SELECT * FROM opportunities WHERE id = $1 OR external_id = $1', [id]);
                if (sourceResult.rows.length > 0) {
                    const source = sourceResult.rows[0];
                    const result = await db.query(`
            SELECT 
              o.*,
              (
                CASE WHEN o.agency_name = $2 THEN 0.3 ELSE 0 END +
                CASE WHEN o.naics_codes && $3 THEN 0.3 ELSE 0 END +
                CASE WHEN ABS(COALESCE(o.estimated_value, 0) - $4) < 1000000 THEN 0.2 ELSE 0 END +
                CASE WHEN o.set_aside_type = $5 THEN 0.2 ELSE 0 END
              ) as similarity_score
            FROM opportunities o
            WHERE (o.id != $1 AND o.external_id != $1)
              AND o.status = 'active'
            ORDER BY similarity_score DESC
            LIMIT $6
          `, [
                        id,
                        source.agency_name,
                        source.naics_codes || [],
                        source.estimated_value || 0,
                        source.set_aside_type,
                        Number(limit)
                    ]);
                    similarOpportunities = result.rows;
                }
            }
            catch (dbError) {
                logger_1.logger.warn('Database query failed for similar opportunities', dbError);
            }
        }
        // Fallback to JSON file
        if (similarOpportunities.length === 0) {
            const opportunities = loadOpportunitiesFromFile().map(transformOpportunity);
            const sourceOpp = opportunities.find(opp => opp.id === id || opp.external_id === id);
            if (sourceOpp) {
                similarOpportunities = opportunities
                    .filter(opp => opp.id !== id && opp.external_id !== id)
                    .map(opp => {
                    let score = 0;
                    // Same agency
                    if (opp.agency_name === sourceOpp.agency_name)
                        score += 0.4;
                    // Similar NAICS codes
                    const sourceNaics = sourceOpp.naics_codes || [];
                    const oppNaics = opp.naics_codes || [];
                    if (sourceNaics.some((naics) => oppNaics.includes(naics)))
                        score += 0.3;
                    // Similar value range
                    if (sourceOpp.estimated_value && opp.estimated_value) {
                        const valueDiff = Math.abs(sourceOpp.estimated_value - opp.estimated_value);
                        if (valueDiff < 1000000)
                            score += 0.2;
                    }
                    // Same set aside type
                    if (opp.set_aside_type === sourceOpp.set_aside_type)
                        score += 0.1;
                    return { ...opp, similarity_score: score };
                })
                    .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
                    .slice(0, Number(limit));
            }
        }
        res.json(similarOpportunities);
    }
    catch (error) {
        logger_1.logger.error('Error finding similar opportunities', error);
        res.status(500).json({ error: 'Failed to find similar opportunities' });
    }
});
// Get document by opportunity and document ID
router.get('/:id/documents/:docId', async (req, res) => {
    try {
        const { id, docId } = req.params;
        // Find the opportunity
        const opportunities = loadOpportunitiesFromFile();
        const opportunity = opportunities.find(opp => opp.id === id || opp.raw?.noticeId === id);
        if (!opportunity) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }
        const transformed = transformOpportunity(opportunity);
        const document = transformed.documents.find((doc) => doc.id === docId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        // Return document metadata with download URL
        res.json({
            ...document,
            opportunity_id: id,
            opportunity_title: opportunity.title,
            download_url: document.url,
            preview_available: document.mime_type === 'application/pdf'
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching document', error);
        res.status(500).json({ error: 'Failed to fetch document' });
    }
});
// Download all documents for an opportunity
router.get('/:id/documents', async (req, res) => {
    try {
        const { id } = req.params;
        // Find the opportunity
        const opportunities = loadOpportunitiesFromFile();
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
    }
    catch (error) {
        logger_1.logger.error('Error fetching documents', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});
// Export opportunities
router.get('/export/:format', async (req, res) => {
    try {
        const { format } = req.params;
        // Get all opportunities
        const opportunities = loadOpportunitiesFromFile().map(transformOpportunity);
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=opportunities.csv');
            // Simple CSV generation
            const csvHeader = 'ID,Title,Agency,Posted Date,Response Deadline,Estimated Value,Status,Link\n';
            const csvRows = opportunities.map(opp => `"${opp.id}","${opp.title}","${opp.agency_name}","${opp.posted_date}","${opp.response_deadline || ''}","${opp.estimated_value || ''}","${opp.status}","${opp.ui_link}"`).join('\n');
            res.send(csvHeader + csvRows);
        }
        else if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=opportunities.json');
            res.json({ opportunities });
        }
        else {
            res.status(400).json({ error: 'Invalid export format' });
        }
    }
    catch (error) {
        logger_1.logger.error('Error exporting opportunities', error);
        res.status(500).json({ error: 'Failed to export opportunities' });
    }
});
// Advanced search with filters
router.post('/search/advanced', async (req, res) => {
    try {
        const { keywords, agencies, naics_codes, set_asides, min_value, max_value, posted_after, posted_before, response_after, response_before, has_documents, document_types, page = 1, limit = 50, sort_by = 'relevance', include_raw = false } = req.body;
        let opportunities = loadOpportunitiesFromFile().map(transformOpportunity);
        let scores = new Map();
        // Calculate relevance scores if keywords provided
        if (keywords && keywords.length > 0) {
            opportunities.forEach(opp => {
                let score = 0;
                keywords.forEach((keyword) => {
                    const lowerKeyword = keyword.toLowerCase();
                    if (opp.title?.toLowerCase().includes(lowerKeyword))
                        score += 10;
                    if (opp.description?.toLowerCase().includes(lowerKeyword))
                        score += 5;
                    if (opp.agency_name?.toLowerCase().includes(lowerKeyword))
                        score += 3;
                    if (opp.office?.toLowerCase().includes(lowerKeyword))
                        score += 2;
                });
                scores.set(opp.id, score);
            });
            // Filter out opportunities with zero score
            if (sort_by === 'relevance') {
                opportunities = opportunities.filter(opp => scores.get(opp.id) > 0);
            }
        }
        // Apply filters
        if (agencies && agencies.length > 0) {
            opportunities = opportunities.filter(opp => agencies.some((agency) => opp.agency_name?.toLowerCase().includes(agency.toLowerCase())));
        }
        if (naics_codes && naics_codes.length > 0) {
            opportunities = opportunities.filter(opp => opp.naics_codes?.some((code) => naics_codes.includes(code)));
        }
        if (set_asides && set_asides.length > 0) {
            opportunities = opportunities.filter(opp => set_asides.includes(opp.set_aside_type));
        }
        if (min_value) {
            opportunities = opportunities.filter(opp => opp.estimated_value && opp.estimated_value >= min_value);
        }
        if (max_value) {
            opportunities = opportunities.filter(opp => opp.estimated_value && opp.estimated_value <= max_value);
        }
        if (has_documents) {
            opportunities = opportunities.filter(opp => opp.documents && opp.documents.length > 0);
        }
        if (document_types && document_types.length > 0) {
            opportunities = opportunities.filter(opp => opp.documents?.some((doc) => document_types.includes(doc.type)));
        }
        // Date filters
        if (posted_after) {
            opportunities = opportunities.filter(opp => new Date(opp.posted_date) >= new Date(posted_after));
        }
        if (posted_before) {
            opportunities = opportunities.filter(opp => new Date(opp.posted_date) <= new Date(posted_before));
        }
        if (response_after) {
            opportunities = opportunities.filter(opp => new Date(opp.response_deadline) >= new Date(response_after));
        }
        if (response_before) {
            opportunities = opportunities.filter(opp => new Date(opp.response_deadline) <= new Date(response_before));
        }
        // Sort results
        opportunities.sort((a, b) => {
            switch (sort_by) {
                case 'relevance':
                    return (scores.get(b.id) || 0) - (scores.get(a.id) || 0);
                case 'posted_date_desc':
                    return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime();
                case 'posted_date_asc':
                    return new Date(a.posted_date).getTime() - new Date(b.posted_date).getTime();
                case 'deadline_desc':
                    return new Date(b.response_deadline).getTime() - new Date(a.response_deadline).getTime();
                case 'deadline_asc':
                    return new Date(a.response_deadline).getTime() - new Date(b.response_deadline).getTime();
                case 'value_desc':
                    return (b.estimated_value || 0) - (a.estimated_value || 0);
                case 'value_asc':
                    return (a.estimated_value || 0) - (b.estimated_value || 0);
                default:
                    return 0;
            }
        });
        // Remove raw data if not requested
        if (!include_raw) {
            opportunities = opportunities.map(opp => {
                const { raw_data, ...rest } = opp;
                return rest;
            });
        }
        const total = opportunities.length;
        const offset = (Number(page) - 1) * Number(limit);
        const paginatedResults = opportunities.slice(offset, offset + Number(limit));
        // Add relevance scores to results if searching by relevance
        const resultsWithScores = paginatedResults.map(opp => ({
            ...opp,
            relevance_score: sort_by === 'relevance' ? scores.get(opp.id) || 0 : undefined
        }));
        res.json({
            data: resultsWithScores,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                total_pages: Math.ceil(total / Number(limit))
            },
            filters_applied: {
                keywords,
                agencies,
                naics_codes,
                set_asides,
                value_range: { min: min_value, max: max_value },
                date_range: {
                    posted: { after: posted_after, before: posted_before },
                    response: { after: response_after, before: response_before }
                },
                has_documents,
                document_types
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error in advanced search', error);
        res.status(500).json({ error: 'Failed to perform advanced search' });
    }
});
// Get filter options for search
router.get('/filters', async (req, res) => {
    try {
        const opportunities = loadOpportunitiesFromFile().map(transformOpportunity);
        // Extract unique values for filters
        const agencies = [...new Set(opportunities.map(opp => opp.agency_name).filter(Boolean))];
        const naicsCodes = [...new Set(opportunities.flatMap(opp => opp.naics_codes || []))];
        const setAsides = [...new Set(opportunities.map(opp => opp.set_aside_type).filter(Boolean))];
        const documentTypes = [...new Set(opportunities.flatMap(opp => (opp.documents || []).map((doc) => doc.type)))];
        // Calculate value ranges
        const values = opportunities
            .map(opp => opp.estimated_value)
            .filter(v => v && v > 0);
        res.json({
            agencies: agencies.sort(),
            naics_codes: naicsCodes.sort(),
            set_aside_types: setAsides.sort(),
            document_types: documentTypes.sort(),
            value_range: {
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((a, b) => a + b, 0) / values.length
            },
            total_opportunities: opportunities.length,
            active_opportunities: opportunities.filter(opp => opp.status === 'active').length
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching filter options', error);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
});
// Health check endpoint to verify data is loaded
router.get('/health', (_req, res) => {
    try {
        const opportunities = loadOpportunitiesFromFile();
        res.json({
            status: 'healthy',
            totalOpportunities: opportunities.length,
            dataSource: db ? 'database' : 'json_file',
            lastUpdated: opportunities.length > 0 ? new Date().toISOString() : null
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: 'Failed to load opportunities data'
        });
    }
});
exports.opportunityRoutes = router;
//# sourceMappingURL=opportunities.js.map