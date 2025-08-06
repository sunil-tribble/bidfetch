"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opportunityRoutes = void 0;
const express_1 = require("express");
const pg_1 = require("pg");
const config_1 = require("../../config");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
const db = new pg_1.Pool({
    connectionString: config_1.config.database.postgres.url,
    ...config_1.config.database.postgres.pool,
});
// Search opportunities
router.get('/search', async (req, res) => {
    try {
        const { q, status = 'active', agency, naics, minValue, maxValue, postedFrom, postedTo, deadlineFrom, deadlineTo, country, state, setAside, page = 1, limit = 50, sort = 'posted_date', order = 'desc' } = req.query;
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
            query += ` AND o.search_vector @@ plainto_tsquery('english', $${paramIndex})`;
            params.push(q);
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
        if (naics) {
            query += ` AND $${paramIndex} = ANY(o.naics_codes)`;
            params.push(naics);
            paramIndex++;
        }
        if (minValue) {
            query += ` AND o.estimated_value >= $${paramIndex}`;
            params.push(minValue);
            paramIndex++;
        }
        if (maxValue) {
            query += ` AND o.estimated_value <= $${paramIndex}`;
            params.push(maxValue);
            paramIndex++;
        }
        if (postedFrom) {
            query += ` AND o.posted_date >= $${paramIndex}`;
            params.push(postedFrom);
            paramIndex++;
        }
        if (postedTo) {
            query += ` AND o.posted_date <= $${paramIndex}`;
            params.push(postedTo);
            paramIndex++;
        }
        if (deadlineFrom) {
            query += ` AND o.response_deadline >= $${paramIndex}`;
            params.push(deadlineFrom);
            paramIndex++;
        }
        if (deadlineTo) {
            query += ` AND o.response_deadline <= $${paramIndex}`;
            params.push(deadlineTo);
            paramIndex++;
        }
        if (country) {
            query += ` AND o.country = $${paramIndex}`;
            params.push(country);
            paramIndex++;
        }
        if (state) {
            query += ` AND o.state = $${paramIndex}`;
            params.push(state);
            paramIndex++;
        }
        if (setAside) {
            query += ` AND o.set_aside_type = $${paramIndex}`;
            params.push(setAside);
            paramIndex++;
        }
        query += ` GROUP BY o.id, a.name`;
        // Add sorting
        const sortColumn = ['posted_date', 'response_deadline', 'estimated_value', 'title'].includes(String(sort))
            ? String(sort)
            : 'posted_date';
        const sortOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY o.${sortColumn} ${sortOrder}`;
        // Add pagination
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Number(limit), offset);
        // Get total count for pagination
        const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(DISTINCT o.id) FROM')
            .replace(/GROUP BY.*/, '')
            .replace(/ORDER BY.*/, '')
            .replace(/LIMIT.*/, '');
        const [results, countResult] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, params.slice(0, -2))
        ]);
        const totalCount = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalCount / Number(limit));
        res.json({
            data: results.rows,
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
      WHERE o.id = $1
      GROUP BY o.id, a.name, ci.incumbent_contractor_id, ci.top_competitors, 
               ci.market_share_analysis, p.award_probability, p.estimated_competition,
               p.predicted_value, p.predicted_award_date
    `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }
        res.json(result.rows[0]);
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
        // Get the source opportunity
        const sourceResult = await db.query('SELECT * FROM opportunities WHERE id = $1', [id]);
        if (sourceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }
        const source = sourceResult.rows[0];
        // Find similar opportunities based on NAICS codes and agency
        const result = await db.query(`
      SELECT 
        o.*,
        (
          CASE WHEN o.agency_id = $2 THEN 0.3 ELSE 0 END +
          CASE WHEN o.naics_codes && $3 THEN 0.3 ELSE 0 END +
          CASE WHEN ABS(o.estimated_value - $4) < 1000000 THEN 0.2 ELSE 0 END +
          CASE WHEN o.set_aside_type = $5 THEN 0.2 ELSE 0 END
        ) as similarity_score
      FROM opportunities o
      WHERE o.id != $1
        AND o.status = 'active'
        AND (o.naics_codes && $3 OR o.agency_id = $2)
      ORDER BY similarity_score DESC
      LIMIT $6
    `, [
            id,
            source.agency_id,
            source.naics_codes,
            source.estimated_value || 0,
            source.set_aside_type,
            Number(limit)
        ]);
        res.json(result.rows);
    }
    catch (error) {
        logger_1.logger.error('Error finding similar opportunities', error);
        res.status(500).json({ error: 'Failed to find similar opportunities' });
    }
});
// Export opportunities
router.get('/export/:format', async (req, res) => {
    try {
        const { format } = req.params;
        const queryParams = req.query;
        // Reuse search logic but without pagination
        // ... (search query building logic similar to /search endpoint)
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=opportunities.csv');
            // Generate CSV
        }
        else if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=opportunities.json');
            // Return JSON
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
exports.opportunityRoutes = router;
//# sourceMappingURL=opportunities.js.map