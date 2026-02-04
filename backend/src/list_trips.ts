
import pool from './database';

const listAllTrips = async () => {
    try {
        console.log('--- GLOBAL TRIP DATA ---');

        const res = await pool.query(`
      SELECT t.id, t.reference_no, t.status, t.total_cost, t.requester_name, t.requester_id 
      FROM trips t
      ORDER BY t.requester_id
    `);

        console.table(res.rows);

    } catch (error) {
        console.error('List failed:', error);
    } finally {
        await pool.end();
    }
};

listAllTrips();
