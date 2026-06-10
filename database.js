// database.js - PostgreSQL for Render (with table drop)
const { Pool } = require('pg');

let pool;

// Initialize database connection
const initDB = async () => {
  try {
    // For Render PostgreSQL
    if (process.env.DATABASE_URL) {
      console.log('🔌 Connecting to Render PostgreSQL...');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 10
      });
    } else {
      console.log('🔌 Using local PostgreSQL...');
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'lcmtv_db',
        port: 5432
      });
    }

    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    
    // Drop existing tables if they exist (to avoid syntax conflicts)
    console.log('🗑️  Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS chat_messages CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅ Old tables dropped');
    
    // Create users table - SIMPLIFIED VERSION
    console.log('📝 Creating users table...');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        country VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        pin VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');
    
    // Create chat messages table - SIMPLIFIED VERSION
    console.log('📝 Creating chat_messages table...');
    await client.query(`
      CREATE TABLE chat_messages (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Chat messages table created');
    
    client.release();
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

// Get database pool
const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initDB first.');
  }
  return pool;
};

// Save chat message
const saveChatMessage = async (userName, message) => {
  try {
    const client = await pool.connect();
    await client.query(
      'INSERT INTO chat_messages (user_name, message) VALUES ($1, $2)',
      [userName, message]
    );
    client.release();
    console.log(`💾 Chat message saved: ${userName}`);
  } catch (error) {
    console.error('Error saving chat message:', error);
  }
};

module.exports = { initDB, getPool, saveChatMessage };