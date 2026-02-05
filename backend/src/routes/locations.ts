
import express from 'express';
import { getAirports } from '../airports.js';
import pool from '../database.js';

const router = express.Router();

router.get('/countries', async (req, res) => {
  try {
    const { getCountries } = await import('../airports.js');
    const countries = await getCountries();
    res.json(countries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/airports', async (req: any, res: any) => {
  try {
    const travelType = req.query.travelType as 'domestic' | 'international';
    const q = req.query.q as string;
    const results = await getAirports(travelType, q);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search Hotels
router.get('/locations/hotels', async (req: any, res: any) => {
  try {
    const q = req.query.q as string;
    const travelType = req.query.travelType as 'domestic' | 'international';

    if (!q || q.length < 2) return res.json([]);

    let queryText = '';
    let params: any[] = [];

    if (travelType === 'domestic') {
      queryText = `
                SELECT city_code as "cityCode", city_name as "cityName", state_id as "stateId", state_name as "stateName", country_id as "countryId", country_name as "countryName"
                FROM hotel_cities
                WHERE country_id = 'IN' AND (city_name ILIKE $1 OR city_code ILIKE $1)
                LIMIT 20
            `;
      params = [`%${q}%`];
    } else {
      // International can be anything NOT IN, or just ALL?
      // Usually "International" means specific handling, but here 'hotel-cities-all' likely includes everything.
      // If user selects International, they might want cities outside India.
      // But 'all' includes India too? The file name 'hotel-cities-all' suggests global.
      // Let's search ALL for international, or filter.
      queryText = `
                SELECT city_code as "cityCode", city_name as "cityName", state_id as "stateId", state_name as "stateName", country_id as "countryId", country_name as "countryName"
                FROM hotel_cities
                WHERE (city_name ILIKE $1 OR city_code ILIKE $1)
                LIMIT 20
            `;
      params = [`%${q}%`];
    }

    const result = await pool.query(queryText, params);
    res.json(result.rows);

  } catch (err: any) {
    console.error('Error searching hotels:', err);
    res.status(500).json({ error: err.message });
  }
});

// Search Cars (Domestic Only)
router.get('/locations/cars', async (req: any, res: any) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) return res.json([]);

    const result = await pool.query(`
            SELECT city_code as "cityCode", city_name as "cityName", state_id as "stateId", state_name as "stateName"
            FROM car_cities
            WHERE city_name ILIKE $1 OR city_code ILIKE $1
            LIMIT 20
        `, [`%${q}%`]);

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error searching car cities:', err);
    res.status(500).json({ error: err.message });
  }
});

// Search Trains (Domestic Only)
router.get('/locations/trains', async (req: any, res: any) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) return res.json([]);

    const result = await pool.query(`
            SELECT station_code as "stnCode", station_name as "stnName", station_city as "stnCity"
            FROM train_stations
            WHERE station_name ILIKE $1 OR station_code ILIKE $1 OR station_city ILIKE $1
            LIMIT 20
        `, [`%${q}%`]);

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error searching train stations:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
