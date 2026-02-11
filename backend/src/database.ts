import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const createTables = async () => {
  const client = await pool.connect();
  try {
    // NUCLEAR RESET REMOVED: Data persistence enabled.
    // console.log("⚠️  Performing Database Reset (Fresh Start) ⚠️");
    // await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;');

    // 1. Users Table (Unified User Model)
    // - role: 'user', 'travel_admin', 'super_admin'
    // - reporting_manager: relationship, not a role
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        userid VARCHAR(50) UNIQUE NOT NULL, -- e.g. RML...
        email VARCHAR(255) UNIQUE NOT NULL,
        designation VARCHAR(100),
        department VARCHAR(100),
        reporting_manager VARCHAR(255),
        reporting_manager_id VARCHAR(50), -- Links to another userid
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'travel_admin', 'super_admin')),
        encrypted_password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Trips Table
    // - requester_id: formerly employee_id
    // - status: RM_PENDING (not MNG_PENDING)
    await client.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id SERIAL PRIMARY KEY,
        reference_no VARCHAR(50) UNIQUE NOT NULL,
        requester_name VARCHAR(255) NOT NULL,
        requester_id VARCHAR(50) NOT NULL, -- Links to users.userid
        designation VARCHAR(100),
        department VARCHAR(100),
        trip_name VARCHAR(255) NOT NULL,
        travel_type VARCHAR(20) NOT NULL, -- Domestic, International
        destination_country VARCHAR(100),
        visa_required BOOLEAN,
        business_purpose TEXT,
        status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RM_PENDING', 'TRAVEL_ADMIN_PENDING', 'APPROVED', 'SELECT_OPTION', 'OPTION_SELECTED', 'BOOKED', 'REJECTED', 'EDIT', 'CLOSED', 'VISA_PENDING', 'VISA_UPLOADED', 'CANCELLATION_PENDING', 'CANCELLED')),
        option_selected TEXT,
        total_cost INTEGER,
        mmt_payload JSONB, -- Stores MMT Booking Details & Flags { rm_approved: bool, ta_approved: bool, ... }
        cancellation_reason TEXT,
        cancellation_cost INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP,
        booked_at TIMESTAMP,
        closed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_visa_request BOOLEAN DEFAULT FALSE,
        expected_journey_date DATE
      )
    `);

    // 3. Itineraries Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS itineraries (
        id SERIAL PRIMARY KEY,
        trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('flight', 'hotel', 'car', 'train')),
        details JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Approvals Table
    // - approver_role: 'reporting_manager', 'travel_admin'
    await client.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id SERIAL PRIMARY KEY,
        trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
        approver_id INTEGER REFERENCES users(id),
        approver_role VARCHAR(20) NOT NULL, -- 'reporting_manager', 'travel_admin'
        action VARCHAR(10) CHECK (action IN ('accept', 'reject', 'send_back')),
        comments TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. File Uploads Table
    await client.query(`
      create TABLE IF NOT EXISTS file_uploads (
        id SERIAL PRIMARY KEY,
        trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
        uploaded_by INTEGER REFERENCES users(id),
        file_type VARCHAR(20) NOT NULL, -- 'visa', 'passport', 'ticket', 'receipts', 'travel_options'
        filename VARCHAR(255) NOT NULL,
        filepath TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Hotel Cities Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hotel_cities (
        id SERIAL PRIMARY KEY,
        city_code VARCHAR(50) NOT NULL,
        city_name VARCHAR(255) NOT NULL,
        state_id VARCHAR(50),
        state_name VARCHAR(255),
        country_id VARCHAR(50),
        country_name VARCHAR(255)
      )
    `);

    // 7. Car Cities Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS car_cities (
        id SERIAL PRIMARY KEY,
        city_code VARCHAR(50) NOT NULL,
        city_name VARCHAR(255) NOT NULL,
        state_id VARCHAR(50),
        state_name VARCHAR(255)
      )
    `);

    // 8. Train Stations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS train_stations (
        id SERIAL PRIMARY KEY,
        station_code VARCHAR(50) NOT NULL,
        station_name VARCHAR(255) NOT NULL,
        station_city VARCHAR(255)
      )
    `);

    // 9. Airports Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS airports (
        id SERIAL PRIMARY KEY,
        iata_code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(255),
        country VARCHAR(255) NOT NULL
      )
    `);

    // 10. Refresh Tokens Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Database Schema Created (Fresh Start)");
    console.log("✅ Database Schema Created (Fresh Start)");

  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
};

export const seedData = async () => {
  // 1. Super Admin
  const hashedPassword = await bcrypt.hash('Rashmi@123', 10);
  const superAdminQuery = `
    INSERT INTO users (username, userid, email, designation, department, reporting_manager, reporting_manager_id, role, encrypted_password)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (userid) DO NOTHING
  `;
  await pool.query(superAdminQuery, [
    'Aritra Bag', 'RML033856', 'aritra.bag@rashmigroup.com',
    'BOSS', 'Travel', null, null, 'super_admin', hashedPassword
  ]);

  // 2. Travel Admin
  const taPass = await bcrypt.hash('TempPass123', 10);
  await pool.query(superAdminQuery, [
    'John TravelAdmin', 'TA001', 'travel.admin@company.com',
    'Travel Coordinator', 'Travel', 'Aritra Bag', 'RML033856', 'travel_admin', taPass
  ]);

  // 3. Reporting Manager (User who is an RM)
  const rmPass = await bcrypt.hash('TempPass123', 10);
  await pool.query(superAdminQuery, [
    'Sarah RM', 'RM001', 'sarah.rm@company.com',
    'IT Lead', 'Information Technology', 'Aritra Bag', 'RML033856', 'user', rmPass
  ]);

  // 4. Standard User (Requester)
  const userPass = await bcrypt.hash('TempPass123', 10);
  await pool.query(superAdminQuery, [
    'Jane User', 'USR001', 'jane.user@company.com',
    'Software Engineer', 'Information Technology', 'Sarah RM', 'RM001', 'user', userPass
  ]);

  console.log("✅ Seed Data Inserted (Fresh Start)");
};

export default pool;
