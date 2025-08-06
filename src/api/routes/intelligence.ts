import { Router } from 'express';
import { CompetitiveIntelligenceEngine } from '../../services/analytics/competitive-intelligence';

const router = Router();
const intelligence = new CompetitiveIntelligenceEngine();

router.get('/opportunity/:id', async (req, res) => {
  try {
    const analysis = await intelligence.analyzeOpportunity(req.params.id);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze opportunity' });
  }
});

router.get('/contractor/:id', async (req, res) => {
  try {
    const profile = await intelligence.generateCompetitorProfile(req.params.id);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate contractor profile' });
  }
});

router.get('/recompete-predictions', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const predictions = await intelligence.predictRecompete(Number(months));
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to predict recompetes' });
  }
});

export const intelligenceRoutes = router;