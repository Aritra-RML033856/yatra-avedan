// Airport loader with search capability using Fuse.js

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Fuse from 'fuse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Airport {
  name: string;
  city: string;
  country: string;
  iata: string;
}

// Simple caching
let indiaAirports: Airport[] | null = null;
let minAirports: Airport[] | null = null;

/**
 * Get all India airports
 */
export async function getIndiaAirports(): Promise<Airport[]> {
  if (!indiaAirports) {
    const filePath = path.join(__dirname, 'data', 'airports.india.mmt.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    indiaAirports = JSON.parse(raw);
  }
  return indiaAirports!;
}

/**
 * Get all world airports
 */
export async function getMinAirports(): Promise<Airport[]> {
  if (!minAirports) {
    const filePath = path.join(__dirname, 'data', 'airports.min.mmt.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    minAirports = JSON.parse(raw);
  }
  return minAirports!;
}

/**
 * Search airports using Fuse.js
 */
export async function searchAirports(
  query: string,
  travelType: 'domestic' | 'international',
  limit = 100
): Promise<Airport[]> {
  const airports = await getAirports(travelType);

  if (!query || query.trim().length === 0) {
    return airports.slice(0, limit); // Return first N results if no query
  }

  const fuse = new Fuse(airports, {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'city', weight: 0.6 },
      { name: 'country', weight: 0.5 },
      { name: 'iata', weight: 1.0 }
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 1,
  });

  const results = fuse.search(query.trim(), { limit });
  return results.map(result => result.item);
}

/**
 * Get airports based on travel type or search
 */
export async function getAirports(
  travelType: 'domestic' | 'international',
  query?: string
): Promise<Airport[]> {
  if (query && query.trim().length > 0) {
    // If there's a search query, use Fuse.js search
    return await searchAirports(query, travelType);
  } else {
    // Otherwise return all airports
    if (travelType === 'domestic') {
      return await getIndiaAirports();
    } else {
      return await getMinAirports();
    }
  }
}
