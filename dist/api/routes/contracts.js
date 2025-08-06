"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractRoutes = void 0;
const express_1 = require("express");
const pg_1 = require("pg");
const config_1 = require("../../config");
const router = (0, express_1.Router)();
const db = new pg_1.Pool({
    connectionString: config_1.config.database.postgres.url,
    ...config_1.config.database.postgres.pool,
});
router.get('/expiring', async (req, res) => {
    const { months = 12 } = req.query;
    const result = await db.query(`
    SELECT 
      c.*,
      o.name as contractor_name,
      a.name as agency_name,
      (c.current_completion_date - CURRENT_DATE) as days_until_expiry
    FROM contracts c
    LEFT JOIN organizations o ON c.contractor_id = o.id
    LEFT JOIN organizations a ON c.agency_id = a.id
    WHERE c.current_completion_date BETWEEN CURRENT_DATE 
      AND CURRENT_DATE + INTERVAL '${Number(months)} months'
    ORDER BY c.current_completion_date ASC
    LIMIT 100
  `);
    res.json(result.rows);
});
exports.contractRoutes = router;
//# sourceMappingURL=contracts.js.map