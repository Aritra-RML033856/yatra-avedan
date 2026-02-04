
import pool from './database';

const diagnoseSpend = async () => {
    try {
        console.log('--- Diagnosing Total Spend ---');

        // Get a user to test with
        const userWithTrips = await pool.query("SELECT requester_id FROM trips LIMIT 1");
        if (userWithTrips.rows.length === 0) {
            console.log('No trips found in database at all.');
            return;
        }
        const userId = userWithTrips.rows[0].requester_id;
        console.log(`Analyzing trips for user: ${userId}`);

        // Test Specific Query - Total Spend (All Time)
        const spendQuery = `
      SELECT SUM(total_cost) as total 
      FROM trips 
      WHERE requester_id = $1
        AND status = 'BOOKED' 
    `;

        const res = await pool.query(spendQuery, [userId]);
        console.log('Query Result:', res.rows[0]);

    } catch (error) {
        console.error('Diagnosis failed:', error);
    } finally {
        await pool.end();
    }
};

diagnoseSpend();
