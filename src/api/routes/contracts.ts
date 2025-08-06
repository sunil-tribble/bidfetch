import { Router } from 'express';
import { Pool } from 'pg';
import { config } from '../../config';

const router = Router();
const db = new Pool({
  connectionString: config.database.postgres.url,
  ...config.database.postgres.pool,
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

export const contractRoutes = router;