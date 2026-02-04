
import pool from './database';

const findUser = async () => {
    try {
        console.log('--- Finding User "Ayush" ---');

        const res = await pool.query("SELECT id, username, userid, role FROM users"); // Get all users
        console.table(res.rows);

        const ayush = res.rows.find(u => u.username.toLowerCase().includes('ayush'));
        if (ayush) {
            console.log(`Found Ayush! ID: ${ayush.userid} (Table ID: ${ayush.id})`);

            // Update the BOOKED trip to belong to Ayush
            console.log(`Assigning BOOKED trip to ${ayush.userid}...`);
            await pool.query("UPDATE trips SET requester_id = $1, requester_name = $2 WHERE status = 'BOOKED'", [ayush.userid, ayush.username]);
            console.log('Update complete.');
        } else {
            console.log('User "Ayush" not found.');
        }

    } catch (error) {
        console.error('Failed:', error);
    } finally {
        await pool.end();
    }
};

findUser();
