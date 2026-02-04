
import { getIndiaAirports, getMinAirports, searchAirports } from './backend/src/airports.js';

async function verify() {
    try {
        console.log('Loading India airports...');
        const india = await getIndiaAirports();
        console.log(`Loaded ${india.length} India airports.`);
        console.log('Sample India:', india[0]);

        console.log('Loading World airports...');
        const world = await getMinAirports();
        console.log(`Loaded ${world.length} World airports.`);
        console.log('Sample World:', world[0]);

        console.log('Searching "Delhi"...');
        const results = await searchAirports('Delhi', 'domestic');
        console.log(`Found ${results.length} results.`);
        console.log('First result:', results[0]);

        if (results.length > 0 && results[0].iata === 'DEL') {
            console.log('SUCCESS: Search works!');
        } else {
            console.error('FAILURE: Search did not return expected result.');
        }

    } catch (err) {
        console.error('ERROR:', err);
    }
}

verify();
