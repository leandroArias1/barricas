const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 👇 Ruta dinámica según entorno
const dbPath = process.env.RENDER
  ? '/var/data/barricas.db'
  : path.join(__dirname, 'barricas.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos', err);
  } else {
    console.log('SQLite conectada en:', dbPath);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS barricas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_barrica TEXT NOT NULL,
      lote TEXT NOT NULL,
      sala INTEGER NOT NULL,
      nave INTEGER,
      fila TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS acciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barrica_id INTEGER NOT NULL,
      accion TEXT NOT NULL,
      operario TEXT NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (barrica_id) REFERENCES barricas(id)
    )
  `);
});

module.exports = db;
