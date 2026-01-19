const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./barricas.db', (err) => {
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
      fila TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.all(`PRAGMA table_info(barricas)`, (err, columns) => {
  if (err) {
    console.error(err);
    return;
  }

  const existeNave = columns.some(col => col.name === 'nave');

  if (!existeNave) {
    db.run(`ALTER TABLE barricas ADD COLUMN nave INTEGER`);
    console.log('Columna nave agregada');
  }
});

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
