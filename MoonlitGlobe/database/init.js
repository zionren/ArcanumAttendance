const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
const { sql } = require('drizzle-orm');
const { roles, users, mains } = require('./schema');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Parse connection string manually to handle special characters
const url = new URL(DATABASE_URL);
const connectionConfig = {
  host: url.hostname,
  port: parseInt(url.port, 10),
  database: url.pathname.slice(1), // Remove leading slash
  username: url.username,
  password: url.password,
  ssl: { rejectUnauthorized: false }
};

const client = postgres(connectionConfig);
const db = drizzle(client);

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        role_id INTEGER NOT NULL REFERENCES roles(id)
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mains (
        main_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS handler_main_assignments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        main_id INTEGER NOT NULL REFERENCES mains(main_id),
        UNIQUE(user_id, main_id)
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS attendance_records (
        attendance_id SERIAL PRIMARY KEY,
        created_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
        main_id INTEGER NOT NULL REFERENCES mains(main_id),
        date_and_time TIMESTAMP DEFAULT NOW() NOT NULL,
        status VARCHAR(20) DEFAULT 'present' NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS member_attendances (
        id SERIAL PRIMARY KEY,
        main_id INTEGER NOT NULL REFERENCES mains(main_id),
        date TIMESTAMP DEFAULT NOW() NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        member_code VARCHAR(50)
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS logout_records (
        logout_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        position VARCHAR(100) NOT NULL,
        date_time TIMESTAMP NOT NULL,
        attendees_count INTEGER DEFAULT 0,
        dropped_links INTEGER DEFAULT 0,
        recruits INTEGER DEFAULT 0,
        nicknames_set INTEGER DEFAULT 0,
        game_handled INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Insert default roles
    try {
      await db.insert(roles).values([
        { roleName: 'owner' },
        { roleName: 'elder' },
        { roleName: 'moderator' },
        { roleName: 'handler' }
      ]).onConflictDoNothing();
    } catch (error) {
      console.log('Roles already exist, skipping...');
    }

    // Create default owner account
    const hashedPassword = await bcrypt.hash('Zion101%!', 10);
    const ownerRole = await db.select().from(roles).where(sql`role_name = 'owner'`).limit(1);
    
    if (ownerRole.length > 0) {
      try {
        await db.insert(users).values({
          username: 'zionrenn',
          passwordHash: hashedPassword,
          email: 'zionrenn@rphood.com',
          roleID: ownerRole[0].id
        }).onConflictDoNothing();
        console.log('Default owner account created: zionrenn');
      } catch (error) {
        console.log('Owner account already exists, skipping...');
      }
    }

    // Insert sample mains
    try {
      await db.insert(mains).values([
        { name: 'Main Event Alpha', description: 'Primary gaming session for advanced players' },
        { name: 'Main Event Beta', description: 'Secondary gaming session for intermediate players' },
        { name: 'Training Session', description: 'Practice and training for new members' }
      ]).onConflictDoNothing();
    } catch (error) {
      console.log('Mains already exist, skipping...');
    }

    console.log('Database initialized successfully!');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await client.end();
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
