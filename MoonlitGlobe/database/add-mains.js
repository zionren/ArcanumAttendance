const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { mains } = require('./schema');

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
  database: url.pathname.slice(1),
  username: url.username,
  password: url.password,
  ssl: { rejectUnauthorized: false }
};

const client = postgres(connectionConfig);
const db = drizzle(client);

async function addMainEvents() {
  try {
    console.log('Adding main events...');
    
    const mainEvents = [
      { name: 'Dragon Hunt', description: 'Weekly dragon hunting expedition' },
      { name: 'Castle Defense', description: 'Defend the academy castle from invaders' },
      { name: 'Potion Brewing', description: 'Advanced potion crafting session' },
      { name: 'Combat Training', description: 'Sword and magic combat practice' },
      { name: 'Treasure Quest', description: 'Search for ancient magical artifacts' },
      { name: 'Study Hall', description: 'Group study session for magical theory' },
      { name: 'Guild Meeting', description: 'Monthly guild planning and strategy meeting' }
    ];
    
    for (const mainEvent of mainEvents) {
      try {
        await db.insert(mains).values(mainEvent);
        console.log(`Added main event: ${mainEvent.name}`);
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`Main event already exists: ${mainEvent.name}`);
        } else {
          console.error(`Error adding ${mainEvent.name}:`, error.message);
        }
      }
    }
    
    console.log('Main events setup completed!');
    await client.end();
  } catch (error) {
    console.error('Error adding main events:', error);
    process.exit(1);
  }
}

addMainEvents();