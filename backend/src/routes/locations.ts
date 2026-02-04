import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getAirports } from '../airports.js';

const router = express.Router();

// Build dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------
// Load Countries (static)
// -----------------------------
router.get('/countries', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'countries.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    console.error('Error loading countries:', err);
    res.status(500).json({ error: 'Failed to load countries' });
  }
});

// -----------------------------
// Load/Search Airports based on travel type and query
// -----------------------------
router.get('/airports', async (req, res) => {
  try {
    const travelType = req.query.travelType as 'domestic' | 'international';
    const query = req.query.q as string;

    if (!travelType || (travelType !== 'domestic' && travelType !== 'international')) {
      return res.status(400).json({ error: 'Valid travelType is required' });
    }

    const results = await getAirports(travelType, query);
    res.json(results);
  } catch (err) {
    console.error('Airport load/search error:', err);
    res.status(500).json({ error: 'Airport operation failed' });
  }
});

export default router;
