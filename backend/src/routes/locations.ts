
import express from 'express';
// import { getAirports } from '../airports.js'; // Removed in favor of SQL
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
    const destinationCountry = req.query.destinationCountry as string;

    // Default Load: If no query, return popular/all airports limit 20
    if (!q || q.trim().length === 0) {
      let defaultQuery = '';
      let defaultParams: any[] = [];

      if (travelType === 'domestic') {
        defaultQuery = `SELECT iata_code as "iata", name, city, country FROM airports WHERE country = 'India' ORDER BY city ASC LIMIT 20`;
      } else {
        // For international, maybe just return some top hubs or just sorted by city?
        // Or if destinationCountry is provided, return airports from there?
        if (destinationCountry) {
          defaultQuery = `SELECT iata_code as "iata", name, city, country FROM airports WHERE country ILIKE $1 ORDER BY city ASC LIMIT 20`;
          defaultParams = [destinationCountry];
        } else {
          defaultQuery = `SELECT iata_code as "iata", name, city, country FROM airports WHERE country != 'India' ORDER BY city ASC LIMIT 20`;
        }
      }
      const result = await pool.query(defaultQuery, defaultParams);
      return res.json(result.rows);
    }

    // Search Logic (Strict 2 chars)
    if (q.trim().length < 2) return res.json([]);

    const prefixParam = `${q}%`;
    const wordParam = `% ${q}%`;
    let queryText = '';
    let params: any[] = [];

    // Prioritization Logic
    let orderByClause = '';

    if (travelType === 'domestic') {
      orderByClause = `
            CASE 
                WHEN city ILIKE $1 THEN 1 
                WHEN iata_code ILIKE $1 THEN 2
                WHEN name ILIKE $1 THEN 3
                ELSE 4 
            END
        `;
      params = [prefixParam, wordParam];
      queryText = `
            SELECT iata_code as "iata", name, city, country
            FROM airports
            WHERE country = 'India'
            AND (
                city ILIKE $1 OR city ILIKE $2 OR 
                iata_code ILIKE $1 OR 
                name ILIKE $1 OR name ILIKE $2
            )
            ORDER BY ${orderByClause}, city ASC
            LIMIT 20
        `;
    } else {
      // International
      // Base Priority
      let baseOrderBy = `
            CASE 
                WHEN city ILIKE $1 THEN 1 
                WHEN iata_code ILIKE $1 THEN 2
                WHEN name ILIKE $1 THEN 3
                WHEN country ILIKE $1 THEN 4
                ELSE 5 
            END
        `;

      if (destinationCountry && destinationCountry.trim() !== '') {
        orderByClause = `CASE WHEN country ILIKE $3 THEN 0 ELSE 1 END, ` + baseOrderBy;
        params = [prefixParam, wordParam, destinationCountry];
      } else {
        orderByClause = baseOrderBy;
        params = [prefixParam, wordParam];
      }

      queryText = `
            SELECT iata_code as "iata", name, city, country
            FROM airports
            WHERE (
                city ILIKE $1 OR city ILIKE $2 OR 
                iata_code ILIKE $1 OR 
                name ILIKE $1 OR name ILIKE $2 OR
                country ILIKE $1 OR country ILIKE $2
            )
            ORDER BY ${orderByClause}, city ASC
            LIMIT 20
        `;
    }

    const result = await pool.query(queryText, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error searching airports:', err);
    res.status(500).json({ error: err.message });
  }
});

// Search Hotels
router.get('/locations/hotels', async (req: any, res: any) => {
  try {
    const q = req.query.q as string;
    const travelType = req.query.travelType as 'domestic' | 'international';
    const destinationCountry = req.query.destinationCountry as string;

    if (!q || q.length < 2) return res.json([]);

    const prefixParam = `${q}%`;
    const wordParam = `% ${q}%`;
    let queryText = '';
    let params: any[] = [];

    if (travelType === 'domestic') {
      // Domestic is always India, no specific destination country override needed usually, 
      // but logic remains same as before.
      queryText = `
                SELECT city_code as "cityCode", city_name as "cityName", state_id as "stateId", state_name as "stateName", country_id as "countryId", country_name as "countryName"
                FROM hotel_cities
                WHERE country_id = 'IN' 
                AND (
                    city_name ILIKE $1 OR city_name ILIKE $2 OR 
                    city_code ILIKE $1 OR 
                    state_name ILIKE $1 OR state_name ILIKE $2
                )
                ORDER BY 
                    CASE 
                        WHEN city_name ILIKE $1 THEN 1 
                        WHEN city_code ILIKE $1 THEN 2
                        WHEN state_name ILIKE $1 THEN 3
                        ELSE 4 
                    END,
                    city_name ASC
                LIMIT 20
            `;
      params = [prefixParam, wordParam];
    } else {
      // International
      let orderByClause = `
                    CASE 
                        WHEN city_name ILIKE $1 THEN 1 
                        WHEN city_code ILIKE $1 THEN 2
                        WHEN state_name ILIKE $1 THEN 3
                        WHEN country_name ILIKE $1 THEN 4
                        ELSE 5 
                    END
      `;

      // If destination country is provided, we prioritize matches in that country
      // We can add a CASE at the very top of sorting: IF country_name = destCountry THEN 0 ELSE 1
      if (destinationCountry && destinationCountry.trim() !== '') {
        orderByClause = `
            CASE WHEN country_name ILIKE $3 THEN 0 ELSE 1 END,
         ` + orderByClause;
        params = [prefixParam, wordParam, destinationCountry];
      } else {
        params = [prefixParam, wordParam];
      }

      queryText = `
                SELECT city_code as "cityCode", city_name as "cityName", state_id as "stateId", state_name as "stateName", country_id as "countryId", country_name as "countryName"
                FROM hotel_cities
                WHERE (
                    city_name ILIKE $1 OR city_name ILIKE $2 OR 
                    city_code ILIKE $1 OR 
                    state_name ILIKE $1 OR state_name ILIKE $2 OR 
                    country_name ILIKE $1 OR country_name ILIKE $2
                )
                ORDER BY 
                    ${orderByClause},
                    city_name ASC
                LIMIT 20
            `;
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

    const prefixParam = `${q}%`;
    const wordParam = `% ${q}%`;

    const result = await pool.query(`
            SELECT city_code as "cityCode", city_name as "cityName", state_id as "stateId", state_name as "stateName"
            FROM car_cities
            WHERE 
                city_name ILIKE $1 OR city_name ILIKE $2 OR 
                city_code ILIKE $1 OR 
                state_name ILIKE $1 OR state_name ILIKE $2
            ORDER BY 
                CASE 
                    WHEN city_name ILIKE $1 THEN 1 
                    WHEN city_code ILIKE $1 THEN 2
                    WHEN state_name ILIKE $1 THEN 3
                    ELSE 4 
                END,
                city_name ASC
            LIMIT 20
        `, [prefixParam, wordParam]);

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

    const prefixParam = `${q}%`;
    const wordParam = `% ${q}%`;

    // Trains: station_name, station_code, station_city
    // Usually no state in train_stations table schema we built (stnCode, stnName, stnCity)
    const result = await pool.query(`
            SELECT station_code as "stnCode", station_name as "stnName", station_city as "stnCity"
            FROM train_stations
            WHERE 
                station_name ILIKE $1 OR station_name ILIKE $2 OR 
                station_code ILIKE $1 OR 
                station_city ILIKE $1 OR station_city ILIKE $2
            ORDER BY
                CASE
                    WHEN station_name ILIKE $1 THEN 1
                    WHEN station_code ILIKE $1 THEN 2
                    WHEN station_city ILIKE $1 THEN 3
                    ELSE 4
                END,
                station_name ASC
            LIMIT 20
        `, [prefixParam, wordParam]);

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error searching train stations:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
