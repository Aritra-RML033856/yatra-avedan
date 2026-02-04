
import { createTables, seedData } from './database.js';

const reset = async () => {
    try {
        console.log("Starting Database Reset...");
        await createTables();
        await seedData();
        console.log("Database Reset Complete.");
        process.exit(0);
    } catch (error) {
        console.error("Database Reset Failed:", error);
        process.exit(1);
    }
};

reset();
