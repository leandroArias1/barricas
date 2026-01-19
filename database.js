const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Crear carpeta db si no existe
const dbPath = path.join(__dirname, 'db');

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath);
  console.log('Carpeta DB creada');
}

const db = new sqlite3.Database(path.join(dbPath, 'barricas.db'), (err) => {
  if (err) {
    console.error('Error al abrir la base de datos', err);
  } else {
    console.log('Base de datos SQLite conectada');
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
