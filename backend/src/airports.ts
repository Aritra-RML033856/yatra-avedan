// Airport loader with search capability using Fuse.js

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
  limit = 20,
  destinationCountry?: string
): Promise<Airport[]> {
  const airports = await getAirports(travelType);

  if (!query || query.trim().length === 0) {
    return airports.slice(0, limit);
  }

  // Enforce 2 char limit (consistent with Hotel search)
  if (query.trim().length < 2) {
    return [];
  }


  const q = query.trim().toLowerCase();

  // Custom scoring function to mimic SQL logic
  const score = (airport: Airport): number => {
    let s = 0;
    const nameLow = airport.name.toLowerCase();
    const cityLow = airport.city.toLowerCase();
    const countryLow = airport.country.toLowerCase();
    const iataLow = airport.iata.toLowerCase();

    // 0. Destination Country Check (Highest Priority)
    if (destinationCountry && countryLow === destinationCountry.toLowerCase()) {
      s += 1000;
    }

    // 1. City Name Matches
    if (cityLow.startsWith(q)) s += 500;
    else if (cityLow.includes(` ${q}`)) s += 400;

    // 2. City Code (IATA) Matches
    if (iataLow.startsWith(q)) s += 300;

    // 3. Airport Name Matches
    if (nameLow.startsWith(q)) s += 200;
    else if (nameLow.includes(` ${q}`)) s += 100;

    // 4. Country Name Matches
    if (countryLow.startsWith(q)) s += 50;
    else if (countryLow.includes(` ${q}`)) s += 25;

    // Filter out if no match at all (score is still base ranking from dest country)
    // If destinationCountry is matched (s>=1000), we accept even if no name match?
    // No, user query MUST match something.
    // So distinct check for match:
    const matches =
      cityLow.startsWith(q) || cityLow.includes(` ${q}`) ||
      iataLow.startsWith(q) ||
      nameLow.startsWith(q) || nameLow.includes(` ${q}`) ||
      countryLow.startsWith(q) || countryLow.includes(` ${q}`);

    if (!matches) return -1;
    return s;
  };

  const results = airports
    .map(a => ({ item: a, score: score(a) }))
    .filter(x => x.score > -1)
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);

  return results.slice(0, limit);
}

/**
 * Get airports based on travel type or search
 */
export async function getAirports(
  travelType: 'domestic' | 'international',
  query?: string,
  destinationCountry?: string
): Promise<Airport[]> {
  if (query && query.trim().length > 0) {
    // If there's a search query, use Fuse.js search
    return await searchAirports(query, travelType, 20, destinationCountry);
  } else {
    // Otherwise return all airports
    if (travelType === 'domestic') {
      return await getIndiaAirports();
    } else {
      return await getMinAirports();
    }
  }
}

/**
 * Get unique countries from international airports
 */
export async function getCountries(): Promise<{ name: string, code: string }[]> {
  const airports = await getMinAirports();
  const countries = new Set<string>();
  airports.forEach(a => countries.add(a.country));
  return Array.from(countries).sort().map(c => ({
    name: c,
    code: c.substring(0, 2).toUpperCase() // Simple mock code
  }));
}
