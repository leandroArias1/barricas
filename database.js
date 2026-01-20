require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS barricas (
      id SERIAL PRIMARY KEY,
      numero_barrica TEXT NOT NULL,
      lote TEXT NOT NULL,
      sala INTEGER NOT NULL,
      nave INTEGER,
      fila TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS acciones (
      id SERIAL PRIMARY KEY,
      barrica_id INTEGER REFERENCES barricas(id) ON DELETE CASCADE,
      accion TEXT NOT NULL,
      operario TEXT NOT NULL,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Base de datos inicializada");
}

initDB().catch(console.error);

module.exports = pool;
