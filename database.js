const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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

  console.log("✅ Postgres inicializado");
}

initDB().catch(console.error);

module.exports = pool;
