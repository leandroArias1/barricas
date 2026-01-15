const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./barricas.db', (err) => {
  if (err) {
    console.error('Error al abrir la base de datos', err);
  } else {
    console.log('Base de datos SQLite conectada');
  }
  db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS barricas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_barrica TEXT,
      numero_lote TEXT,
      fila TEXT,
      uva TEXT,
      anio TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS acciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barrica_id INTEGER,
      accion TEXT,
      operario TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (barrica_id) REFERENCES barricas(id)
    )
  `);
});

});

module.exports = db;
