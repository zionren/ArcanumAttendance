const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
const { users, roles } = require('./schema');
const { eq } = require('drizzle-orm');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const url = new URL(DATABASE_URL);
const connectionConfig = {
  host: url.hostname,
  port: parseInt(url.port, 10),
  database: url.pathname.slice(1),
  username: url.username,
  password: url.password,
  ssl: { rejectUnauthorized: false }
};

const client = postgres(connectionConfig);
const db = drizzle(client);

async function createOwner() {
  try {
    console.log('Creating owner account...');
    
    // Get owner role ID
    const ownerRole = await db.select().from(roles).where(eq(roles.roleName, 'owner')).limit(1);
    if (ownerRole.length === 0) {
      throw new Error('Owner role not found');
    }
    
    const hashedPassword = await bcrypt.hash('Zion101%!', 12);
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, 'zionrenn')).limit(1);
    
    if (existingUser.length > 0) {
      // Update existing user
      await db.update(users)
        .set({ 
          passwordHash: hashedPassword,
          roleID: ownerRole[0].id 
        })
        .where(eq(users.username, 'zionrenn'));
      console.log('Updated existing owner account: zionrenn');
    } else {
      // Create new user
      await db.insert(users).values({
        username: 'zionrenn',
        passwordHash: hashedPassword,
        roleID: ownerRole[0].id
      });
      console.log('Created new owner account: zionrenn');
    }
    
    console.log('Owner account setup completed!');
    await client.end();
  } catch (error) {
    console.error('Error creating owner account:', error);
    process.exit(1);
  }
}

createOwner();