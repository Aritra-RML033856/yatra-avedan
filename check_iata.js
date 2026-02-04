
const fs = require('fs');
const path = require('path');

const indiaPath = path.join('backend', 'src', 'data', 'airports.india.json');
const minPath = path.join('backend', 'src', 'data', 'airports.min.json');

function checkUnique(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }
    console.log(`Checking ${filePath}...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const iataMap = new Map();
    let duplicates = 0;
    
    data.forEach((airport, index) => {
        if (!airport.iata) {
           // console.warn(`Airport at index ${index} has no IATA: ${airport.name}`);
            return;
        }
        if (iataMap.has(airport.iata)) {
            duplicates++;
            console.log(`Duplicate IATA found: ${airport.iata}`);
            console.log(`  1: ${JSON.stringify(iataMap.get(airport.iata))}`);
            console.log(`  2: ${JSON.stringify(airport)}`);
        } else {
            iataMap.set(airport.iata, airport);
        }
    });
    
    console.log(`Found ${duplicates} duplicates in ${data.length} records.`);
}

checkUnique(indiaPath);
checkUnique(minPath);
