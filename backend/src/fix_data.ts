
import pool from './database';

const fixData = async () => {
    try {
        console.log('--- Fixing Missing Cost Data ---');

        // Check current state
        const before = await pool.query("SELECT id, reference_no, status, total_cost FROM trips WHERE status = 'BOOKED'");
        console.table(before.rows);

        // Update missing costs
        console.log('Updating NULL costs to 5000...');
        const updateRes = await pool.query("UPDATE trips SET total_cost = 5000 WHERE status = 'BOOKED' AND total_cost IS NULL");
        console.log(`Updated ${updateRes.rowCount} rows.`);

        // Verify
        const after = await pool.query("SELECT id, reference_no, status, total_cost FROM trips WHERE status = 'BOOKED'");
        console.table(after.rows);

    } catch (error) {
        console.error('Fix failed:', error);
    } finally {
        await pool.end();
    }
};

fixData();
