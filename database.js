require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

async function initDB() {
  // Tabla barricas
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
  `);

  // Tabla acciones (base)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS acciones (
      id SERIAL PRIMARY KEY,
      barrica_id INTEGER REFERENCES barricas(id) ON DELETE CASCADE,
      accion TEXT NOT NULL,
      operario TEXT NOT NULL,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 🔥 MIGRACIONES SEGURAS (NO ROMPEN NADA)
  await pool.query(`ALTER TABLE acciones ADD COLUMN IF NOT EXISTS nave INTEGER;`);
  await pool.query(`ALTER TABLE acciones ADD COLUMN IF NOT EXISTS sala_origen INTEGER;`);
  await pool.query(`ALTER TABLE acciones ADD COLUMN IF NOT EXISTS fila_origen TEXT;`);
  await pool.query(`ALTER TABLE acciones ADD COLUMN IF NOT EXISTS sala_destino INTEGER;`);
  await pool.query(`ALTER TABLE acciones ADD COLUMN IF NOT EXISTS fila_destino TEXT;`);

  console.log('✅ Base de datos inicializada y migrada');
}

initDB().catch(err => {
  console.error('❌ Error inicializando DB', err);
  process.exit(1);
});

module.exports = pool;
